import { EntityRepository } from "@mikro-orm/postgresql";
import { BusinessProfile } from "../entities";



export class BusinessProfileRepository extends EntityRepository<BusinessProfile>{}