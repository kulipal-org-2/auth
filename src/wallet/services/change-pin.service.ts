import { CreateRequestContext, EntityManager } from "@mikro-orm/postgresql";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import type { ChangePinRequest, ChangePinResult } from "../interface/change-pin.interface";
import { Wallet } from "src/database/entities/wallet.entity";
import { createHash } from "crypto";

@Injectable()
export class ChangePinService {
    private readonly logger = new Logger(ChangePinService.name);

    constructor(private readonly em: EntityManager) { }

    @CreateRequestContext()
    async execute(data: ChangePinRequest): Promise<ChangePinResult> {
        const { userId, oldPin, newPin } = data;

        this.logger.log(`Changing wallet PIN for user: ${userId}`);

        try {
            if (!this.isValidPin(oldPin) || !this.isValidPin(newPin)) {
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'PIN must be exactly 4 digits',
                };
            }

            if (oldPin === newPin) {
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'New PIN must be different from old PIN',
                };
            }

            const wallet = await this.em.findOne(Wallet, { user: userId });

            if (!wallet) {
                this.logger.warn(`Wallet not found for user ${userId}`);
                return {
                    success: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'Wallet not found',
                };
            }

            if (!wallet.isPinSet) {
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Please set your PIN first before changing it',
                };
            }

            // Verify old PIN
            const oldPinHash = this.hashPin(oldPin);
            if (wallet.pinHash !== oldPinHash) {
                this.logger.warn(`Incorrect old PIN provided for user ${userId}`);
                return {
                    success: false,
                    statusCode: HttpStatus.UNAUTHORIZED,
                    message: 'Incorrect old PIN',
                };
            }

            if (newPin === '0000') {
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Cannot use default PIN. Please choose a different PIN',
                };
            }

            const newPinHash = this.hashPin(newPin);
            this.em.assign(wallet, {
                pinHash: newPinHash,
            });

            await this.em.flush();

            this.logger.log(`Successfully changed wallet PIN for user ${userId}`);

            return {
                success: true,
                statusCode: HttpStatus.OK,
                message: 'Wallet PIN changed successfully',
            };
        } catch (error: any) {
            this.logger.error(
                `Error changing wallet PIN for user ${userId}: ${error.message}`,
                error.stack,
            );
            return {
                success: false,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to change wallet PIN',
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
