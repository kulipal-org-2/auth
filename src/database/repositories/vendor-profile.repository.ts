import { EntityRepository } from "@mikro-orm/postgresql";
import { VendorProfile } from "../entities/vendor-profile.entity";


export class VendorProfileRepository extends EntityRepository<VendorProfile>{}