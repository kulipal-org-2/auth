import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  type RegisterRequest,
  type LoginRequest,
  type LoginGoogleRequest,
  type LoginAppleRequest,
} from './types/auth.type';
import { LoginService } from './services/login.service';
import { RefreshAccessTokenService } from './services/refresh-token.service';
import { RegisterService } from './services/register.service';
import { LoginResponse, MessageResponse } from 'kulipal-shared';
import { OauthService } from './services/oauth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginService: LoginService,
    private readonly refreshToken: RefreshAccessTokenService,
    private readonly registerService: RegisterService,
    private readonly oauthService: OauthService,
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
  register(data: RegisterRequest): Promise<MessageResponse> {
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
}
