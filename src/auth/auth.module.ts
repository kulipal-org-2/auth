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
import { RequestOtpService } from './services/request-otp.service';
import { ValidateOtpService } from './services/validate-otp.service';
import { NotificationService } from './services/notification.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { VendorProfileService } from './services/vendor-profile.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SmileIdentityService } from './services/smile-identity.service';
import { VendorVerificationService } from './services/vendor-verification.service';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    ClientsModule.register([
      {
        name: 'NOTIFICATION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'notification',
          protoPath: join(__dirname, '..', 'proto/notification.proto'),
          url: process.env.NOTIFICATION_GRPC_URL,
        },
      },
    ]),
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
    RequestOtpService,
    ValidateOtpService,
    NotificationService,
    VendorProfileService,
    JwtAuthGuard,
    SmileIdentityService,
    VendorProfileService,
    VendorVerificationService,
  ],
})
export class AuthModule { }
