import {
  Collection,
  Entity,
  EntityRepositoryType,
  Index,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/postgresql';
import { CustomBaseEntity } from './base.entity';
import { User } from './user.entity';
import { BusinessProfileRepository } from '../repositories/business-profile.repository';
import { OperatingTimes } from './operating-times.entity';
import { BusinessVerification } from './business-verification.entity';

export type Industry = 'FOOD' | 'EVENTS' | 'HOUSING';
export type ServiceMode = 'DELIVERY' | 'PICK_UP' | 'DINE_IN';

@Entity({ repository: () => BusinessProfileRepository })
export class BusinessProfile extends CustomBaseEntity {
  [EntityRepositoryType]?: BusinessProfileRepository;

  @ManyToOne(() => User)
  user!: User;

  @Property()
  businessName!: string;

  @Property()
  industry!: Industry;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ nullable: true })
  placeId?: string;

  @Property({ type: 'decimal', precision: 10, scale: 8 })
  latitude!: number;

  @Property({ type: 'decimal', precision: 11, scale: 8 })
  longitude!: number;

  @Property()
  stringAddress!: string;

  @Property({
    type: 'geography',
    columnType: 'geography(Point, 4326)',
    nullable: true,
  })
  @Index({ type: 'gist' })
  location?: string;

  @Property({ nullable: true })
  coverImageUrl?: string;

  @Property({ type: 'json' })
  serviceModes!: ServiceMode[];

  @Property({ default: false })
  isThirdPartyVerified?: boolean = false;

  @Property({ default: false })
  isKycVerified?: boolean = false;

  @OneToMany(() => OperatingTimes, (times) => times.businessProfile, {
    orphanRemoval: true,
  })
  operatingTimes = new Collection<OperatingTimes>(this);

  @OneToMany(
    () => BusinessVerification,
    (verification) => verification.businessProfile,
  )
  verifications = new Collection<BusinessVerification>(this);
}
