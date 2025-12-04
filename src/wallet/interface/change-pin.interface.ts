export interface ChangePinRequest {
    userId: string;
    oldPin: string;
    newPin: string;
}

export interface ChangePinResult {
    success: boolean;
    statusCode: number;
    message: string;
}
