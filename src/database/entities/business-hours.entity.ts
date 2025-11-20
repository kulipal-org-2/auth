import { Entity, EntityRepositoryType, ManyToOne, Property } from "@mikro-orm/postgresql";
import { CustomBaseEntity } from "./base.entity";
import { VendorProfile } from "./vendor-profile.entity";
import { BusinessHoursRepository } from "../repositories/business-hours.repository";

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

@Entity({repository: () => BusinessHoursRepository })
export class BusinessHours extends CustomBaseEntity{
    [EntityRepositoryType]?: BusinessHoursRepository;
    
    @ManyToOne(() => VendorProfile)
    vendorProfile!: VendorProfile;

    @Property()
    dayOfWeek!: DayOfWeek;
    
    @Property({nullable: true})
    isOpen?: boolean = true;

    @Property()
    openTime!: string;

    @Property()
    closeTime!: string;

    @Property({nullable: true})
    openTime2?: string;

    @Property({nullable: true})
    closeTime2?: string;
}