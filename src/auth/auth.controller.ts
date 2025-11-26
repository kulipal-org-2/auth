// src/auth/auth.controller.ts
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BusinessProfileService } from './services/business-profile.service';
import type { BusinessProfileResponse, BusinessProfilesResponse, CreateBusinessProfileRequest, GetBusinessProfileRequest, GetUserBusinessProfilesRequest, SearchBusinessProfilesRequest, SearchBusinessProfilesResponse, UpdateBusinessProfileRequest } from './types/business-profile.type';
import { VerificationOrchestratorService } from 'src/smile-identity/services/verification-orchestrator.service';
import { BusinessVerificationService } from 'src/smile-identity/services/kyb/business-verification.service';

interface InitiateIdentityVerificationRequest {
  verificationType: 'KYC' | 'KYB';
  businessProfileId?: string;
  kycData?: {
    idType: string;
    idNumber: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
  };
  kybData?: {
    registrationNumber: string;
    businessType: string;
    businessName?: string;
  };
}

interface IdentityVerificationResponse {
  message: string;
  statusCode: number;
  success: boolean;
  alreadyVerified: boolean;
  verificationType?: string;
  smileJobId?: string;
}

interface GetUserVerificationStatusRequest {
  // userId will be extracted from auth token
}

interface GetUserVerificationStatusResponse {
  message: string;
  statusCode: number;
  success: boolean;
  isIdentityVerified: boolean;
  identityVerificationType?: string;
  identityVerifiedAt?: string;
  lastVerificationId?: string;
}

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
    private readonly businessProfileService: BusinessProfileService,
    private readonly verificationOrchestratorService: VerificationOrchestratorService,
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly businessVerificationService: BusinessVerificationService,
    // Remove EntityManager injection
    // private readonly em: EntityManager,
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

  @GrpcMethod('AuthService', 'CreateBusinessProfile')
  async createBusinessProfile(
    data: CreateBusinessProfileRequest,
    metadata: Metadata
  ): Promise<BusinessProfileResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        profile: null,
      };
    }

    // Just call the service - the service will handle the user verification status
    return await this.businessProfileService.createBusinessProfile(authResult.userId, data);
  }

  @GrpcMethod('AuthService', 'UpdateBusinessProfile')
  async updateBusinessProfile(
    data: UpdateBusinessProfileRequest,
    metadata: Metadata
  ): Promise<BusinessProfileResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        profile: null,
      };
    }

    return this.businessProfileService.updateBusinessProfile(authResult.userId, data);
  }

  @GrpcMethod('AuthService', 'GetBusinessProfile')
  async getBusinessProfile(
    data: GetBusinessProfileRequest,
    metadata: Metadata
  ): Promise<BusinessProfileResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        profile: null,
      };
    }

    return this.businessProfileService.getBusinessProfile(
      data,
      authResult.userId
    );
  }

  @GrpcMethod('AuthService', 'GetUserBusinessProfiles')
  async getUserBusinessProfiles(
    data: GetUserBusinessProfilesRequest,
    metadata: Metadata
  ): Promise<BusinessProfilesResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        profiles: [],
        total: 0,
      };
    }

    return this.businessProfileService.getUserBusinessProfiles(authResult.userId);
  }

  @GrpcMethod('AuthService', 'SearchBusinessProfiles')
  async searchBusinessProfiles(
    data: SearchBusinessProfilesRequest,
    metadata: Metadata,
  ): Promise<SearchBusinessProfilesResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        profiles: [],
        total: 0,
      };
    }
    return this.businessProfileService.searchBusinessProfiles(data, authResult.userId);
  }

  // NEW: Identity Verification Methods
  @GrpcMethod('AuthService', 'InitiateIdentityVerification')
  async initiateIdentityVerification(
    data: InitiateIdentityVerificationRequest,
    metadata: Metadata,
  ): Promise<IdentityVerificationResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        alreadyVerified: false,
      };
    }

    try {
      let verificationData;
      if (data.verificationType === 'KYC' && data.kycData) {
        verificationData = data.kycData;
      } else if (data.verificationType === 'KYB' && data.kybData) {
        verificationData = data.kybData;
      } else {
        return {
          message: 'Invalid verification data',
          statusCode: 400,
          success: false,
          alreadyVerified: false,
        };
      }

      const result = await this.verificationOrchestratorService.initiateVerification(
        authResult.userId,
        data.verificationType,
        verificationData,
        data.businessProfileId,
      );

      return {
        message: result.message,
        statusCode: result.success ? 200 : 400,
        success: result.success,
        alreadyVerified: result.skipVerification || false,
        verificationType: data.verificationType,
        smileJobId: result.smileJobId,
      };
    } catch (error: any) {
      return {
        message: error.message || 'Verification initiation failed',
        statusCode: 500,
        success: false,
        alreadyVerified: false,
      };
    }
  }

  @GrpcMethod('AuthService', 'GetUserVerificationStatus')
  async getUserVerificationStatus(
    data: GetUserVerificationStatusRequest,
    metadata: Metadata,
  ): Promise<GetUserVerificationStatusResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        isIdentityVerified: false,
      };
    }

    try {
      const status = await this.verificationOrchestratorService.getUserVerificationStatus(authResult.userId);

      return {
        message: 'Verification status retrieved successfully',
        statusCode: 200,
        success: true,
        isIdentityVerified: status.isIdentityVerified,
        identityVerificationType: status.identityVerificationType,
        identityVerifiedAt: status.identityVerifiedAt?.toISOString(),
        lastVerificationId: status.lastVerificationId,
      };
    } catch (error: any) {
      return {
        message: error.message || 'Failed to get verification status',
        statusCode: 500,
        success: false,
        isIdentityVerified: false,
      };
    }
  }
}