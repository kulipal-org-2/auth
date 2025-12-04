import { CreateRequestContext, EntityManager } from "@mikro-orm/postgresql";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import type { InitiateResetPinRequest, InitiateResetPinResult } from "../interface/initiate-reset-pin.interface";
import { User } from "src/database";
import { verify } from "argon2";
import { Wallet } from "src/database/entities/wallet.entity";
import { WalletPinResetOtp } from "src/database/entities/wallet-pin-reset-otp.entity";
import { createHash, randomInt } from "crypto";
import { NotificationService } from "src/auth/services/notification.service"; // Import the service

@Injectable()
export class InitiateResetPinService {
    private readonly logger = new Logger(InitiateResetPinService.name);
    private readonly OTP_VALIDITY_MINUTES = 15;
    private readonly MAX_ATTEMPTS_PER_5_MIN = 3;

    constructor(
        private readonly em: EntityManager,
        private readonly notificationService: NotificationService, // Inject NotificationService
    ) { }

    @CreateRequestContext()
    async execute(data: InitiateResetPinRequest): Promise<InitiateResetPinResult> {
        const { userId, password } = data;

        this.logger.log(`Initiating PIN reset for user: ${userId}`);

        try {
            // Rate limiting check
            const recentAttempts = await this.em.count(WalletPinResetOtp, {
                userId,
                createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
            });

            if (recentAttempts >= this.MAX_ATTEMPTS_PER_5_MIN) {
                this.logger.warn(`Rate limit exceeded for PIN reset for user ${userId}`);
                return {
                    success: false,
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: 'Too many attempts. Please try again in 5 minutes',
                };
            }

            const user = await this.em.findOne(User, { id: userId });

            if (!user) {
                this.logger.warn(`User with id ${userId} not found`);
                return {
                    success: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'User not found',
                };
            }

            // Check if email is verified
            if (!user.isEmailVerified) {
                this.logger.warn(`User ${userId} email is not verified`);
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Please verify your email address before resetting wallet PIN',
                };
            }

            if (!user.password) {
                this.logger.warn(
                    `User ${userId} has no password (OAuth user attempting PIN reset)`,
                );
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Password verification not available for OAuth users',
                };
            }

            const isPasswordValid = await verify(user.password, password);
            if (!isPasswordValid) {
                this.logger.warn(`Incorrect password provided for user ${userId}`);
                return {
                    success: false,
                    statusCode: HttpStatus.UNAUTHORIZED,
                    message: 'Incorrect password',
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

            // Check if wallet is active
            if (!wallet.isActive) {
                this.logger.warn(`Wallet is inactive for user ${userId}`);
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Wallet is inactive. Please contact support',
                };
            }

            // Check if PIN is set (can't reset if not set)
            if (!wallet.isPinSet) {
                this.logger.warn(`Attempting to reset PIN for wallet that has no PIN set for user ${userId}`);
                return {
                    success: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'Wallet PIN is not set. Please set your PIN first',
                };
            }

            // Invalidate any existing OTPs for this user
            await this.invalidateExistingOtps(userId);

            const otp = this.generateOtp();
            const otpHash = this.hashOtp(otp);

            // Calculate expiry time
            const expiresAt = new Date(
                Date.now() + this.OTP_VALIDITY_MINUTES * 60 * 1000,
            );

            const otpRecord = this.em.create(WalletPinResetOtp, {
                userId,
                otpHash,
                expiresAt,
                isUsed: false,
            });

            await this.em.persistAndFlush(otpRecord);

            // Send OTP via email using NotificationService
            await this.notificationService.sendWalletPinResetOtp({
                user,
                otp,
                validityMinutes: this.OTP_VALIDITY_MINUTES,
            });

            this.logger.log(
                `Successfully initiated PIN reset for user ${userId}. OTP sent to ${user.email}`,
            );

            return {
                success: true,
                statusCode: HttpStatus.OK,
                message: `OTP has been sent to your email. It will expire in ${this.OTP_VALIDITY_MINUTES} minutes`,
            };
        } catch (error: any) {
            this.logger.error(
                `Error initiating PIN reset for user ${userId}: ${error.message}`,
                error.stack,
            );
            return {
                success: false,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to initiate PIN reset. Please try again later',
            };
        }
    }

    private async invalidateExistingOtps(userId: string): Promise<void> {
        await this.em.nativeUpdate(
            WalletPinResetOtp,
            { userId, isUsed: false },
            { isUsed: true, usedAt: new Date() },
        );
    }

    private generateOtp(): string {
        return randomInt(100000, 999999).toString();
    }

    private hashOtp(otp: string): string {
        return createHash('sha512').update(otp).digest('hex');
    }
}