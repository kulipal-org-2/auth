import { CreateRequestContext, EntityManager } from "@mikro-orm/postgresql";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { GetWalletResult } from "../interface/get-wallet.service";
import { Wallet } from "src/database/entities/wallet.entity";

@Injectable()
export class GetWalletService {
    private readonly logger = new Logger(GetWalletService.name);
    constructor(private readonly em: EntityManager) { }

    @CreateRequestContext()
    async execute(userId: string): Promise<GetWalletResult> {
        this.logger.log(`Fetching wallet for user: ${userId}`);
        try {
            const wallet = await this.em.findOne(Wallet, { user: userId }, { populate: ['user'] });
            if (!wallet) {
                this.logger.warn(`Wallet not found for user ${userId}`);
                return {
                    success: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'Wallet not found'
                };
            }

            this.logger.log(`Successfully fetched wallet for user ${userId}`);
            return {
                success: true,
                statusCode: HttpStatus.OK,
                message: 'Wallet fetched successfully',
                wallet: {
                    id: wallet.id,
                    accountNumber: wallet.accountNumber,
                    balance: Number(wallet.balance),
                    currency: wallet.currency,
                    isPinSet: wallet.isPinSet,
                    isActive: wallet.isActive,
                    lastTransactionAt: wallet.lastTransactionAt,
                    createdAt: wallet.createdAt,
                }
            };
        } catch (error: any) {
            this.logger.error(`Error fetching wallet for user ${userId}: ${error.message}`, error.stack);
            return {
                success: false,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to fetch wallet'
            }
        }
    }

    @CreateRequestContext()
    async getByAccountNumber(accountNumber: string): Promise<GetWalletResult> {
        this.logger.log(`Fetching wallet by account number: ${accountNumber}`);

        try {
            const wallet = await this.em.findOne(Wallet, { accountNumber });

            if (!wallet) {
                this.logger.warn(`Wallet with account number ${accountNumber} not found`);
                return {
                    success: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'Wallet not found',
                };
            }

            return {
                success: true,
                statusCode: HttpStatus.OK,
                message: 'Wallet retrieved successfully',
                wallet: {
                    id: wallet.id,
                    accountNumber: wallet.accountNumber,
                    balance: Number(wallet.balance),
                    currency: wallet.currency,
                    isPinSet: wallet.isPinSet,
                    isActive: wallet.isActive,
                    lastTransactionAt: wallet.lastTransactionAt,
                    createdAt: wallet.createdAt,
                },
            };
        } catch (error: any) {
            this.logger.error(
                `Error fetching wallet by account number ${accountNumber}: ${error.message}`,
                error.stack,
            );
            return {
                success: false,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to fetch wallet',
            };
        }
    }
}