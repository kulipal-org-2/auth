import { Collection, Entity, EntityRepositoryType, OneToMany, Property } from "@mikro-orm/postgresql";
import { VendorProfileRepository } from "../repositories/vendor-profile.repository";
import { CustomBaseEntity } from "./base.entity";
import { BusinessHours } from "./business-hours.entity";
import { VendorVerification } from "./vendor-verification.entity";

export type BusinessType = 'food_vendor' | 'stay_provider' | 'event_organizer';
export type ServiceType = 'delivery' | 'pickup' | 'dine_in';

@Entity({ repository: () => VendorProfileRepository })
export class VendorProfile extends CustomBaseEntity {
  [EntityRepositoryType]?: VendorProfileRepository;

  @Property({ unique: true })
  userId!: string;

  @Property({ nullable: true })
  businessName?: string;

  @Property({ nullable: true })
  businessType?: BusinessType;

  @Property({ nullable: true })
  address?: string;

  @Property({ nullable: true })
  coverImageUrl?: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'json', nullable: true })
  serviceTypes?: ServiceType[];

  @Property({ nullable: true })
  isProfileComplete?: boolean = false;

  @Property({ nullable: true })
  isThirdPartyVerified?: boolean = false; // SmileID verification

  @Property({ nullable: true })
  isKycVerified?: boolean = false; // Admin manual verification

  @Property({ nullable: true })
  verificationStep?: number = 0;

  @OneToMany(() => BusinessHours, (hours) => hours.vendorProfile)
  businessHours = new Collection<BusinessHours>(this);

  @OneToMany(() => VendorVerification, (verification) => verification.vendorProfile)
  verifications = new Collection<VendorVerification>(this);
}