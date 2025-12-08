import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmOptions } from 'src/config';
import { RefreshToken, User, ResetPasswordToken, Otp, BusinessProfile, BusinessVerification, OperatingTimes } from './entities';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { ResetPasswordTokenRepository } from './repositories/reset-password-token.repository';
import { OtpRepository } from './repositories/otp.repository';
import { BusinessProfileRepository } from './repositories/business-profile.repository';
import { BusinessVerificationRepository } from './repositories/business-verification.repository';
import { OperatingTimesRepository } from './repositories/operating-times.repository';
@Module({
  imports: [
    MikroOrmModule.forRootAsync(MikroOrmOptions),
    MikroOrmModule.forFeature([User, RefreshToken, ResetPasswordToken, Otp, BusinessProfile, BusinessVerification, OperatingTimes]),
  ],
  providers: [
    UserRepository,
    RefreshTokenRepository,
    ResetPasswordTokenRepository,
    OtpRepository,
    BusinessProfileRepository,
    BusinessVerificationRepository,
    OperatingTimesRepository,
  ],
  exports: [
    UserRepository,
    RefreshTokenRepository,
    ResetPasswordTokenRepository,
    OtpRepository,
    BusinessProfileRepository,
    BusinessVerificationRepository,
    OperatingTimesRepository,
  ],
})
export class DatabaseModule { }
