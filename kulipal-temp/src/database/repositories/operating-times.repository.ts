import { EntityRepository } from "@mikro-orm/postgresql";
import { OperatingTimes } from "../entities";


export class OperatingTimesRepository extends EntityRepository<OperatingTimes> { }