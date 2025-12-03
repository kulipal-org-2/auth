import { Entity, EntityRepositoryType, ManyToOne, Property } from "@mikro-orm/postgresql";
import { CustomBaseEntity } from "./base.entity";
import { BusinessProfile } from "./business-profile.entity";
import { OperatingTimesRepository } from "../repositories/operating-times.repository";

export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'weekdays' | 'weekends';

@Entity({ repository: () => OperatingTimesRepository })
export class OperatingTimes extends CustomBaseEntity {
    [EntityRepositoryType]?: OperatingTimesRepository;

    @ManyToOne(() => BusinessProfile)
    businessProfile!: BusinessProfile;

    @Property()
    day!: DayOfWeek;

    @Property()
    startTime!: string; // Format: "HH:mm"

    @Property()
    endTime!: string; // Format: "HH:mm"
}