export interface ResetPinRequest {
  userId: string;
  otp: string;
  newPin: string;
}

export interface ResetPinResult {
  success: boolean;
  statusCode: number;
  message: string;
}