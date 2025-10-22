import { CustomBaseEntity } from './base.entity';
import { UserRepository } from '../repositories/user.repository';
import { Entity, EntityRepositoryType, Property } from '@mikro-orm/postgresql';

@Entity({ repository: () => UserRepository })
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
