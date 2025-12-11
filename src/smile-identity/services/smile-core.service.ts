import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDApi, SmileJobResponse } from 'smile-identity-core';
import {
  IdInfo,
  PartnerParams,
  SmileConfig,
  SmileVerificationResult,
} from '../types/smile-identity.types';

@Injectable()
export class SmileCoreService {
  private readonly logger = new Logger(SmileCoreService.name);
  private idApi!: IDApi;
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

    this.idApi = new IDApi(
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
      this.logger.log(`Partner params: ${JSON.stringify(partnerParams)}`);
      this.logger.log(`ID info: ${JSON.stringify(idInfo)}`);
      this.logger.log(`Using sidServer: ${this.config.sidServer}`);
      this.logger.log(`Using config: ${JSON.stringify(this.config)}`);

      // Type assertions to satisfy smile-identity-core
      const response: SmileJobResponse = await this.idApi.submit_job(
        partnerParams,
        idInfo,
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
      // Log full error details for debugging
      if (error instanceof Error) {
        this.logger.error(`Verification job failed: ${error.message}`);
        this.logger.error(`Error stack: ${error.stack}`);

        // Check if it's an Axios error with response data
        if ('response' in error) {
          const responseError = error as { response?: { data?: unknown } };
          if (responseError.response?.data) {
            this.logger.error(
              `Smile Identity API response: ${JSON.stringify(responseError.response.data)}`,
            );
          }
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Smile Identity verification failed: ${errorMessage}`);
    }
  }

  private isSuccessfulVerification(resultCode: string): boolean {
    const successCodes = ['1012', '1020', '1021']; // Business Verified, Exact Match, Partial Match
    return successCodes.includes(resultCode);
  }
}
