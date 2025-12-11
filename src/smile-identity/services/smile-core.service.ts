import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SmileIdentityCore from 'smile-identity-core';
import {
  IdInfo,
  PartnerParams,
  SmileConfig,
  SmileVerificationResult,
} from '../types/smile-identity.types';

@Injectable()
export class SmileCoreService {
  private readonly logger = new Logger(SmileCoreService.name);
  private idApi: any;
  private config!: SmileConfig;

  constructor(private configService: ConfigService) {
    this.initializeSmileIdentity();
  }

  private initializeSmileIdentity(): void {
    const partnerId = this.configService.get<string>(
      'SMILE_IDENTITY_PARTNER_ID',
    );
    const apiKey = this.configService.get<string>('SMILE_IDENTITY_API_KEY');

    if (!partnerId || !apiKey) {
      this.logger.error('Smile Identity configuration is missing');
      throw new Error('Smile Identity configuration incomplete');
    }

    this.config = {
      partnerId,
      apiKey,
      sidServer:
        this.configService.get<string>('NODE_ENV') === 'production' ? '1' : '0',
    };

    this.idApi = new SmileIdentityCore.IDApi(
      this.config.partnerId,
      this.config.apiKey,
      this.config.sidServer,
    );

    this.logger.log('Smile Identity core service initialized');
  }

  async submitVerificationJob(
    partnerParams: PartnerParams,
    idInfo: IdInfo,
  ): Promise<SmileVerificationResult> {
    try {
      this.logger.log(`Submitting verification job: ${partnerParams.job_id}`);

      // Type assertions to satisfy smile-identity-core
      const response = await this.idApi.submit_job(
        partnerParams as any,
        idInfo as any,
      );

      return {
        success: this.isSuccessfulVerification(response.ResultCode),
        resultCode: response.ResultCode,
        resultText: response.ResultText,
        smileJobId: response.SmileJobID,
        timestamp: response.timestamp,
        signature: response.signature,
        fullResponse: response,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Verification job failed: ${errorMessage}`);
      throw new Error(`Smile Identity verification failed: ${errorMessage}`);
    }
  }

  private isSuccessfulVerification(resultCode: string): boolean {
    const successCodes = ['1012', '1020', '1021']; // Business Verified, Exact Match, Partial Match
    return successCodes.includes(resultCode);
  }
}
