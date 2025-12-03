import { CreateRequestContext, EntityManager } from "@mikro-orm/postgresql";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import type { ValidateWalletPinRequest, ValidateWalletPinResult } from "../interface/validate-wallet-pin.interface";
import { Wallet } from "src/database/entities/wallet.entity";
import { createHash } from "crypto";

@Injectable()
export class ValidateWalletPinService {
    private readonly logger = new Logger(ValidateWalletPinService.name);

    constructor(private readonly em: EntityManager) { }

    @CreateRequestContext()
    async execute(data: ValidateWalletPinRequest): Promise<ValidateWalletPinResult> {
        const { userId, pin } = data;

        this.logger.log(`Validating wallet PIN for user: ${userId}`);

        try {
            if (!this.isValidPin(pin)) {
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'PIN must be exactly 4 digits',
                    isValid: false,
                };
            }

            const wallet = await this.em.findOne(Wallet, { user: userId });

            if (!wallet) {
                this.logger.warn(`Wallet not found for user ${userId}`);
                return {
                    success: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'Wallet not found',
                    isValid: false,
                };
            }

            if (!wallet.isActive) {
                this.logger.warn(`Wallet is inactive for user ${userId}`);
                return {
                    success: false,
                    statusCode: HttpStatus.FORBIDDEN,
                    message: 'Wallet is inactive',
                    isValid: false,
                };
            }

            if (!wallet.isPinSet) {
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Wallet PIN not set. Please set your PIN first',
                    isValid: false,
                };
            }

            const pinHash = this.hashPin(pin);
            const isValid = wallet.pinHash === pinHash;

            if (!isValid) {
                this.logger.warn(`Invalid PIN attempt for user ${userId}`);
                return {
                    success: true,
                    statusCode: HttpStatus.OK,
                    message: 'Invalid PIN',
                    isValid: false,
                };
            }

            this.logger.log(`Successfully validated PIN for user ${userId}`);

            return {
                success: true,
                statusCode: HttpStatus.OK,
                message: 'PIN is valid',
                isValid: true,
            };
        } catch (error: any) {
            this.logger.error(
                `Error validating wallet PIN for user ${userId}: ${error.message}`,
                error.stack,
            );
            return {
                success: false,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to validate wallet PIN',
                isValid: false,
            };
        }
    }

    private isValidPin(pin: string): boolean {
        return /^\d{4}$/.test(pin);
    }

    private hashPin(pin: string): string {
        return createHash('sha512').update(pin).digest('hex');
    }
}