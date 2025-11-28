// smile-identity/services/kyc/nin.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SmileCoreService } from '../smile-core.service';
import { SMILE_COUNTRIES, SMILE_JOB_TYPES, SMILE_KYC_ID_TYPES } from 'src/smile-identity/types/smile-job-types.constant';


@Injectable()
export class NinService {
  private readonly logger = new Logger(NinService.name);

  constructor(private smileCoreService: SmileCoreService) {}

  async verify(
    nin: string,
    userId: string,
    jobId: string,
  ) {
    this.logger.log(`Initiating NIN verification for user: ${userId}`);

    const partnerParams = {
      job_id: jobId,
      user_id: userId,
      job_type: SMILE_JOB_TYPES.BASIC_KYC,
    };

    const idInfo = {
      country: SMILE_COUNTRIES.NIGERIA,
      id_type: SMILE_KYC_ID_TYPES.NIN,
      id_number: nin,
    };

    const result = await this.smileCoreService.submitVerificationJob(partnerParams, idInfo);

    this.logger.log(`Completed NIN verification for user: ${userId}`);

    return result.fullResponse;
  }
}