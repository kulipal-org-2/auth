import { EntityRepository } from "@mikro-orm/postgresql";
import { VendorVerification } from "../entities/vendor-verification.entity";

export class VendorVerificationRepository extends EntityRepository<VendorVerification> {}