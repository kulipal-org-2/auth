export interface GetWalletResult {
    success: boolean;
    statusCode: number;
    message: string;
    wallet?: {
        id: string;
        accountNumber: string;
        balance: number;
        currency: string;
        isPinSet: boolean;
        isActive: boolean;
        lastTransactionAt?: Date;
        createdAt?: Date;
    }
};