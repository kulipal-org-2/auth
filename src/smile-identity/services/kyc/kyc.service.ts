// smile-identity/services/kyc/kyc.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SmileCoreService } from '../smile-core.service';
import { KycResult, KycVerificationRequest, KycVerificationResponse } from 'src/smile-identity/types/smile-identity.types';
import { SMILE_COUNTRIES, SMILE_JOB_TYPES } from 'src/smile-identity/types/smile-job-types.constant';


@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private smileCoreService: SmileCoreService) {}

  async verifyKyc(
    request: KycVerificationRequest,
    userId: string,
    jobId: string,
  ): Promise<KycVerificationResponse> {
    this.logger.log(`Starting KYC verification for user: ${userId}, type: ${request.idType}`);

    const partnerParams = {
      job_id: jobId,
      user_id: userId,
      job_type: SMILE_JOB_TYPES.BASIC_KYC,
    };

    const idInfo: any = {
      country: SMILE_COUNTRIES.NIGERIA,
      id_type: request.idType,
      id_number: request.idNumber,
    };

    // Add optional fields based on ID type
    if (request.firstName) idInfo.first_name = request.firstName;
    if (request.lastName) idInfo.last_name = request.lastName;
    if (request.dob) idInfo.dob = request.dob;

    const result = await this.smileCoreService.submitVerificationJob(partnerParams, idInfo);

    const kycResult: KycResult = {
      success: result.success,
      resultCode: result.resultCode,
      resultText: result.resultText,
      fullName: result.fullResponse.FullName,
      idNumber: result.fullResponse.IDNumber,
      dob: result.fullResponse.DOB,
      gender: result.fullResponse.Gender,
      photo: result.fullResponse.Photo,
      actions: result.fullResponse.Actions,
    };

    return {
      success: result.success,
      message: result.resultText,
      resultCode: result.resultCode,
      smileJobId: result.smileJobId,
      kycResult,
      timestamp: result.timestamp,
    };
  }
}