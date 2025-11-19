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
  type RefreshTokenRequest,
  type ChangePasswordRequest,
  type ResetPasswordRequest,
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
import type { GetVendorProfileRequest, UpdateVendorProfileRequest, VendorProfileResponse } from './types/vendor-profile.type';
import { VendorProfileService } from './services/vendor-profile.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AdminReviewVerificationRequest, AdminReviewVerificationResponse, GetVerificationStatusRequest, GetVerificationStatusResponse, InitiateVerificationRequest, InitiateVerificationResponse, SubmitVerificationRequest, SubmitVerificationResponse } from './types/vendor-verification.type';
import { VendorVerificationService } from './services/vendor-verification.service';

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
    private readonly vendorProfileService: VendorProfileService,
    private readonly vendorVerificationService: VendorVerificationService,
    private readonly jwtAuthGuard: JwtAuthGuard,
  ) { }

  @GrpcMethod('AuthService', 'Login')
  login(data: LoginRequest): Promise<LoginResponse> {
    return this.loginService.execute(data);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  refreshAccessToken(data: RefreshTokenRequest): Promise<LoginResponse> {
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
  resetPassword(data: ResetPasswordRequest): Promise<RMessageResponse> {
    return this.resetPasswordService.execute(data);
  }

  @GrpcMethod('AuthService', 'ChangePassword')
  changePassword(
    data: ChangePasswordRequest,
    metadata: Metadata,
  ): Promise<RMessageResponse> {
    const authHeader =
      (metadata?.get?.('authorization')?.[0] as string) ??
      (metadata?.get?.('Authorization')?.[0] as string) ??
      '';
    const bearer = typeof authHeader === 'string' ? authHeader : '';
    const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : bearer;

    return this.changePasswordService.execute(data, token);
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

  @GrpcMethod('AuthService', 'GetVendorProfile')
  async getVendorProfile(data: GetVendorProfileRequest, metadata: Metadata): Promise<VendorProfileResponse> {
    const authResult = this.jwtAuthGuard.validateTokenAndUserId(metadata, data.userId);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        profile: null,
      };
    }
    return this.vendorProfileService.getVendorProfile(data);
  }

  @GrpcMethod('AuthService', 'UpdateVendorProfile')
  async updateVendorProfile(
    data: UpdateVendorProfileRequest,
    metadata: Metadata
  ): Promise<VendorProfileResponse> {

    const authResult = this.jwtAuthGuard.validateTokenAndUserId(
      metadata,
      data.userId,
    );

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        profile: null,
      };
    }
    return this.vendorProfileService.updateVendorProfile(data);
  }

  @GrpcMethod('AuthService', 'InitiateVendorVerification')
  async initiateVendorVerification(
    data: InitiateVerificationRequest,
    metadata: Metadata,
  ): Promise<InitiateVerificationResponse> {
    const authResult = this.jwtAuthGuard.validateTokenAndUserId(metadata, data.userId);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        token: null,
        jobId: null,
      };
    }

    return this.vendorVerificationService.initiateVerification(data);
  }

  @GrpcMethod('AuthService', 'SubmitVendorVerification')
  async submitVendorVerification(
    data: SubmitVerificationRequest,
    metadata: Metadata,
  ): Promise<SubmitVerificationResponse> {
    const authResult = this.jwtAuthGuard.validateTokenAndUserId(metadata, data.userId);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        verificationId: null,
      };
    }

    return this.vendorVerificationService.submitVerification(data);
  }

  @GrpcMethod('AuthService', 'GetVendorVerificationStatus')
  async getVendorVerificationStatus(
    data: GetVerificationStatusRequest,
    metadata: Metadata,
  ): Promise<GetVerificationStatusResponse> {
    const authResult = this.jwtAuthGuard.validateTokenAndUserId(metadata, data.userId);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        isThirdPartyVerified: false,
        isKycVerified: false,
        verifications: [],
      };
    }

    return this.vendorVerificationService.getVerificationStatus(data);
  }

  @GrpcMethod('AuthService', 'AdminReviewVendorVerification')
  async adminReviewVendorVerification(
    data: AdminReviewVerificationRequest,
    metadata: Metadata,
  ): Promise<AdminReviewVerificationResponse> {
    // TODO: Add admin role check here
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
      };
    }

    return this.vendorVerificationService.adminReviewVerification(data);
  }


}
