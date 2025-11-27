import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as SmileIdentityCore from 'smile-identity-core';

export interface SmileIdentityConfig {
  partnerId: string;
  apiKey: string;
  sidServer: string;
  callbackUrl: string;
}

export interface DocumentVerificationParams {
  smileUserId: string;
  jobId: string;
  idType: string;
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  selfieImageUrl: string;
  documentImageUrl?: string;
}

export interface SmileVerificationResult {
  success: boolean;
  jobComplete: boolean;
  jobSuccess: boolean;
  resultCode: string;
  resultText: string;
  smileJobId: string;
  fullName?: string;
  idNumber?: string;
  dob?: string;
  actions?: {
    Liveness_Check?: string;
    Register_Selfie?: string;
    Verify_Document?: string;
    Selfie_To_ID_Card_Compare?: string;
    Return_Personal_Info?: string;
  };
  fullResponse?: any;
}

@Injectable()
export class SmileIdentityService {
  private readonly logger = new Logger(SmileIdentityService.name);
  private webApi: any;
  private config: SmileIdentityConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      partnerId: this.configService.get<string>('SMILE_IDENTITY_PARTNER_ID') ?? '6709',
      apiKey: this.configService.get<string>('SMILE_IDENTITY_API_KEY') ?? '',
      sidServer: this.configService.get<string>('SMILE_IDENTITY_SERVER') ?? '0',
      callbackUrl: this.configService.get<string>('SMILE_IDENTITY_CALLBACK_URL') ?? '',
    };

    if (!this.config.apiKey) {
      this.logger.warn('Smile Identity API key not configured');
    } else {
      const WebApi = SmileIdentityCore.WebApi;
      this.webApi = new WebApi(
        this.config.partnerId,
        this.config.callbackUrl,
        this.config.apiKey,
        this.config.sidServer,
      );
      this.logger.log('Smile Identity service initialized');
    }
  }

  async submitDocumentVerification(params: DocumentVerificationParams): Promise<SmileVerificationResult> {
    try {
      this.logger.log(`Submitting document verification for user: ${params.smileUserId}`);

      const partnerParams = {
        job_id: params.jobId,
        user_id: params.smileUserId,
        job_type: 6,
      };

      const imageDetails: Array<{ image_type_id: number; image: string }> = [
        {
          image_type_id: 2,
          image: params.selfieImageUrl,
        },
      ];

      if (params.documentImageUrl) {
        imageDetails.push({
          image_type_id: 3,
          image: params.documentImageUrl,
        });
      }

      const idInfo: any = {};
      if (params.idNumber) {
        idInfo.id_number = params.idNumber;
      }
      if (params.idType) {
        idInfo.id_type = params.idType.toUpperCase();
      }
      if (params.firstName) {
        idInfo.first_name = params.firstName;
      }
      if (params.lastName) {
        idInfo.last_name = params.lastName;
      }
      if (params.dob) {
        idInfo.dob = params.dob;
      }
      idInfo.country = 'NG';

      const options = {
        return_job_status: true,
        return_image_links: false,
        return_history: false,
      };

      const response = await this.webApi.submit_job(
        partnerParams,
        imageDetails,
        Object.keys(idInfo).length > 0 ? idInfo : undefined,
        options,
      );

      this.logger.log(`Smile Identity response: ${JSON.stringify(response)}`);

      return this.parseVerificationResponse(response);
    } catch (error: any) {
      this.logger.error(`Smile Identity error: ${error.message}`, error.stack);
      return {
        success: false,
        jobComplete: false,
        jobSuccess: false,
        resultCode: 'ERROR',
        resultText: error.message || 'Verification failed',
        smileJobId: '',
        fullResponse: error,
      };
    }
  }

  async getJobStatus(smileUserId: string, jobId: string): Promise<SmileVerificationResult> {
    try {
      this.logger.log(`Getting job status for user: ${smileUserId}, job: ${jobId}`);

      const utilities = SmileIdentityCore.Utilities;
      const utilInstance = new utilities(
        this.config.partnerId,
        this.config.apiKey,
        this.config.sidServer,
      );

      const options = {
        return_image_links: false,
        return_history: false,
      };

      const response = await utilInstance.get_job_status(
        smileUserId,
        jobId,
        options,
      );

      return this.parseVerificationResponse(response);
    } catch (error: any) {
      this.logger.error(`Error getting job status: ${error.message}`, error.stack);
      return {
        success: false,
        jobComplete: false,
        jobSuccess: false,
        resultCode: 'ERROR',
        resultText: error.message || 'Failed to get job status',
        smileJobId: '',
        fullResponse: error,
      };
    }
  }

  async generateWebToken(smileUserId: string, jobId: string, product?: string): Promise<string> {
    try {
      const requestParams = {
        user_id: smileUserId,
        job_id: jobId,
        product: product || 'doc_verification',
        callback_url: this.config.callbackUrl,
      };

      const token = await this.webApi.get_web_token(requestParams);
      return token;
    } catch (error: any) {
      this.logger.error(`Error generating web token: ${error.message}`, error.stack);
      throw error;
    }
  }

  private parseVerificationResponse(response: any): SmileVerificationResult {
    const result: SmileVerificationResult = {
      success: false,
      jobComplete: response.job_complete ?? false,
      jobSuccess: response.job_success ?? false,
      resultCode: response.code ?? '',
      resultText: response.result?.ResultText ?? '',
      smileJobId: response.result?.SmileJobID ?? '',
      fullResponse: response,
    };

    if (response.result) {
      result.fullName = response.result.FullName;
      result.idNumber = response.result.IDNumber;
      result.dob = response.result.DOB;
      result.actions = response.result.Actions;
      result.resultCode = response.result.ResultCode;
      result.resultText = response.result.ResultText;
    }

    const successCodes = ['0810', '1012', '2302'];
    result.success = response.job_success && successCodes.includes(result.resultCode);

    return result;
  }
}
