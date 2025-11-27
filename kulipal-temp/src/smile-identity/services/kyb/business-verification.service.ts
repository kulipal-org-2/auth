import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { KybService } from './kyb.service';
import { User, BusinessProfile, BusinessVerification } from '../../../database/entities';
import { randomUUID } from 'crypto';
import { BusinessType, BusinessVerificationResultDto, InitiateBusinessVerificationDto } from 'src/smile-identity/types/smile-identity.types';

@Injectable()
export class BusinessVerificationService {
  private readonly logger = new Logger(BusinessVerificationService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly kybService: KybService,
  ) {}

  async initiateBusinessVerification(
    userId: string,
    dto: InitiateBusinessVerificationDto,
  ): Promise<BusinessVerificationResultDto> {
    this.logger.log(`Initiating business verification for user: ${userId}`);

    // Validate user exists and is a vendor
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.userType !== 'vendor') {
      throw new BadRequestException('Only vendors can verify businesses');
    }

    // Validate business profile exists
    const businessProfile = await this.em.findOne(BusinessProfile, { 
      id: dto.businessProfileId,
      user: { id: userId } 
    });

    if (!businessProfile) {
      throw new BadRequestException('Business profile not found');
    }

    const jobId = `biz_${randomUUID()}`;

    try {
      let verificationResult;
      
      if (dto.verificationType === 'business_registration') {
        verificationResult = await this.kybService.verifyBusiness(
          {
            registrationNumber: dto.registrationNumber,
            businessType: dto.businessType as BusinessType,
            businessName: businessProfile.businessName,
          },
          userId,
          jobId,
        );
      } else if (dto.verificationType === 'tax_information') {
        verificationResult = await this.kybService.verifyTaxInformation(
          dto.registrationNumber,
          userId,
          jobId,
        );
      } else {
        throw new BadRequestException('Invalid verification type');
      }

      // Save verification result
      const verificationRecord = this.em.create(BusinessVerification, {
        businessProfile,
        verificationType: 'third_party',
        status: verificationResult.success ? 'approved' : 'rejected',
        smileJobId: verificationResult.smileJobId,
        smileUserId: userId,
        smileResponse: verificationResult,
        smileResultCode: verificationResult.resultCode,
        smileResultText: verificationResult.message,
      });

      await this.em.persistAndFlush(verificationRecord);

      // Update business profile if verification successful
      if (verificationResult.success) {
        businessProfile.isThirdPartyVerified = true;
        if (verificationResult.companyInformation?.legal_name) {
          businessProfile.businessName = verificationResult.companyInformation.legal_name;
        }
        await this.em.flush();
      }

      return {
        success: verificationResult.success,
        message: verificationResult.message,
        smileJobId: verificationResult.smileJobId,
        resultCode: verificationResult.resultCode,
        companyInformation: verificationResult.companyInformation,
        timestamp: verificationResult.timestamp,
      };

    } catch (error: unknown) {
      // Proper error handling for unknown type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during business verification';
      const stack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(`Business verification failed: ${errorMessage}`, stack);
      
      // Save failed verification attempt
      const failedVerification = this.em.create(BusinessVerification, {
        businessProfile: businessProfile!,
        verificationType: 'third_party',
        status: 'rejected',
        smileJobId: jobId,
        smileUserId: userId,
        smileResultText: errorMessage,
      });

      await this.em.persistAndFlush(failedVerification);
      throw new BadRequestException(errorMessage);
    }
  }

  async getVerificationStatus(businessProfileId: string, userId: string) {
    // Fixed: Remove duplicate businessProfile property
    const verifications = await this.em.find(
      BusinessVerification,
      { 
        businessProfile: { 
          id: businessProfileId,
          user: { id: userId } 
        }
      },
      { orderBy: { createdAt: 'DESC' } }
    );

    return {
      isThirdPartyVerified: verifications.some(v => v.status === 'approved'),
      verifications: verifications.map(v => ({
        id: v.id,
        verificationType: v.verificationType,
        status: v.status,
        smileResultText: v.smileResultText,
        createdAt: v.createdAt,
        reviewedAt: v.reviewedAt,
      })),
    };
  }
}