import { EntityManager } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { addMinutes } from 'date-fns';
import * as otpGenerator from 'otp-generator';
import type {
  SendEmailOtpRequest,
  SendSmsOtpRequest,
} from '../types/auth.type';
import { Otp } from 'src/database/entities/otp.entity';
import { User } from 'src/database/entities/user.entity';
import type { MessageResponse } from 'kulipal-shared';
import { OTP_TTL } from 'src/constants/constants';
import { NotificationService } from './notification.service';

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
      throw new BadRequestException('Email is required to send OTP');
    }

    const user = await em.findOne(User, { email });
    if (!user) {
      throw new NotFoundException('User not found for provided email');
    }

    return this.processOtpRequest({
      em,
      channel: 'email',
      identifier: email,
      user,
      successMessage: 'OTP sent to email successfully',
    });
  }

  async sendSmsOtp(data: SendSmsOtpRequest): Promise<MessageResponse> {
    const em = this.em.fork();
    const phoneNumber = data.phoneNumber?.trim();
    if (!phoneNumber) {
      throw new BadRequestException('Phone number is required to send OTP');
    }

    const user = await em.findOne(User, { phoneNumber });
    if (!user) {
      throw new NotFoundException('User not found for provided phone number');
    }

    return this.processOtpRequest({
      em,
      channel: 'sms',
      identifier: phoneNumber,
      user,
      successMessage: 'OTP sent via SMS successfully',
    });
  }

  private async processOtpRequest({
    em,
    channel,
    identifier,
    user,
    successMessage,
  }: {
    em: EntityManager;
    channel: 'email' | 'sms';
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

    await this.notificationService.dispatchOtp({
      channel,
      user,
      token,
      expiresAt,
      validityMinutes: OTP_TTL,
    });

    this.logger.debug(`Generated OTP for ${channel} identifier ${identifier}`);

    return {
      message: successMessage,
    };
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
