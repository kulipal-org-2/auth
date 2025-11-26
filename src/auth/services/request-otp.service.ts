import { EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { addMinutes } from 'date-fns';
import * as otpGenerator from 'otp-generator';
import type {
  SendEmailOtpRequest,
  SendSmsOtpRequest,
} from '../types/auth.type';
import { Otp } from 'src/database/entities/otp.entity';
import { User } from 'src/database/entities/user.entity';
import type { MessageResponse } from '../types/auth.type';
import { OTP_TTL } from 'src/constants/constants';
import { NotificationService } from './notification.service';
import { OtpChannel } from '../enums/otp.enum';

@Injectable()
export class RequestOtpService {
  private readonly logger = new Logger(RequestOtpService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly notificationService: NotificationService,
  ) {}

  async sendEmailOtp(data: SendEmailOtpRequest): Promise<MessageResponse> {
    const em = this.em.fork();
    const email = data.email?.trim().toLowerCase();
    if (!email) {
      return {
        message: 'Email is required to send OTP',
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
      };
    }

    const user = await em.findOne(User, { email });
    if (!user) {
      this.logger.warn(`User with email ${email} does not exist`);
      return {
        message: 'User not found for provided email',
        statusCode: HttpStatus.NOT_FOUND,
        success: false,
      };
    }

    if (user.isEmailVerified) {
      this.logger.warn(`User with email ${email} is already email verified`);
      return {
        message: 'Email is already verified',
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
      };
    }

    return this.processOtpRequest({
      em,
      otpChannel: OtpChannel.EMAIL,
      identifier: email,
      user,
      successMessage: 'OTP sent to email successfully',
    });
  }

  async sendSmsOtp(data: SendSmsOtpRequest): Promise<MessageResponse> {
    const em = this.em.fork();
    const phoneNumber = data.phoneNumber?.trim();
    if (!phoneNumber) {
      return {
        message: 'Phone number is required to send OTP',
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
      };
    }

    const user = await em.findOne(User, { phoneNumber });
    if (!user) {
      this.logger.warn(`User with phone number ${phoneNumber} does not exist`);
      return {
        message: 'User not found for provided phone number',
        statusCode: HttpStatus.NOT_FOUND,
        success: false,
      };
    }

    if (user.isPhoneVerified) {
      this.logger.warn(
        `User with phone number ${phoneNumber} is already phone verified`,
      );
      return {
        message: 'Phone number is already verified',
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
      };
    }

    return this.processOtpRequest({
      em,
      otpChannel: OtpChannel.SMS,
      identifier: phoneNumber,
      user,
      successMessage: 'OTP sent via SMS successfully',
    });
  }

  private async processOtpRequest({
    em,
    otpChannel,
    identifier,
    user,
    successMessage,
  }: {
    em: EntityManager;
    otpChannel: OtpChannel;
    identifier: string;
    user: User;
    successMessage: string;
  }): Promise<MessageResponse> {
    const otpRepository = em.getRepository(Otp);

    const token = this.generateOtpToken();
    const expiresAt = addMinutes(new Date(), OTP_TTL);

    await otpRepository.nativeDelete({ identifier });

    const otp = otpRepository.create({
      identifier,
      token,
      tokenTtl: expiresAt,
    });

    await em.persistAndFlush(otp);

    try {
      await this.notificationService.dispatchOtp({
        otpChannel,
        user,
        token,
        expiresAt,
        validityMinutes: OTP_TTL,
      });

      this.logger.debug(
        `Generated OTP for ${otpChannel} identifier ${identifier}`,
      );

      return {
        message: successMessage,
        statusCode: HttpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      await otpRepository.nativeDelete({ identifier });
      this.logger.error(
        `Failed to send OTP via ${otpChannel} for identifier ${identifier}: ${error?.message ?? error}`,
      );
      return {
        message: `Failed to send OTP. Please try again later.`,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        success: false,
      };
    }
  }

  private generateOtpToken(): string {
    return otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      specialChars: false,
      upperCaseAlphabets: false,
    });
  }
}
