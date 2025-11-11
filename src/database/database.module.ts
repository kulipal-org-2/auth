import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmOptions } from 'src/config';
import { RefreshToken, User, ResetPasswordToken } from './entities';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { ResetPasswordTokenRepository } from './repositories/reset-password-token.repository';

@Module({
  imports: [
    MikroOrmModule.forRootAsync(MikroOrmOptions),
    MikroOrmModule.forFeature([User, RefreshToken, ResetPasswordToken]),
  ],
  providers: [
    UserRepository,
    RefreshTokenRepository,
    ResetPasswordTokenRepository,
  ],
  exports: [
    UserRepository,
    RefreshTokenRepository,
    ResetPasswordTokenRepository,
  ],
})
export class DatabaseModule {}
