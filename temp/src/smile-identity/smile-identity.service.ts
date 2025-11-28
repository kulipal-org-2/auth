// smile-identity/services/smile-identity.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { BusinessVerificationService } from './services/kyb/business-verification.service';
import { BusinessProfile } from 'src/database/entities/business-profile.entity';
import { User } from 'src/database';

@Injectable()
export class SmileIdentityService {
  private readonly logger = new Logger(SmileIdentityService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly businessVerificationService: BusinessVerificationService,
  ) {}

  // Business verification methods using BusinessVerification entity
  async verifyBusinessRegistration(
    userId: string, 
    registrationNumber: string, 
    businessType: string, 
    businessProfileId: string
  ) {
    await this.validateUserAndBusinessProfile(userId, businessProfileId);
    
    const result = await this.businessVerificationService.initiateBusinessVerification(
      userId,
      {
        businessProfileId,
        registrationNumber,
        verificationType: 'business_registration',
        businessType: businessType as any,
      }
    );

    return this.validateBusinessVerificationResult(result, userId);
  }

  async verifyTaxInformation(
    userId: string, 
    taxNumber: string,
    businessProfileId: string
  ) {
    await this.validateUserAndBusinessProfile(userId, businessProfileId);
    
    const result = await this.businessVerificationService.initiateBusinessVerification(
      userId,
      {
        businessProfileId,
        registrationNumber: taxNumber,
        verificationType: 'tax_information',
      }
    );

    return this.validateBusinessVerificationResult(result, userId);
  }

  // Helper methods
  private async validateUserAndBusinessProfile(userId: string, businessProfileId: string) {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.userType !== 'vendor') {
      throw new BadRequestException('Only vendors can verify businesses');
    }

    const businessProfile = await this.em.findOne(BusinessProfile, { 
      id: businessProfileId,
      user: { id: userId } 
    });

    if (!businessProfile) {
      throw new BadRequestException('Business profile not found');
    }

    return { user, businessProfile };
  }

  private async validateBusinessVerificationResult(result: any, userId: string) {
    if (result.success) {
      this.logger.log(`Business verification successful for user: ${userId}`);
      return {
        success: true,
        message: result.message,
        data: result
      };
    } else {
      this.logger.warn(`Business verification failed for user: ${userId}`);
      return {
        success: false,
        message: result.message,
        data: result
      };
    }
  }

  async getBusinessVerificationStatus(businessProfileId: string, userId: string) {
    return await this.businessVerificationService.getVerificationStatus(businessProfileId, userId);
  }
}