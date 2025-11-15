import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Otp } from 'src/database/entities/otp.entity';
import { User } from 'src/database';
import type {
  ValidateEmailOtpRequest,
  ValidateOtpResponse,
  ValidateSmsOtpRequest,
} from '../types/auth.type';

@Injectable()
export class ValidateOtpService {
  private readonly logger = new Logger(ValidateOtpService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
  ) {}

  @CreateRequestContext()
  async validateEmailOtp(
    data: ValidateEmailOtpRequest,
  ): Promise<ValidateOtpResponse> {
    const user = await this.em.findOne(User, { email: data.email });
    if (!user) {
      throw new NotFoundException('User not found for provided email');
    }

    return this.validateOtp({
      channel: 'email',
      identifier: data.email,
      token: data.token,
      user,
    });
  }

  @CreateRequestContext()
  async validateSmsOtp(
    data: ValidateSmsOtpRequest,
  ): Promise<ValidateOtpResponse> {
    const user = await this.em.findOne(User, { phoneNumber: data.phoneNumber });
    if (!user) {
      throw new NotFoundException('User not found for provided phone number');
    }

    return this.validateOtp({
      channel: 'sms',
      identifier: data.phoneNumber,
      token: data.token,
      user,
    });
  }

  private async validateOtp({
    channel,
    identifier,
    token,
    user,
  }: {
    channel: 'email' | 'sms';
    identifier: string;
    token: string;
    user: User;
  }): Promise<ValidateOtpResponse> {
    const otpRepository = this.em.getRepository(Otp);
    const otpRecord = await otpRepository.findOne({
      identifier,
      token,
    });

    if (!otpRecord) {
      this.logger.warn(`Invalid OTP attempt for identifier ${identifier}`);
      return {
        message: 'Invalid OTP provided',
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
        isValid: false,
        accessToken: null,
        userId: null,
        userType: null,
      };
    }

    const hasExpired = otpRecord.tokenTtl.getTime() < Date.now();
    if (hasExpired) {
      await otpRepository.nativeDelete({ identifier, token });
      this.logger.warn(`Expired OTP attempt for identifier ${identifier}`);
      return {
        message: 'OTP has expired',
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
        isValid: false,
        accessToken: null,
        userId: null,
        userType: null,
      };
    }

    await otpRepository.nativeDelete({ identifier, token });

    if (channel === 'email') {
      user.isEmailVerified = true;
    } else {
      user.isPhoneVerified = true;
    }

    await this.em.persistAndFlush(user);

    const isEmailVerified = Boolean(user.isEmailVerified);
    const isPhoneVerified = Boolean(user.isPhoneVerified);
    const isFullyVerified = isEmailVerified && isPhoneVerified;

    const accessToken = isFullyVerified
      ? this.jwtService.sign({
          userId: user.id,
          userType: user.userType,
        })
      : null;

    this.logger.debug(`Successful OTP validation for identifier ${identifier}`);

    return {
      message: 'OTP validated successfully',
      statusCode: HttpStatus.OK,
      success: true,
      isValid: true,
      accessToken,
      userId: isFullyVerified ? user.id : null,
      userType: isFullyVerified ? user.userType ?? null : null,
    };
  }
}
