import { EntityRepository } from "@mikro-orm/postgresql";
import { WalletPinResetOtp } from "../entities/wallet-pin-reset-otp.entity";

export class WalletPinResetOtpRepository extends EntityRepository<WalletPinResetOtp> {
    async findValidOtp(userId: string, otpHash: string): Promise<WalletPinResetOtp | null> {
        return this.findOne({
            userId,
            otpHash,
            isUsed: false,
            expiresAt: { $gt: new Date() },
        });
    }

    async invalidateUserOtps(userId: string): Promise<void> {
        await this.nativeUpdate(
            { userId, isUsed: false },
            { isUsed: true, usedAt: new Date() }
        );
    }

    async cleanupExpiredOtps(): Promise<number> {
        const result = await this.nativeDelete({
            expiresAt: { $lt: new Date() },
        });
        return result;
    }
}