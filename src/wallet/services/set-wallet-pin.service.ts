import { CreateRequestContext, EntityManager } from "@mikro-orm/postgresql";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import type { SetWalletPinRequest, SetWalletPinResult } from "../interface/set-wallet-pin.interface";
import { createHash } from "crypto";
import { Wallet } from "src/database/entities/wallet.entity";

@Injectable()
export class SetWalletPinService {
    private readonly logger = new Logger(SetWalletPinService.name);
    constructor(private readonly em: EntityManager) { }

    @CreateRequestContext()
    async execute(data: SetWalletPinRequest): Promise<SetWalletPinResult> {
        const { userId, pin } = data;
        this.logger.log(`Setting wallet PIN for user: ${userId}`);
        try {
            if (!this.isValidPin(pin)) {
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'PIN must be exactly 4-digits'
                }
            }

            const wallet = await this.em.findOne(Wallet, { user: userId });

            if (!wallet) {
                this.logger.warn(`Wallet not found for user ${userId}`);
                return {
                    success: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'Wallet not found'
                }
            }

            if (wallet.isPinSet) {
                this.logger.warn(`Attempted to set PIN for user ${userId} but PIN is alraedy set`);
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'PIN is alraedy set. Use change PIN instead',
                }
            }

            if (pin === '0000') {
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Cannot use default PIN. Please choose a different PIN',
                }
            }

            const pinHash = this.hashPin(pin);
            this.em.assign(wallet, {
                pinHash,
                isPinSet: true,
            });

            await this.em.flush();
            this.logger.log(`Successfully set wallet PIN for user ${userId}`);

            return {
                success: true,
                statusCode: HttpStatus.OK,
                message: 'Wallet PIN set successfully',
            };
        } catch (error: any) {
            this.logger.error(
                `Error setting wallet PIN for user ${userId}: ${error.message}`,
                error.stack,
            );
            return {
                success: false,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to set wallet PIN',
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