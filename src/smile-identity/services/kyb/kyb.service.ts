// smile-identity/services/kyb/kyb.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SmileCoreService } from '../smile-core.service';
import { BusinessVerificationRequest, BusinessVerificationResponse } from 'src/smile-identity/types/smile-identity.types';
import { SMILE_BUSINESS_ID_TYPES, SMILE_COUNTRIES, SMILE_JOB_TYPES } from 'src/smile-identity/types/smile-job-types.constant';

@Injectable()
export class KybService {
  private readonly logger = new Logger(KybService.name);

  constructor(private smileCoreService: SmileCoreService) {}

  async verifyBusiness(
    request: BusinessVerificationRequest,
    userId: string,
    jobId: string,
  ): Promise<BusinessVerificationResponse> {
    this.logger.log(`Starting business verification for user: ${userId}`);

    const partnerParams = {
      job_id: jobId,
      user_id: userId,
      job_type: SMILE_JOB_TYPES.BUSINESS_VERIFICATION,
    };

    const idInfo: any = {
      country: SMILE_COUNTRIES.NIGERIA,
      id_type: SMILE_BUSINESS_ID_TYPES.BUSINESS_REGISTRATION,
      id_number: request.registrationNumber.replace(/\D/g, ''), // Remove non-numeric characters
      business_type: request.businessType,
      entered: 'true',
    };

    // Add optional fields if provided
    if (request.businessName) {
      idInfo.business_name = request.businessName;
    }

    const result = await this.smileCoreService.submitVerificationJob(partnerParams, idInfo);

    return {
      success: result.success,
      message: result.resultText,
      resultCode: result.resultCode,
      smileJobId: result.smileJobId,
      companyInformation: result.fullResponse.company_information,
      directors: result.fullResponse.directors || [],
      beneficialOwners: result.fullResponse.beneficial_owners || [],
      timestamp: result.timestamp,
    };
  }

  async verifyTaxInformation(
    taxNumber: string,
    userId: string,
    jobId: string,
  ): Promise<BusinessVerificationResponse> {
    this.logger.log(`Starting tax verification for user: ${userId}`);

    const partnerParams = {
      job_id: jobId,
      user_id: userId,
      job_type: SMILE_JOB_TYPES.BUSINESS_VERIFICATION,
    };

    const idInfo = {
      country: SMILE_COUNTRIES.NIGERIA,
      id_type: SMILE_BUSINESS_ID_TYPES.TAX_INFORMATION,
      id_number: taxNumber,
      entered: 'true',
    };

    const result = await this.smileCoreService.submitVerificationJob(partnerParams, idInfo);

    return {
      success: result.success,
      message: result.resultText,
      resultCode: result.resultCode,
      smileJobId: result.smileJobId,
      companyInformation: result.fullResponse.company_information,
      timestamp: result.timestamp,
    };
  }
}