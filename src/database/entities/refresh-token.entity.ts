import { Entity, Property } from '@mikro-orm/core';
import { CustomBaseEntity } from './base.entity';

@Entity()
export class RefreshToken extends CustomBaseEntity {
  @Property()
  userId!: string;

  @Property()
  tokenHash!: string;

  @Property()
  expiresAt!: string;

  @Property({ nullable: true })
  revokedAt?: string;
}
