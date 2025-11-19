import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { VendorProfile, VendorVerification, User } from 'src/database/entities';
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
} from '../types/vendor-verification.type';
import { randomUUID } from 'crypto';

@Injectable()
export class VendorVerificationService {
  private readonly logger = new Logger(VendorVerificationService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly smileIdentityService: SmileIdentityService,
  ) {}

  /**
   * Initiate verification process - Generate web token for hosted integration
   */
  @CreateRequestContext()
  async initiateVerification(
    data: InitiateVerificationRequest,
  ): Promise<InitiateVerificationResponse> {
    this.logger.log(`Initiating verification for user: ${data.userId}`);

    try {
      const user = await this.em.findOne(User, { id: data.userId });
      if (!user || user.userType !== 'vendor') {
        return {
          message: 'User not found or not a vendor',
          statusCode: 404,
          success: false,
          token: null,
          jobId: null,
        };
      }

      const vendorProfile = await this.em.findOne(VendorProfile, {
        userId: data.userId,
      });

      if (!vendorProfile) {
        return {
          message: 'Vendor profile not found',
          statusCode: 404,
          success: false,
          token: null,
          jobId: null,
        };
      }

      // Generate unique job ID
      const jobId = `job_${randomUUID()}`;
      const smileUserId = `user_${data.userId}`;

      // Generate web token for hosted integration
      const token = await this.smileIdentityService.generateWebToken(
        smileUserId,
        jobId,
        'doc_verification',
      );

      // Create pending verification record
      const verification = this.em.create(VendorVerification, {
        vendorProfile: vendorProfile,
        verificationType: 'third_party',
        status: 'pending',
        smileJobId: jobId,
        smileUserId: smileUserId,
      });

      await this.em.persistAndFlush(verification);

      return {
        message: 'Verification initiated successfully',
        statusCode: 200,
        success: true,
        token: token,
        jobId: jobId,
      };
    } catch (error: any) {
      this.logger.error(`Error initiating verification: ${error.message}`, error.stack);
      return {
        message: 'Failed to initiate verification',
        statusCode: 500,
        success: false,
        token: null,
        jobId: null,
      };
    }
  }

  /**
   * Submit verification with documents (Server-to-server integration)
   */
  @CreateRequestContext()
  async submitVerification(
    data: SubmitVerificationRequest,
  ): Promise<SubmitVerificationResponse> {
    this.logger.log(`Submitting verification for user: ${data.userId}`);

    try {
      const user = await this.em.findOne(User, { id: data.userId });
      if (!user || user.userType !== 'vendor') {
        return {
          message: 'User not found or not a vendor',
          statusCode: 404,
          success: false,
          verificationId: null,
        };
      }

      const vendorProfile = await this.em.findOne(VendorProfile, {
        userId: data.userId,
      });

      if (!vendorProfile) {
        return {
          message: 'Vendor profile not found',
          statusCode: 404,
          success: false,
          verificationId: null,
        };
      }

      // Generate unique IDs
      const jobId = `job_${randomUUID()}`;
      const smileUserId = `user_${data.userId}`;

      // Submit to Smile Identity
      const smileResult = await this.smileIdentityService.submitDocumentVerification({
        userId: smileUserId,
        jobId: jobId,
        idType: data.documentType,
        idNumber: data.documentNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        dob: data.dateOfBirth,
        selfieImageBase64: data.selfieImageBase64,
        documentImageBase64: data.documentImageBase64,
      });

      // Create verification record
      const verification = this.em.create(VendorVerification, {
        vendorProfile: vendorProfile,
        verificationType: 'third_party',
        status: smileResult.success ? 'approved' : 'rejected',
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        selfieImageUrl: data.selfieImageUrl,
        documentImageUrl: data.documentImageUrl,
        smileJobId: smileResult.smileJobId,
        smileUserId: smileUserId,
        smileResponse: smileResult.fullResponse,
        smileResultCode: smileResult.resultCode,
        smileResultText: smileResult.resultText,
      });

      await this.em.persistAndFlush(verification);

      // Update vendor profile if verified
      if (smileResult.success) {
        vendorProfile.isThirdPartyVerified = true;
        await this.em.flush();
      }

      return {
        message: smileResult.success
          ? 'Verification successful'
          : `Verification failed: ${smileResult.resultText}`,
        statusCode: smileResult.success ? 200 : 400,
        success: smileResult.success,
        verificationId: verification.id,
      };
    } catch (error: any) {
      this.logger.error(`Error submitting verification: ${error.message}`, error.stack);
      return {
        message: 'Failed to submit verification',
        statusCode: 500,
        success: false,
        verificationId: null,
      };
    }
  }

  /**
   * Get verification status
   */
  @CreateRequestContext()
  async getVerificationStatus(
    data: GetVerificationStatusRequest,
  ): Promise<GetVerificationStatusResponse> {
    try {
      const vendorProfile = await this.em.findOne(
        VendorProfile,
        { userId: data.userId },
        { populate: ['verifications'] },
      );

      if (!vendorProfile) {
        return {
          message: 'Vendor profile not found',
          statusCode: 404,
          success: false,
          isThirdPartyVerified: false,
          isKycVerified: false,
          verifications: [],
        };
      }

      const verifications = vendorProfile.verifications.getItems().map((v) => ({
        id: v.id,
        verificationType: v.verificationType,
        status: v.status,
        documentType: v.documentType,
        smileResultText: v.smileResultText,
        reviewNotes: v.reviewNotes,
        rejectionReason: v.rejectionReason,
        createdAt: v.createdAt,
        reviewedAt: v.reviewedAt,
      }));

      return {
        message: 'Verification status retrieved successfully',
        statusCode: 200,
        success: true,
        isThirdPartyVerified: Boolean(vendorProfile.isThirdPartyVerified),
        isKycVerified: Boolean(vendorProfile.isKycVerified),
        verifications: verifications,
      };
    } catch (error: any) {
      this.logger.error(`Error getting verification status: ${error.message}`, error.stack);
      return {
        message: 'Failed to get verification status',
        statusCode: 500,
        success: false,
        isThirdPartyVerified: false,
        isKycVerified: false,
        verifications: [],
      };
    }
  }

  /**
   * Admin review verification (Manual KYC approval/rejection)
   */
  @CreateRequestContext()
  async adminReviewVerification(
    data: AdminReviewVerificationRequest,
  ): Promise<AdminReviewVerificationResponse> {
    this.logger.log(`Admin reviewing verification: ${data.verificationId}`);

    try {
      const verification = await this.em.findOne(
        VendorVerification,
        { id: data.verificationId },
        { populate: ['vendorProfile'] },
      );

      if (!verification) {
        return {
          message: 'Verification not found',
          statusCode: 404,
          success: false,
        };
      }

      // Update verification status
      verification.status = data.approved ? 'approved' : 'rejected';
      verification.reviewedBy = data.adminUserId;
      verification.reviewedAt = new Date();
      verification.reviewNotes = data.reviewNotes;
      
      if (!data.approved && data.rejectionReason) {
        verification.rejectionReason = data.rejectionReason;
      }

      // If this is KYC admin verification
      if (verification.verificationType === 'third_party' && data.approved) {
        // Create a KYC admin verification record
        const kycVerification = this.em.create(VendorVerification, {
          vendorProfile: verification.vendorProfile,
          verificationType: 'kyc_admin',
          status: 'approved',
          reviewedBy: data.adminUserId,
          reviewedAt: new Date(),
          reviewNotes: data.reviewNotes,
        });
        await this.em.persist(kycVerification);

        // Update vendor profile
        verification.vendorProfile.isKycVerified = true;
      } else if (!data.approved) {
        // If rejected, mark as not KYC verified
        verification.vendorProfile.isKycVerified = false;
      }

      await this.em.flush();

      return {
        message: data.approved
          ? 'Verification approved successfully'
          : 'Verification rejected',
        statusCode: 200,
        success: true,
      };
    } catch (error: any) {
      this.logger.error(`Error reviewing verification: ${error.message}`, error.stack);
      return {
        message: 'Failed to review verification',
        statusCode: 500,
        success: false,
      };
    }
  }
}