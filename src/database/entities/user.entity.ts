import { Entity, Property } from '@mikro-orm/core';
import { CustomBaseEntity } from './base.entity';

@Entity()
export class User extends CustomBaseEntity {
  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ nullable: true })
  avatarUrl?: string;

  @Property()
  password?: string;

  @Property({ nullable: true })
  phoneNumber?: string;

  @Property({ nullable: true })
  source?: string;

  @Property()
  agreeToTerms!: boolean;

  @Property({ nullable: true })
  isEmailVerified?: boolean = false;
}
