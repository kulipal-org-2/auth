import { Entity, EntityRepositoryType, Property } from '@mikro-orm/postgresql';
import { CustomBaseEntity } from './base.entity';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

@Entity({ repository: () => RefreshTokenRepository })
export class RefreshToken extends CustomBaseEntity {
  [EntityRepositoryType]?: RefreshTokenRepository;

  @Property()
  userId!: string;

  @Property()
  tokenHash!: string;

  @Property()
  expiresAt!: string;

  @Property({ nullable: true })
  revokedAt?: string;
}
