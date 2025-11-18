import type { UserType } from 'src/database/entities/user.entity';

export type RegisterRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
  source?: string;
  phoneNumber: string;
  userType: UserType;
};

export type RegisteredUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userType: UserType;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  source?: string;
};

export type RefreshTokenRequest = {
  userId: string;
  refreshToken: string;
};

export type LoginCredentials = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = {
  message: string;
  credentials: LoginCredentials;
  statusCode: number;
  success: boolean;
  user: RegisteredUser | null;
};

export type RegisterResponse = {
  message: string;
  statusCode: number;
  success: boolean;
  user: RegisteredUser | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginGoogleRequest = {
  accessToken: string;
  refreshToken: string;
};

export type LoginAppleRequest = {
  code: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type ValidateTokenRequest = {
  token: string;
  email: string;
};

export type SendEmailOtpRequest = {
  email: string;
};

export type SendSmsOtpRequest = {
  phoneNumber: string;
};

export type ValidateEmailOtpRequest = {
  email: string;
  token: string;
};

export type ValidateSmsOtpRequest = {
  phoneNumber: string;
  token: string;
};

export type ValidateOtpRequest = {
  email?: string;
  phoneNumber?: string;
  token: string;
};

export type ValidateOtpResponse = {
  message: string;
  statusCode: number;
  success: boolean;
  isValid: boolean;
  accessToken: string | null;
  userId: string | null;
  userType: UserType | null;
};

export type ValidateTokenResponse = {
  message: string;
  statusCode: number;
  success: boolean;
  isValid: boolean;
};

export type ResetPasswordRequest = {
  token: string;
  email: string;
  newPassword: string;
};

export type MessageResponse = {
  message: string;
  statusCode: number;
  success: boolean;
};
