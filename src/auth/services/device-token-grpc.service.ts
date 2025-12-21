import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { catchError, lastValueFrom, timeout, of } from 'rxjs';
import {
  NotificationServiceClient,
  RegisterDeviceTokenParams,
  RegisterDeviceTokenRequest,
  UnregisterDeviceTokenParams,
  UnregisterDeviceTokenRequest,
  MessageResponse,
} from '../interfaces/device-token-service.interface';

@Injectable()
export class DeviceTokenGrpcService implements OnModuleInit {
  private readonly logger = new Logger(DeviceTokenGrpcService.name);
  private notificationClient?: NotificationServiceClient;

  constructor(
    @Inject('NOTIFICATION_PACKAGE')
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.notificationClient =
      this.grpcClient.getService<NotificationServiceClient>(
        'NotificationService',
      );
  }

  async registerToken(
    params: RegisterDeviceTokenParams,
  ): Promise<MessageResponse> {
    if (!this.notificationClient) {
      this.logger.error('Notification service client is not available');
      return {
        success: false,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Notification service is unavailable',
      };
    }

    try {
      this.logger.log(
        `Registering device token for user ${params.userId}, platform: ${params.platform ?? 'not provided'}`,
      );

      const response = await lastValueFrom(
        this.notificationClient.registerDeviceToken(params).pipe(
          timeout(10000),
          catchError((error: any) => {
            this.logger.error(
              `gRPC call failed for device token registration (user ${params.userId}): ${error?.message ?? error}`,
            );
            return of({
              success: false,
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              message: `Failed to register device token: ${error?.message ?? 'Unknown error'}`,
            });
          }),
        ),
      );

      if (response.success) {
        this.logger.log(
          `Successfully registered device token for user ${params.userId}`,
        );
      } else {
        this.logger.warn(
          `Failed to register device token for user ${params.userId}: ${response.message}`,
        );
      }

      return response;
    } catch (error: any) {
      this.logger.error(
        `Unexpected error during device token registration for user ${params.userId}: ${error?.message ?? error}`,
        error?.stack,
      );
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Failed to register device token: ${error?.message ?? 'Unknown error'}`,
      };
    }
  }

  async unregisterToken(
    params: UnregisterDeviceTokenParams,
  ): Promise<MessageResponse> {
    if (!this.notificationClient) {
      this.logger.error('Notification service client is not available');
      return {
        success: false,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Notification service is unavailable',
      };
    }

    try {
      const { userId, token } = params;
      const request: UnregisterDeviceTokenRequest = {
        userId,
        token,
      };

      this.logger.log(`Unregistering device token for user ${userId}`);

      const response = await lastValueFrom(
        this.notificationClient.unregisterDeviceToken(request).pipe(
          timeout(10000),
          catchError((error: any) => {
            this.logger.error(
              `gRPC call failed for device token unregistration (user ${userId}): ${error?.message ?? error}`,
            );
            return of({
              success: false,
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              message: `Failed to unregister device token: ${error?.message ?? 'Unknown error'}`,
            });
          }),
        ),
      );

      if (response.success) {
        this.logger.log(
          `Successfully unregistered device token for user ${userId}`,
        );
      } else {
        this.logger.warn(
          `Failed to unregister device token for user ${userId}: ${response.message}`,
        );
      }

      return response;
    } catch (error: any) {
      this.logger.error(
        `Unexpected error during device token unregistration for user ${params.userId}: ${error?.message ?? error}`,
        error?.stack,
      );
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Failed to unregister device token: ${error?.message ?? 'Unknown error'}`,
      };
    }
  }
}
