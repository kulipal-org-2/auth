import { EntityRepository } from '@mikro-orm/postgresql';
import { RefreshToken } from '../entities';

export class RefreshTokenRepository extends EntityRepository<RefreshToken> {}
