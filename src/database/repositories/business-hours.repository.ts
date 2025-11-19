import { EntityRepository } from "@mikro-orm/postgresql";
import { BusinessHours } from "../entities/business-hours.entity";

export class BusinessHoursRepository extends EntityRepository<BusinessHours>{}