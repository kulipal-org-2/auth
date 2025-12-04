export interface ValidateWalletPinRequest {
  userId: string;
  pin: string;
}

export interface ValidateWalletPinResult {
  success: boolean;
  statusCode: number;
  message: string;
  isValid: boolean;
}