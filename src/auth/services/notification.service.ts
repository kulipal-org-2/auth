import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { User } from 'src/database/entities/user.entity';
import type { NotificationGrpcService } from '../interfaces/notification-service.interface';
import { OtpChannel } from '../enums/otp.enum';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private notificationClient?: NotificationGrpcService;

  constructor(
    @Inject('NOTIFICATION_PACKAGE')
    private readonly grpcClient: ClientGrpc,
  ) { }

  onModuleInit() {
    this.notificationClient =
      this.grpcClient.getService<NotificationGrpcService>(
        'NotificationService',
      );
  }

  async dispatchOtp({
    otpChannel,
    user,
    token,
    expiresAt,
    validityMinutes,
  }: {
    otpChannel: OtpChannel;
    user: User;
    token: string;
    expiresAt: Date;
    validityMinutes: number;
  }): Promise<void> {
    if (!this.notificationClient) {
      this.logger.error('Notification service client is not available');
      throw new Error('Notification service is unavailable');
    }

    const expiryMinutes = validityMinutes.toString();

    try {
      if (otpChannel === OtpChannel.EMAIL) {
        const username = user.firstName;

        await lastValueFrom(
          this.notificationClient.Email({
            template: 'signup-otp',
            subject: 'Kulipal OTP Verification',
            email: user.email,
            data: {
              username,
              otp: token,
              validityMinutes: expiryMinutes,
              expiresAt: expiresAt.toISOString(),
            },
          }),
        );
        this.logger.log(`OTP email dispatched to ${user.email}`);
        return;
      }

      const smsMessage = `Kulipal OTP: ${token}. This code expires in ${expiryMinutes} minutes.`;

      await lastValueFrom(
        this.notificationClient.Sms({
          phoneNumber: user.phoneNumber,
          message: smsMessage,
          channel: 'generic',
        }),
      );
      this.logger.log(`OTP SMS dispatched to ${user.phoneNumber}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to dispatch OTP via ${otpChannel} for user ${user.id}: ${error?.message ?? error}`,
      );
      // Re-throw the error so the caller can handle it appropriately
      throw error;
    }
  }

  async sendPasswordResetEmail({
    user,
    resetLink,
    expiryMinutes,
  }: {
    user: User;
    resetLink: string;
    expiryMinutes: number;
  }): Promise<void> {
    if (!this.notificationClient) {
      this.logger.error('Notification service client is not available');
      throw new Error('Notification service is unavailable');
    }

    try {
      const username = user.firstName;

      await lastValueFrom(
        this.notificationClient.Email({
          template: 'password-reset-request',
          subject: 'Kulipal Password Reset Request',
          email: user.email,
          data: {
            username,
            link: resetLink,
            validityMinutes: expiryMinutes.toString(),
          },
        }),
      );
      this.logger.log(`Password reset email dispatched to ${user.email}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to dispatch password reset email for user ${user.id}: ${error?.message ?? error}`,
      );
      // Re-throw the error so the caller can handle it appropriately
      throw error;
    }
  }

  async sendWalletPinResetOtp({
    user,
    otp,
    validityMinutes,
  }: {
    user: User;
    otp: string;
    validityMinutes: number;
  }): Promise<void> {
    if (!this.notificationClient) {
      this.logger.error('Notification service client is not available');
      throw new Error('Notification service is unavailable');
    }

    try {
      const username = user.firstName;

      await lastValueFrom(
        this.notificationClient.Email({
          template: 'wallet-pin-reset-otp',
          subject: 'Wallet PIN Reset - OTP Verification',
          email: user.email,
          data: {
            username,
            otp,
            validityMinutes: validityMinutes.toString(),
            currentYear: new Date().getFullYear().toString(),
            supportEmail: process.env.SUPPORT_EMAIL || 'support@kulipal.com',
            appName: 'Kulipal',
          },
        }),
      );
      this.logger.log(`Wallet PIN reset OTP email dispatched to ${user.email}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to dispatch wallet PIN reset OTP email for user ${user.id}: ${error?.message ?? error}`,
        error?.stack,
      );
      throw error;
    }
  }
}
