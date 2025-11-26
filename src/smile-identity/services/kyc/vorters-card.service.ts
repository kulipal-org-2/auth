// smile-identity/services/kyc/voters-card.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SmileCoreService } from '../smile-core.service';
import { SMILE_COUNTRIES, SMILE_JOB_TYPES, SMILE_KYC_ID_TYPES } from 'src/smile-identity/types/smile-job-types.constant';

@Injectable()
export class VotersCardService {
  private readonly logger = new Logger(VotersCardService.name);

  constructor(private smileCoreService: SmileCoreService) {}

  async verify(
    votersCardNumber: string,
    userId: string,
    jobId: string,
  ) {
    this.logger.log(`Initiating Voter's Card verification for user: ${userId}`);

    const partnerParams = {
      job_id: jobId,
      user_id: userId,
      job_type: SMILE_JOB_TYPES.BASIC_KYC,
    };

    const idInfo = {
      country: SMILE_COUNTRIES.NIGERIA,
      id_type: SMILE_KYC_ID_TYPES.VOTER_ID,
      id_number: votersCardNumber,
    };

    const result = await this.smileCoreService.submitVerificationJob(partnerParams, idInfo);

    this.logger.log(`Completed Voter's Card verification for user: ${userId}`);

    return result.fullResponse;
  }
}