import { Entity, EntityRepositoryType, Property } from '@mikro-orm/postgresql';
import { CustomBaseEntity } from './base.entity';
import { ResetPasswordTokenRepository } from '../repositories/reset-password-token.repository';

@Entity()
export class ResetPasswordToken extends CustomBaseEntity {
  [EntityRepositoryType]?: ResetPasswordTokenRepository;

  @Property()
  userId!: string;

  @Property()
  tokenHash!: string;

  @Property()
  expiresAt!: Date;
}
