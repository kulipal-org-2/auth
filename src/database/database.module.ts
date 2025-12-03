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
import { WalletRepository } from './repositories/wallet.repository';
import { WalletPinResetOtpRepository } from './repositories/wallet-pin-reset-otp.repository';
import { Wallet } from './entities/wallet.entity';
import { WalletPinResetOtp } from './entities/wallet-pin-reset-otp.entity';

@Module({
  imports: [
    MikroOrmModule.forRootAsync(MikroOrmOptions),
    MikroOrmModule.forFeature([User, RefreshToken, ResetPasswordToken, Otp, BusinessProfile, BusinessVerification, OperatingTimes, Wallet, WalletPinResetOtp]),
  ],
  providers: [
    UserRepository,
    RefreshTokenRepository,
    ResetPasswordTokenRepository,
    OtpRepository,
    BusinessProfileRepository,
    BusinessVerificationRepository,
    OperatingTimesRepository,
    WalletRepository,
    WalletPinResetOtpRepository
  ],
  exports: [
    UserRepository,
    RefreshTokenRepository,
    ResetPasswordTokenRepository,
    OtpRepository,
    BusinessProfileRepository,
    BusinessVerificationRepository,
    OperatingTimesRepository,
    WalletRepository,
    WalletPinResetOtpRepository
  ],
})
export class DatabaseModule { }
