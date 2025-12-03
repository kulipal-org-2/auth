import { CreateRequestContext, EntityManager } from "@mikro-orm/postgresql";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import type { ResetPinRequest, ResetPinResult } from "../interface/reset-pin.interface";
import { WalletPinResetOtp } from "src/database/entities/wallet-pin-reset-otp.entity";
import { Wallet } from "src/database/entities/wallet.entity";
import { createHash } from "crypto";

@Injectable()
export class ResetPinService {
  private readonly logger = new Logger(ResetPinService.name);

  constructor(private readonly em: EntityManager) {}

  @CreateRequestContext()
  async execute(data: ResetPinRequest): Promise<ResetPinResult> {
    const { userId, otp, newPin } = data;

    this.logger.log(`Resetting wallet PIN for user: ${userId}`);

    try {
      if (!this.isValidPin(newPin)) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'PIN must be exactly 4 digits',
        };
      }

      if (!this.isValidOtp(otp)) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'OTP must be exactly 6 digits',
        };
      }

      if (newPin === '0000') {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Cannot use default PIN. Please choose a different PIN',
        };
      }

      const otpHash = this.hashOtp(otp);
      const otpRecord = await this.em.findOne(WalletPinResetOtp, {
        userId,
        otpHash,
        isUsed: false,
      });

      if (!otpRecord) {
        this.logger.warn(`Invalid or already used OTP for user ${userId}`);
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid or expired OTP',
        };
      }

      if (otpRecord.expiresAt < new Date()) {
        this.logger.warn(`Expired OTP used for user ${userId}`);
        // Mark as used to prevent reuse
        this.em.assign(otpRecord, {
          isUsed: true,
          usedAt: new Date(),
        });
        await this.em.flush();

        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'OTP has expired. Please request a new one',
        };
      }

      // Find wallet
      const wallet = await this.em.findOne(Wallet, { user: userId });

      if (!wallet) {
        this.logger.warn(`Wallet not found for user ${userId}`);
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Wallet not found',
        };
      }

      const newPinHash = this.hashPin(newPin);
      this.em.assign(wallet, {
        pinHash: newPinHash,
        isPinSet: true, // Ensure PIN is marked as set
      });

      // Mark OTP as used
      this.em.assign(otpRecord, {
        isUsed: true,
        usedAt: new Date(),
      });

      await this.em.flush();

      this.logger.log(`Successfully reset wallet PIN for user ${userId}`);

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'Wallet PIN reset successfully',
      };
    } catch (error: any) {
      this.logger.error(
        `Error resetting wallet PIN for user ${userId}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to reset wallet PIN',
      };
    }
  }

  private isValidPin(pin: string): boolean {
    return /^\d{4}$/.test(pin);
  }

  private isValidOtp(otp: string): boolean {
    return /^\d{6}$/.test(otp);
  }

  private hashOtp(otp: string): string {
    return createHash('sha512').update(otp).digest('hex');
  }

  private hashPin(pin: string): string {
    return createHash('sha512').update(pin).digest('hex');
  }
}