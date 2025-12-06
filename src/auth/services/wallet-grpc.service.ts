import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { CreateWalletRequest, CreateWalletResponse, GetWalletRequest, GetWalletResponse, WalletServiceClient } from "../interfaces/wallet-service.interface";
import type { ClientGrpc } from "@nestjs/microservices";
import { JwtService } from "@nestjs/jwt";
import { Metadata } from '@grpc/grpc-js';
import { catchError, lastValueFrom, timeout, of, Observable } from "rxjs";




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
        this.walletClient = this.grpcClient.getService<WalletServiceClient>('WalletService');
    }

    async createWallet(userId: string): Promise<CreateWalletResponse> {
        if (!this.walletClient) {
            this.logger.error('Wallet service client is not available');
            return {
                success: false,
                statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                message: 'Wallet service is unavailable',
                wallet: null,
            }
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
                        this.logger.error(`gRPC call failed for wallet creation (user ${userId}): ${error?.message ?? error} `, error.stack);
                        return of({
                            success: false,
                            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                            message: `gRPC communication failed: ${error?.messgae ?? '  Unknown error'} `,
                            wallet: null
                        } as CreateWalletResponse);
                    }),

                )
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
            // Generate JWT token with user ID for authentication
            const token = this.jwtService.sign({ userId });

            // Create metadata with JWT token
            const metadata = new Metadata();
            metadata.set('authorization', `Bearer ${token}`);

            // Prepare empty request (userId comes from JWT in metadata)
            const request: GetWalletRequest = {};

            this.logger.log(`Fetching wallet for user ${userId} via gRPC`);

            // Make gRPC call with 5-second timeout
            const response = await lastValueFrom(
                this.walletClient.getWallet(request, metadata).pipe(
                    timeout(5000), // 5 seconds timeout
                    catchError((error) => {
                        this.logger.error(
                            `gRPC call failed for wallet fetch (user ${userId}): ${error?.message ?? error}`,
                            error?.stack,
                        );
                        // Return a failed response instead of throwing
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
                this.logger.log(
                    `Successfully fetched wallet for user ${userId}`,
                );
            } else {
                this.logger.warn(
                    `Wallet fetch failed for user ${userId}: ${response.message} (Status: ${response.statusCode})`,
                );
            }

            return response;
        } catch (error: any) {
            // Catch any unexpected errors
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
}