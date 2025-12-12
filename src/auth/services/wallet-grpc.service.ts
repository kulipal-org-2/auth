import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  CreateWalletRequest,
  CreateWalletResponse,
  GetWalletRequest,
  GetWalletResponse,
  WalletServiceClient,
  WalletDto,
} from '../interfaces/wallet-service.interface';
import type { ClientGrpc } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { Metadata } from '@grpc/grpc-js';
import { catchError, lastValueFrom, timeout, of, Observable } from 'rxjs';

@Injectable()
export class WalletGrpcService implements OnModuleInit {
  private readonly logger = new Logger(WalletGrpcService.name);
  private walletClient?: WalletServiceClient;

  constructor(
    @Inject('WALLET_PACKAGE')
    private readonly grpcClient: ClientGrpc,
    private readonly jwtService: JwtService,
  ) { }

  onModuleInit() {
    this.walletClient =
      this.grpcClient.getService<WalletServiceClient>('WalletService');
  }

  async createWallet(userId: string): Promise<CreateWalletResponse> {
    if (!this.walletClient) {
      this.logger.error('Wallet service client is not available');
      return {
        success: false,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Wallet service is unavailable',
        wallet: null,
      };
    }

    try {
      const token = this.jwtService.sign({ userId });

      const metadata = new Metadata();
      metadata.set('authorization', `Bearer ${token}`);

      const request: CreateWalletRequest = {};

      this.logger.log(`Initiating wallet creation for user ${userId} via gRPC`);

      const response = await lastValueFrom(
        this.walletClient.createWallet(request, metadata).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(
              `gRPC call failed for wallet creation (user ${userId}): ${error?.message ?? error} `,
              error.stack,
            );
            return of({
              success: false,
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              message: `gRPC communication failed: ${error?.messgae ?? '  Unknown error'} `,
              wallet: null,
            } as CreateWalletResponse);
          }),
        ),
      );

      if (response.success) {
        this.logger.log(
          `Successfully created wallet with account number ${response.wallet?.accountNumber} for user ${userId}`,
        );
      } else {
        this.logger.warn(
          `Wallet creation failed for user ${userId}: ${response.message} (Status: ${response.statusCode})`,
        );
      }

      return response;
    } catch (error: any) {
      this.logger.error(
        `Unexpected error during wallet creation for user ${userId}: ${error?.message ?? error}`,
        error?.stack,
      );

      return {
        success: false,
        statusCode: 500,
        message: `Unexpected error: ${error?.message ?? 'Unknown error'}`,
        wallet: null,
      };
    }
  }

  async getWallet(userId: string): Promise<GetWalletResponse> {
    if (!this.walletClient) {
      this.logger.error('Wallet service client is not available');
      return {
        success: false,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Wallet service is unavailable',
        wallet: null,
      };
    }

    try {
      const token = this.jwtService.sign({ userId });

      const metadata = new Metadata();
      metadata.set('authorization', `Bearer ${token}`);

      const request: GetWalletRequest = {};

      this.logger.log(`Fetching wallet for user ${userId} via gRPC`);

      const response = await lastValueFrom(
        this.walletClient.getWallet(request, metadata).pipe(
          timeout(5000),
          catchError((error) => {
            this.logger.error(
              `gRPC call failed for wallet fetch (user ${userId}): ${error?.message ?? error}`,
              error?.stack,
            );
            return of({
              success: false,
              statusCode: 500,
              message: `gRPC communication failed: ${error?.message ?? 'Unknown error'}`,
              wallet: null,
            } as GetWalletResponse);
          }),
        ),
      );

      if (response.success) {
        this.logger.log(`Successfully fetched wallet for user ${userId}`);
      } else {
        this.logger.warn(
          `Wallet fetch failed for user ${userId}: ${response.message} (Status: ${response.statusCode})`,
        );
      }

      return response;
    } catch (error: any) {
      this.logger.error(
        `Unexpected error fetching wallet for user ${userId}: ${error?.message ?? error}`,
        error?.stack,
      );

      return {
        success: false,
        statusCode: 500,
        message: `Unexpected error: ${error?.message ?? 'Unknown error'}`,
        wallet: null,
      };
    }
  }

  /**
   * Maps wallet DTO from gRPC response to RegisteredUser wallet format
   * @param walletDto - Wallet DTO from gRPC response
   * @returns Mapped wallet object for RegisteredUser, or undefined if wallet is null
   */
  mapWalletToUserFormat(
    walletDto: WalletDto | null | undefined,
  ): WalletDto | undefined {
    if (!walletDto) {
      return undefined;
    }

    // For backward compatibility, calculate total balance as mainBalance + ledgerBalance
    const totalBalance = (walletDto.mainBalance || 0) + (walletDto.ledgerBalance || 0);

    // Map to the new structure, but also include balance for backward compatibility
    const mappedWallet: WalletDto & { balance?: number } = {
      id: walletDto.id,
      accountNumber: walletDto.accountNumber,
      mainBalance: walletDto.mainBalance || 0,
      ledgerBalance: walletDto.ledgerBalance || 0,
      currency: walletDto.currency,
      isPinSet: walletDto.isPinSet,
      isActive: walletDto.isActive,
      lastTransactionAt: walletDto.lastTransactionAt ?? null,
      createdAt: walletDto.createdAt,
      accountOwnerType: walletDto.accountOwnerType,
      // Include balance for backward compatibility with existing clients
      balance: totalBalance
    };

    return mappedWallet;
  }
}