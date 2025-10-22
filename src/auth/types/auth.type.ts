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
