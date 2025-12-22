import { Observable } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';

export interface WalletDto {
  id: string;
  accountNumber: string;
  mainBalance: number;
  ledgerBalance: number;
  currency: string;
  isPinSet: boolean;
  isActive: boolean;
  lastTransactionAt?: string | null;
  createdAt: string;
  accountOwnerType: string; // 'user' or 'vendor'
}

export interface GetWalletRequest {
  // userId comes from JWT in metadata
}

export interface GetWalletResponse {
  success: boolean;
  statusCode: number;
  message: string;
  wallet?: WalletDto | null;
}

export interface CreateWalletRequest {
  // Empty - userId extracted from JWT token in metadata
}

export interface CreateWalletResponse {
  success: boolean;
  statusCode: number;
  message: string;
  wallet?: WalletDto | null;
}

export interface UpdateWalletAccountOwnerTypeRequest {
  accountOwnerType: string;
}

export interface UpdateWalletAccountOwnerTypeResponse {
  success: boolean;
  statusCode: number;
  message: string;
  wallet: WalletDto | null;
}

export interface WalletServiceClient {
  createWallet(
    request: CreateWalletRequest,
    metadata?: Metadata,
  ): Observable<CreateWalletResponse>;

  getWallet(
    request: GetWalletRequest,
    metadata?: Metadata,
  ): Observable<GetWalletResponse>;

  updateWalletAccountOwnerType(
    request: UpdateWalletAccountOwnerTypeRequest,
    metadata?: Metadata,
  ): Observable<UpdateWalletAccountOwnerTypeResponse>;
}