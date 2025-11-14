import { EntityRepository } from '@mikro-orm/postgresql';
import { Otp } from '../entities/otp.entity';

export class OtpRepository extends EntityRepository<Otp> {}