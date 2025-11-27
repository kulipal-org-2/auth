import { EntityRepository } from '@mikro-orm/postgresql';
import { ResetPasswordToken } from '../entities';

export class ResetPasswordTokenRepository extends EntityRepository<ResetPasswordToken> {}
