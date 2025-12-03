export interface WalletDto {
  id: string;
  accountNumber: string;
  balance: number;
  currency: string;
  isPinSet: boolean;
  isActive: boolean;
  lastTransactionAt?: Date;
  createdAt?: Date;
}

export interface CreateWalletRequest {
  // userId extracted from JWT token
}

export interface CreateWalletResponse {
  success: boolean;
  statusCode: number;
  message: string;
  wallet: WalletDto | null;
}

export interface GetWalletRequest {
  // userId extracted from JWT token
}

export interface GetWalletResponse {
  success: boolean;
  statusCode: number;
  message: string;
  wallet: WalletDto | null;
}

export interface GetWalletByAccountNumberRequest {
  accountNumber: string;
}

export interface SetWalletPinRequest {
  pin: string;
}

export interface SetWalletPinResponse {
  success: boolean;
  statusCode: number;
  message: string;
}


export interface ChangePinRequest {
  oldPin: string;
  newPin: string;
}

export interface ChangePinResponse {
  success: boolean;
  statusCode: number;
  message: string;
}

export interface InitiateResetPinRequest {
  password: string;
}

export interface InitiateResetPinResponse {
  success: boolean;
  statusCode: number;
  message: string;
}


export interface ResetPinRequest {
  otp: string;
  newPin: string;
}

export interface ResetPinResponse {
  success: boolean;
  statusCode: number;
  message: string;
}


export interface ValidateWalletPinRequest {
  pin: string;
}

export interface ValidateWalletPinResponse {
  success: boolean;
  statusCode: number;
  message: string;
  isValid: boolean;
}