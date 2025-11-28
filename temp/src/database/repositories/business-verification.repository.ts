import { EntityRepository } from "@mikro-orm/postgresql";
import { BusinessVerification } from "../entities";

export class BusinessVerificationRepository extends EntityRepository<BusinessVerification> { }