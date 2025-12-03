export interface SetWalletPinRequest {
    userId: string;
    pin: string;
}

export interface SetWalletPinResult {
    success: boolean;
    statusCode: number;
    message: string;
}