import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type { Metadata } from '@grpc/grpc-js';
import {
  type RegisterRequest,
  type RegisterResponse,
  type LoginRequest,
  type LoginResponse,
  type LoginGoogleRequest,
  type LoginAppleRequest,
  type ForgotPasswordRequest,
  type ValidateTokenRequest,
  type ValidateTokenResponse,
  type SendEmailOtpRequest,
  type SendSmsOtpRequest,
  type ValidateEmailOtpRequest,
  type ValidateOtpResponse,
  type ValidateSmsOtpRequest,
  type MessageResponse as RMessageResponse,
} from './types/auth.type';
import { LoginService } from './services/login.service';
import { RefreshAccessTokenService } from './services/refresh-token.service';
import { RegisterService } from './services/register.service';
import { MessageResponse } from 'kulipal-shared';
import { OauthService } from './services/oauth.service';
import { ForgotPasswordService } from './services/forgot-password.service';
import { ValidateTokenService } from './services/validate-token.service';
import { ResetPasswordService } from './services/reset-password.service';
import { ChangePasswordService } from './services/change-password.service';
import { RequestOtpService } from './services/request-otp.service';
import { ValidateOtpService } from './services/validate-otp.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginService: LoginService,
    private readonly refreshToken: RefreshAccessTokenService,
    private readonly registerService: RegisterService,
    private readonly oauthService: OauthService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly validateTokenService: ValidateTokenService,
    private readonly resetPasswordService: ResetPasswordService,
    private readonly changePasswordService: ChangePasswordService,
    private readonly requestOtpService: RequestOtpService,
    private readonly validateOtpService: ValidateOtpService,
  ) {}

  @GrpcMethod('AuthService', 'Login')
  login(data: LoginRequest): Promise<LoginResponse> {
    return this.loginService.execute(data);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  refreshAccessToken(data: {
    userId: string;
    refreshToken: string;
  }): Promise<LoginResponse> {
    return this.refreshToken.execute(data);
  }

  @GrpcMethod('AuthService', 'Register')
  register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.registerService.execute(data);
  }

  @GrpcMethod('AuthService', 'LoginGoogle')
  loginGoogle(data: LoginGoogleRequest): Promise<LoginResponse> {
    return this.oauthService.authenticateGoogleUser(data);
  }

  @GrpcMethod('AuthService', 'LoginApple')
  loginApple(data: LoginAppleRequest): Promise<LoginResponse> {
    return this.oauthService.authenticateAppleUser(data.code);
  }

  @GrpcMethod('AuthService', 'ForgotPassword')
  forgotPassword(data: ForgotPasswordRequest): Promise<MessageResponse> {
    return this.forgotPasswordService.execute(data);
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  validateToken(data: ValidateTokenRequest): Promise<ValidateTokenResponse> {
    return this.validateTokenService.execute(data);
  }

  @GrpcMethod('AuthService', 'ResetPassword')
  resetPassword(data: {
    token: string;
    email: string;
    newPassword: string;
  }): Promise<RMessageResponse> {
    return this.resetPasswordService.execute(data);
  }

  @GrpcMethod('AuthService', 'ChangePassword')
  changePassword(
    data: {
      currentPassword: string;
      newPassword: string;
    },
    metadata: Metadata,
  ): Promise<RMessageResponse> {
    const authHeader =
      (metadata?.get?.('authorization')?.[0] as string) ??
      (metadata?.get?.('Authorization')?.[0] as string) ??
      '';
    const bearer = typeof authHeader === 'string' ? authHeader : '';
    const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : bearer;

    console.log('data:', data);

    return this.changePasswordService.execute({
      token,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  }

  @GrpcMethod('AuthService', 'SendEmailOtp')
  sendEmailOtp(data: SendEmailOtpRequest): Promise<MessageResponse> {
    return this.requestOtpService.sendEmailOtp(data);
  }

  @GrpcMethod('AuthService', 'SendSmsOtp')
  sendSmsOtp(data: SendSmsOtpRequest): Promise<MessageResponse> {
    return this.requestOtpService.sendSmsOtp(data);
  }

  @GrpcMethod('AuthService', 'ValidateEmailOtp')
  validateEmailOtp(
    data: ValidateEmailOtpRequest,
  ): Promise<ValidateOtpResponse> {
    return this.validateOtpService.validateEmailOtp(data);
  }

  @GrpcMethod('AuthService', 'ValidateSmsOtp')
  validateSmsOtp(data: ValidateSmsOtpRequest): Promise<ValidateOtpResponse> {
    return this.validateOtpService.validateSmsOtp(data);
  }
}
