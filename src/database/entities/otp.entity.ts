import { CustomBaseEntity } from './base.entity';
import { OtpRepository } from '../repositories/otp.repository';
import { Entity, EntityRepositoryType, Index, Property } from '@mikro-orm/postgresql';

@Entity({ repository: () => OtpRepository })
@Index({ properties: ['identifier', 'token'] })
export class Otp extends CustomBaseEntity {
  [EntityRepositoryType]?: OtpRepository;

  @Property()
  identifier!: string;

  @Property()
  token!: string;

  @Property()
  tokenTtl!: Date;
}
