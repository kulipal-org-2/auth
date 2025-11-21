import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { BusinessProfile, BusinessVerification, User } from 'src/database/entities';
import { SmileIdentityService } from './smile-identity.service';
import type {
  InitiateVerificationRequest,
  InitiateVerificationResponse,
  SubmitVerificationRequest,
  SubmitVerificationResponse,
  GetVerificationStatusRequest,
  GetVerificationStatusResponse,
  AdminReviewVerificationRequest,
  AdminReviewVerificationResponse,
} from '../types/business-verification.type';
import { randomUUID } from 'crypto';

@Injectable()
export class BusinessVerificationService {
  private readonly logger = new Logger(BusinessVerificationService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly smileIdentityService: SmileIdentityService,
  ) {}

  @CreateRequestContext()
  async initiateVerification(
    userId: string,
    data: InitiateVerificationRequest,
  ): Promise<InitiateVerificationResponse> {
    this.logger.log(`Initiating verification for business: ${data.businessProfileId}`);

    try {
      const businessProfile = await this.em.findOne(
        BusinessProfile,
        { id: data.businessProfileId },
        { populate: ['user'] }
      );

      if (!businessProfile) {
        return {
          message: 'Business profile not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          token: null,
          jobId: null,
        };
      }

      if (businessProfile.user.id !== userId) {
        return {
          message: 'Unauthorized',
          statusCode: HttpStatus.FORBIDDEN,
          success: false,
          token: null,
          jobId: null,
        };
      }

      const jobId = `job_${randomUUID()}`;
      const smileUserId = `user_${userId}_${businessProfile.id}`;

      const token = await this.smileIdentityService.generateWebToken(smileUserId, jobId);

      const verification = this.em.create(BusinessVerification, {
        businessProfile: businessProfile,
        verificationType: 'third_party',
        status: 'pending',
        smileJobId: jobId,
        smileUserId: smileUserId,
      });

      await this.em.persistAndFlush(verification);

      return {
        message: 'Verification initiated successfully',
        statusCode: HttpStatus.OK,
        success: true,
        token: token,
        jobId: jobId,
      };
    } catch (error: any) {
      this.logger.error(`Error initiating verification: ${error.message}`, error.stack);
      return {
        message: 'Failed to initiate verification',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        token: null,
        jobId: null,
      };
    }
  }

  @CreateRequestContext()
  async submitVerification(
    userId: string,
    data: SubmitVerificationRequest,
  ): Promise<SubmitVerificationResponse> {
    this.logger.log(`Submitting verification for business: ${data.businessProfileId}`);

    try {
      const businessProfile = await this.em.findOne(
        BusinessProfile,
        { id: data.businessProfileId },
        { populate: ['user'] }
      );

      if (!businessProfile) {
        return {
          message: 'Business profile not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          verificationId: null,
        };
      }

      if (businessProfile.user.id !== userId) {
        return {
          message: 'Unauthorized',
          statusCode: HttpStatus.FORBIDDEN,
          success: false,
          verificationId: null,
        };
      }

      const user = businessProfile.user;
      const jobId = `job_${randomUUID()}`;
      const smileUserId = `user_${userId}_${businessProfile.id}`;

    const smileResult = await this.smileIdentityService.submitDocumentVerification({
        smileUserId: smileUserId,
        jobId: jobId,
        firstName: user.firstName,
        lastName: user.lastName,
        idType: data.idType, 
        idNumber: data.idNumber, 
        dob: data.dob, 
        selfieImageUrl: data.selfieImageUrl,
        documentImageUrl: data.documentImageUrl,
      });
      const verification = this.em.create(BusinessVerification, {
        businessProfile: businessProfile,
        verificationType: 'third_party',
        status: smileResult.success ? 'approved' : 'rejected',
        selfieImageUrl: data.selfieImageUrl,
        documentImageUrl: data.documentImageUrl,
        smileJobId: smileResult.smileJobId,
        smileUserId: smileUserId,
        smileResponse: smileResult.fullResponse,
        smileResultCode: smileResult.resultCode,
        smileResultText: smileResult.resultText,
      });

      await this.em.persistAndFlush(verification);

      if (smileResult.success) {
        businessProfile.isThirdPartyVerified = true;
        
        if (smileResult.fullName) {
          businessProfile.businessName = smileResult.fullName;
        }
        
        await this.em.flush();
      }

      return {
        message: smileResult.success
          ? 'Verification successful'
          : `Verification failed: ${smileResult.resultText}`,
        statusCode: smileResult.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
        success: smileResult.success,
        verificationId: verification.id,
      };
    } catch (error: any) {
      this.logger.error(`Error submitting verification: ${error.message}`, error.stack);
      return {
        message: 'Failed to submit verification',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        verificationId: null,
      };
    }
  }

  @CreateRequestContext()
  async getVerificationStatus(
    userId: string,
    data: GetVerificationStatusRequest,
  ): Promise<GetVerificationStatusResponse> {
    try {
      const businessProfile = await this.em.findOne(
        BusinessProfile,
        { id: data.businessProfileId },
        { populate: ['user', 'verifications'] }
      );

      if (!businessProfile) {
        return {
          message: 'Business profile not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          isThirdPartyVerified: false,
          isKycVerified: false,
          verifications: [],
        };
      }

      if (businessProfile.user.id !== userId) {
        return {
          message: 'Unauthorized',
          statusCode: HttpStatus.FORBIDDEN,
          success: false,
          isThirdPartyVerified: false,
          isKycVerified: false,
          verifications: [],
        };
      }

      const verifications = businessProfile.verifications.getItems().map((v) => ({
        id: v.id,
        verificationType: v.verificationType,
        status: v.status,
        smileResultText: v.smileResultText,
        reviewNotes: v.reviewNotes,
        rejectionReason: v.rejectionReason,
        createdAt: v.createdAt,
        reviewedAt: v.reviewedAt,
      }));

      return {
        message: 'Verification status retrieved successfully',
        statusCode: HttpStatus.OK,
        success: true,
        isThirdPartyVerified: businessProfile.isThirdPartyVerified ?? false,
        isKycVerified: businessProfile.isKycVerified ?? false,
        verifications: verifications,
      };
    } catch (error: any) {
      this.logger.error(`Error getting verification status: ${error.message}`, error.stack);
      return {
        message: 'Failed to get verification status',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        isThirdPartyVerified: false,
        isKycVerified: false,
        verifications: [],
      };
    }
  }

  @CreateRequestContext()
  async adminReviewVerification(
    adminUserId: string,
    data: AdminReviewVerificationRequest,
  ): Promise<AdminReviewVerificationResponse> {
    this.logger.log(`Admin reviewing verification: ${data.verificationId}`);

    try {
      const verification = await this.em.findOne(
        BusinessVerification,
        { id: data.verificationId },
        { populate: ['businessProfile'] }
      );

      if (!verification) {
        return {
          message: 'Verification not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
        };
      }

      verification.status = data.approved ? 'approved' : 'rejected';
      verification.reviewedBy = adminUserId;
      verification.reviewedAt = new Date();
      verification.reviewNotes = data.reviewNotes;

      if (!data.approved && data.rejectionReason) {
        verification.rejectionReason = data.rejectionReason;
      }

      if (verification.verificationType === 'third_party' && data.approved) {
        const kycVerification = this.em.create(BusinessVerification, {
          businessProfile: verification.businessProfile,
          verificationType: 'kyc_admin',
          status: 'approved',
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          reviewNotes: data.reviewNotes,
        });
        await this.em.persist(kycVerification);

        verification.businessProfile.isKycVerified = true;
      } else if (!data.approved) {
        verification.businessProfile.isKycVerified = false;
      }

      await this.em.flush();

      return {
        message: data.approved
          ? 'Verification approved successfully'
          : 'Verification rejected',
        statusCode: HttpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      this.logger.error(`Error reviewing verification: ${error.message}`, error.stack);
      return {
        message: 'Failed to review verification',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
      };
    }
  }
}
