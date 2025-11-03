export type RegisterRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
  source?: string;
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

export type ValidateTokenRequest = {
  token: string;
  email: string;
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
