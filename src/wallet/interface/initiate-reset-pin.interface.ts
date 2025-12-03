export interface InitiateResetPinRequest {
  userId: string;
  password: string;
}

export interface InitiateResetPinResult {
  success: boolean;
  statusCode: number;
  message: string;
}
