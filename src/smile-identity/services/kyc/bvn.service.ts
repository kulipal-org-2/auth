// smile-identity/services/kyc/bvn.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SMILE_COUNTRIES, SMILE_JOB_TYPES, SMILE_KYC_ID_TYPES } from 'src/smile-identity/types/smile-job-types.constant';
import { SmileCoreService } from '../smile-core.service';

@Injectable()
export class BvnService {
    private readonly logger = new Logger(BvnService.name);

    constructor(private smileCoreService: SmileCoreService) { }

    async verify(
        bvn: string,
        userId: string,
        jobId: string,
    ) {
        this.logger.log(`Initiating BVN verification for user: ${userId}`);

        const partnerParams = {
            job_id: jobId,
            user_id: userId,
            job_type: SMILE_JOB_TYPES.BASIC_KYC,
        };

        const idInfo = {
            country: SMILE_COUNTRIES.NIGERIA,
            id_type: SMILE_KYC_ID_TYPES.BVN,
            id_number: bvn,
        };

        const result = await this.smileCoreService.submitVerificationJob(partnerParams, idInfo);

        this.logger.log(`Completed BVN verification for user: ${userId} with status: ${result.resultText}`);

        return result.fullResponse;
    }
}