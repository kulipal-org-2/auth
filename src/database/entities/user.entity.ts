// src/database/entities/user.entity.ts
import { CustomBaseEntity } from './base.entity';
import { UserRepository } from '../repositories/user.repository';
import {
  Entity,
  EntityRepositoryType,
  Filter,
  Property,
} from '@mikro-orm/postgresql';

export enum UserType {
  USER = 'user',
  VENDOR = 'vendor',
}

export type IdentityVerificationType = 'KYC' | 'KYB';

@Entity({ repository: () => UserRepository })
@Filter({ name: 'notDeleted', cond: { deletedAt: null }, default: true })
export class User extends CustomBaseEntity {
  [EntityRepositoryType]?: UserRepository;

  @Property()
  firstName!: string;

  @Property()
  lastName!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ nullable: true })
  avatarUrl?: string;

  @Property({ nullable: true })
  password?: string;

  @Property()
  phoneNumber!: string;

  @Property({ nullable: true })
  source?: string;

  @Property()
  agreeToTerms!: boolean;

  @Property({ nullable: true })
  isEmailVerified?: boolean = false;

  @Property({ nullable: true })
  isPhoneVerified?: boolean = false;

  @Property()
  userType!: UserType;

  // NEW: User-level verification tracking
  @Property({ default: false })
  isIdentityVerified?: boolean = false;

  @Property({ nullable: true })
  identityVerificationType?: IdentityVerificationType;

  @Property({ nullable: true })
  identityVerifiedAt?: Date;

  @Property({ nullable: true })
  lastVerificationId?: string;

  @Property({ nullable: true })
  deletedAt?: Date;

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
