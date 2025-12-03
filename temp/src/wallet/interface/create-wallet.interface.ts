export interface CreateWalletResult {
  success: boolean;
  statusCode: number;
  message: string;
  wallet: {
    id: string;
    accountNumber: string;
    balance: number;
    currency: string;
    isPinSet: boolean;
    isActive: boolean; // ADD THIS
    lastTransactionAt?: Date; // ADD THIS
    createdAt?: Date; // ADD THIS
  } | null;
}