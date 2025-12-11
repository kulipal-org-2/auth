// src/smile-identity/services/verification-orchestrator.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { KycService } from './kyc/kyc.service';
import { KybService } from './kyb/kyb.service';
import { User } from 'src/database/entities/user.entity';
import { randomUUID } from 'crypto';
import {
  BusinessType,
  BusinessVerificationResponse,
  KycVerificationResponse,
} from '../types/smile-identity.types';

export interface KycVerificationData {
  idType: string;
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
}

@Injectable()
export class VerificationOrchestratorService {
  private readonly logger = new Logger(VerificationOrchestratorService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly kycService: KycService,
    private readonly kybService: KybService,
  ) {}

  @CreateRequestContext()
  async initiateVerification(
    userId: string,
    verificationType: 'KYC' | 'KYB',
    data: KycVerificationData | KybVerificationData,
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
    let result: KycVerificationResponse | BusinessVerificationResponse;

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
            businessType: kybData.businessType as BusinessType,
            businessName: kybData.businessName,
          },
          userId,
          jobId,
        );
      }

      // Update user verification status if successful
      if (result.success) {
        user.isIdentityVerified = true;
        user.identityVerificationType = verificationType;
        user.identityVerifiedAt = new Date();
        user.lastVerificationId = result.smileJobId;

        await this.em.flush();
        this.logger.log(
          `Successfully updated verification status for user: ${userId}`,
        );
      }

      return {
        success: result.success,
        message: result.message,
        smileJobId: result.smileJobId,
        resultCode: result.resultCode,
        timestamp: result.timestamp,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Verification failed for user ${userId}: ${errorMessage}`,
        stack,
      );
      throw new BadRequestException(`Verification failed: ${errorMessage}`);
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
