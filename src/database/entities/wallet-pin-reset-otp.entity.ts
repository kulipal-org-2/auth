import { Entity, EntityRepositoryType, Property } from "@mikro-orm/postgresql";
import { CustomBaseEntity } from ".";
import { WalletPinResetOtpRepository } from "../repositories/wallet-pin-reset-otp.repository";

@Entity({ repository: () => WalletPinResetOtpRepository })
export class WalletPinResetOtp extends CustomBaseEntity {
    [EntityRepositoryType]?: WalletPinResetOtpRepository;

    @Property()
    userId!: string;

    @Property({ length: 128 })
    otpHash!: string;

    @Property()
    expiresAt!: Date;

    @Property({ default: false })
    isUsed!: boolean;

    @Property({ nullable: true })
    usedAt?: Date;
}
