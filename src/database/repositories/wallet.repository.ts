import { EntityRepository } from "@mikro-orm/postgresql";
import { Wallet } from "../entities/wallet.entity";

export class WalletRepository extends EntityRepository<Wallet> {
    async findByUserId(userId: string): Promise<Wallet | null> {
        return this.findOne({ user: userId });
    }

    async findByAccountNumber(accountNumber: string): Promise<Wallet | null> {
        return this.findOne({ accountNumber });
    }

    async generateUniqueAccountNumber(): Promise<string> {
        let accountNumber: string;
        let exists: boolean;

        do {
            accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            exists = (await this.count({ accountNumber })) > 0;
        } while (exists);
        return accountNumber;
    }
}