import { Entity, EntityRepositoryType, ManyToOne, Property, Unique } from "@mikro-orm/postgresql";
import { CustomBaseEntity } from "./base.entity";
import { User } from "./user.entity";
import { WalletRepository } from "../repositories/wallet.repository";

@Entity({ repository: () => WalletRepository })
export class Wallet extends CustomBaseEntity {
    [EntityRepositoryType]?: WalletRepository;

    @ManyToOne(() => User, { unique: true })
    user!: User;

    @Property({ unique: true, length: 10 })
    accountNumber!: string;

    @Property({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    balance!: number;

    @Property({ length: 128 })
    pinHash!: string;

    @Property({ default: false })
    isPinSet!: boolean;

    @Property({ default: 'NGN', length: 3 })
    currency!: string;

    @Property({ default: true })
    isActive!: boolean;

    @Property({ nullable: true })
    lastTransactionAt?: Date;
}