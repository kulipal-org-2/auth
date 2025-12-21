import { Observable } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import { Platform } from '../types/auth.type';

export interface RegisterDeviceTokenRequest {
  userId: string;
  token: string;
  platform?: Platform; // 'ios' | 'android' - optional
}

// Alias for consistency - same as RegisterDeviceTokenRequest
export type RegisterDeviceTokenParams = RegisterDeviceTokenRequest;

export interface UnregisterDeviceTokenRequest {
  userId: string;
  token: string;
}

export interface UnregisterDeviceTokenParams {
  userId: string;
  token: string;
}

export interface MessageResponse {
  success: boolean;
  statusCode: number;
  message: string;
}

export interface NotificationServiceClient {
  registerDeviceToken(
    request: RegisterDeviceTokenRequest,
    metadata?: Metadata,
  ): Observable<MessageResponse>;

  unregisterDeviceToken(
    request: UnregisterDeviceTokenRequest,
    metadata?: Metadata,
  ): Observable<MessageResponse>;
}
