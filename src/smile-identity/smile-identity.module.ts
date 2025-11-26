import { Module } from '@nestjs/common';
import { SmileIdentityService } from './smile-identity.service';
// import { VerificationCallbackController } from './verification-callback.controller';
import { SmileCoreService } from './services/smile-core.service';
import { KycService } from './services/kyc/kyc.service';
import { KybService } from './services/kyb/kyb.service';
import { BvnService } from './services/kyc/bvn.service';
import { NinService } from './services/kyc/nin.service';
import { VotersCardService } from './services/kyc/vorters-card.service';
import { BusinessVerificationService } from './services/kyb/business-verification.service';
import { VerificationOrchestratorService } from './services/verification-orchestrator.service';

@Module({
  // controllers: [VerificationCallbackController],
  providers: [
    SmileCoreService,
    SmileIdentityService,
    KycService,
    KybService,
    BvnService,
    NinService,
    VotersCardService,
    BusinessVerificationService,
    VerificationOrchestratorService,
  ],
  exports: [SmileIdentityService, VerificationOrchestratorService, KybService, KybService, SmileCoreService],
})
export class SmileIdentityModule { }
