// src/smile-identity/services/verification-orchestrator.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { KycService } from './kyc/kyc.service';
import { KybService } from './kyb/kyb.service';
import { User } from 'src/database/entities/user.entity';
import { randomUUID } from 'crypto';
import { BusinessProfile } from 'src/database';

export enum IDentificationType {
  NIN_SLIP = 'NIN_SLIP',
  BVN = 'BVN',
  PHONE_NUMBER = 'PHONE_NUMBER',
  VOTER_ID = 'VOTER_ID',
  NIN_V2 = 'NIN_V2',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  V_NIN = 'V_NIN',
}
export interface KycVerificationData {
  idType: IDentificationType;
  idNumber: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
}

export interface KybVerificationData {
  registrationNumber: string;
  businessType: string;
  businessName?: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  smileJobId: string;
  resultCode: string;
  skipVerification?: boolean;
  user?: User;
  timestamp: string;
  businessProfilesUpdated?: number;
}

@Injectable()
export class VerificationOrchestratorService {
  private readonly logger = new Logger(VerificationOrchestratorService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly kycService: KycService,
    private readonly kybService: KybService,
  ) { }

  @CreateRequestContext()
  async initiateVerification(
    userId: string,
    verificationType: 'KYC' | 'KYB',
    data: KycVerificationData | KybVerificationData,
    businessProfileId?: string,
  ): Promise<VerificationResult> {
    this.logger.log(
      `Initiating ${verificationType} verification for user: ${userId}`,
    );

    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // If user is already verified, return existing status
    if (user.isIdentityVerified) {
      this.logger.log(
        `User ${userId} is already verified, skipping verification`,
      );
      return {
        success: true,
        message: 'User already verified',
        smileJobId: user.lastVerificationId || 'N/A',
        resultCode: 'ALREADY_VERIFIED',
        skipVerification: true,
        user,
        timestamp: new Date().toISOString(),
      };
    }

    const jobId = this.generateJobId();
    let result;

    try {
      if (verificationType === 'KYC') {
        const kycData = data as KycVerificationData;
        result = await this.kycService.verifyKyc(
          {
            idType: kycData.idType,
            idNumber: kycData.idNumber,
            firstName: kycData.firstName,
            lastName: kycData.lastName,
            dob: kycData.dob,
          },
          userId,
          jobId,
        );
      } else {
        const kybData = data as KybVerificationData;
        result = await this.kybService.verifyBusiness(
          {
            registrationNumber: kybData.registrationNumber,
            businessType: kybData.businessType as any,
            businessName: kybData.businessName,
          },
          userId,
          jobId,
        );
      }

      let businessProfilesUpdated = 0;

      // Update user verification status if successful
      if (result.success) {
        const wasVerified = user.isIdentityVerified;

        user.isIdentityVerified = true;
        user.identityVerificationType = verificationType;
        user.identityVerifiedAt = new Date();
        user.lastVerificationId = result.smileJobId;

        await this.em.flush();
        this.logger.log(
          `Successfully updated verification status for user: ${userId}`,
        );

        if (!wasVerified) {
          this.logger.log(
            `User ${userId} just got verified, updating existing business profiles`,
          );
          businessProfilesUpdated = await this.updateBusinessProfilesForVerifiedUser(userId);
        }
      }

      return {
        success: result.success,
        message: result.message,
        smileJobId: result.smileJobId,
        resultCode: result.resultCode,
        timestamp: result.timestamp,
      };
    } catch (error: any) {
      this.logger.error(
        `Verification failed for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Verification failed: ${error.message}`);
    }
  }

  @CreateRequestContext()
  private async updateBusinessProfilesForVerifiedUser(
    userId: string,
  ): Promise<number> {
    this.logger.log(
      `Updating business profiles for newly verified user: ${userId}`,
    );

    try {
      // Find all business profiles for this user
      const businessProfiles = await this.em.find(BusinessProfile, {
        user: { id: userId }, 
      });

      if (businessProfiles.length === 0) {
        this.logger.log(`No business profiles found for user ${userId}`);
        return 0;
      }

      this.logger.log(
        `Found ${businessProfiles.length} business profile(s) for user ${userId}`,
      );

      // Update verification status for all profiles that need it
      let updatedCount = 0;
      for (const profile of businessProfiles) {
        const needsUpdate =
          !profile.isThirdPartyVerified || !profile.isKycVerified;

        if (needsUpdate) {
          profile.isThirdPartyVerified = true;
          profile.isKycVerified = true;
          updatedCount++;

          this.logger.log(
            `Updated verification status for business profile: ${profile.id}`,
          );
        }
      }

      if (updatedCount > 0) {
        await this.em.flush();
        this.logger.log(
          `Successfully updated ${updatedCount} business profile(s) for verified user ${userId}`,
        );
      } else {
        this.logger.log(
          `All business profiles for user ${userId} are already verified`,
        );
      }

      return updatedCount;
    } catch (error: any) {
      this.logger.error(
        `Error updating business profiles for user ${userId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - we don't want to fail the verification if profile update fails
      return 0;
    }
  }

  @CreateRequestContext()
  async getUserVerificationStatus(userId: string): Promise<{
    isIdentityVerified: boolean;
    identityVerificationType?: 'KYC' | 'KYB';
    identityVerifiedAt?: Date;
    lastVerificationId?: string;
  }> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      isIdentityVerified: user.isIdentityVerified ?? false,
      identityVerificationType: user.identityVerificationType,
      identityVerifiedAt: user.identityVerifiedAt,
      lastVerificationId: user.lastVerificationId,
    };
  }

  private generateJobId(): string {
    return `job_${randomUUID()}`;
  }
}
