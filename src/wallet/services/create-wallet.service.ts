import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { CreateWalletResult } from '../interface/create-wallet.interface';
import { User } from 'src/database';
import { Wallet } from 'src/database/entities/wallet.entity';
import { createHash } from 'crypto';

@Injectable()
export class CreateWalletService {
  private readonly logger = new Logger(CreateWalletService.name);
  private readonly DEFAULT_PIN = '0000';
  constructor(private readonly em: EntityManager) { }

  @CreateRequestContext()
  async execute(userId: string): Promise<CreateWalletResult> {
    this.logger.log(`Creating wallet for user:${userId}`);

    try {
      const user = await this.em.findOne(User, { id: userId });
      if (!user) {
        this.logger.warn(`User with id ${userId} not found`);
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User not found',
          wallet: null,
        };
      }

      const existingWallet = await this.em.findOne(Wallet, { user: userId });
      if (existingWallet) {
        this.logger.warn(`Wallet already exists for user ${userId}`);
        return {
          success: false,
          statusCode: HttpStatus.CONFLICT,
          message: 'Wallet alraedy exists for this user',
          wallet: {
            id: existingWallet.id,
            accountNumber: existingWallet.accountNumber,
            balance: Number(existingWallet.balance),
            currency: existingWallet.currency,
            isPinSet: existingWallet.isPinSet,
            isActive: existingWallet.isActive, 
            lastTransactionAt: existingWallet.lastTransactionAt, 
            createdAt: existingWallet.createdAt,
          }
        }
      }

      const accountNumber = await this.generateUniqueAccountNumber();
      const pinHash = this.hashPin(this.DEFAULT_PIN);

      const wallet = this.em.create(Wallet, {
        user,
        accountNumber,
        balance: 0,
        pinHash,
        isPinSet: false,
        currency: 'NGN',
        isActive: true
      });

      await this.em.persistAndFlush(wallet);
      this.logger.log(`Successfully created wallet with account number ${accountNumber} for user ${userId}`);
      return {
        success: true,
        statusCode: HttpStatus.CREATED,
        message: 'Wallet created successfully',
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
      this.logger.error(`Error creating wallet for user ${userId}: ${error.message}`, error.stack);
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create wallet',
        wallet: null,
      }
    }
  }

  private async generateUniqueAccountNumber(): Promise<string> {
    let accountNumber: string;
    let exists: boolean;

    do {
      accountNumber = Math.floor(
        1000000000 + Math.random() * 9000000000,
      ).toString();
      exists = (await this.em.count(Wallet, { accountNumber })) > 0;
    } while (exists);

    return accountNumber;
  }

  private hashPin(pin: string): string {
    return createHash('sha512').update(pin).digest('hex');
  }
}
