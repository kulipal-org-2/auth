import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { LoginService } from './services/login.service';
import { OauthService } from './services/oauth.service';
import { RefreshAccessTokenService } from './services/refresh-token.service';
import { RegisterService } from './services/register.service';
import { ForgotPasswordService } from './services/forgot-password.service';
import { DatabaseModule } from 'src/database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { ValidateTokenService } from './services/validate-token.service';
import { ResetPasswordService } from './services/reset-password.service';
import { ChangePasswordService } from './services/change-password.service';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginService,
    OauthService,
    RefreshAccessTokenService,
    RegisterService,
    ForgotPasswordService,
    ValidateTokenService,
    ResetPasswordService,
    ChangePasswordService,
  ],
})
export class AuthModule {}
