import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmOptions } from 'src/config';
import { RefreshToken, User, ResetPasswordToken, Otp } from './entities';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { ResetPasswordTokenRepository } from './repositories/reset-password-token.repository';
import { OtpRepository } from './repositories/otp.repository';

@Module({
  imports: [
    MikroOrmModule.forRootAsync(MikroOrmOptions),
    MikroOrmModule.forFeature([User, RefreshToken, ResetPasswordToken, Otp]),
  ],
  providers: [
    UserRepository,
    RefreshTokenRepository,
    ResetPasswordTokenRepository,
    OtpRepository,
  ],
  exports: [
    UserRepository,
    RefreshTokenRepository,
    ResetPasswordTokenRepository,
    OtpRepository,
  ],
})
export class DatabaseModule {}
