import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Otp } from 'src/database/entities/otp.entity';
import { User } from 'src/database';
import type {
  ValidateOtpRequest,
  ValidateOtpResponse,
  RegisteredUser,
  LoginCredentials,
} from '../types/auth.type';
import { OtpChannel } from '../enums/otp.enum';
import { LoginService } from './login.service';

@Injectable()
export class ValidateOtpService {
  private readonly logger = new Logger(ValidateOtpService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly loginService: LoginService,
  ) {}

  @CreateRequestContext()
  async validateOtp(data: ValidateOtpRequest): Promise<ValidateOtpResponse> {
    let user: User | null = null;
    let otpChannel: OtpChannel;
    let identifier: string;

    if (data.email) {
      user = await this.em.findOne(User, { email: data.email });
      if (!user) {
        this.logger.warn(`User with email ${data.email} does not exist`);
        return {
          message: 'User not found for provided email',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          isValid: false,
          user: null,
        };
      }
      otpChannel = OtpChannel.EMAIL;
      identifier = data.email;
    } else {
      user = await this.em.findOne(User, { phoneNumber: data.phoneNumber! });
      if (!user) {
        this.logger.warn(
          `User with phone number ${data.phoneNumber} does not exist`,
        );
        return {
          message: 'User not found for provided phone number',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          isValid: false,
          user: null,
        };
      }
      otpChannel = OtpChannel.SMS;
      identifier = data.phoneNumber!;
    }

    return this.validateOtpInternal({
      otpChannel,
      identifier,
      token: data.token,
      user,
    });
  }

  private async validateOtpInternal({
    otpChannel,
    identifier,
    token,
    user,
  }: {
    otpChannel: OtpChannel;
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
        user: null,
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
        user: null,
      };
    }

    await otpRepository.nativeDelete({ identifier, token });

    if (otpChannel === OtpChannel.EMAIL) {
      user.isEmailVerified = true;
    } else {
      user.isPhoneVerified = true;
    }

    await this.em.persistAndFlush(user);

    const isEmailVerified = Boolean(user.isEmailVerified);
    const isPhoneVerified = Boolean(user.isPhoneVerified);
    const isVerified = isEmailVerified || isPhoneVerified;

    const credentials: LoginCredentials | undefined = isVerified
      ? await this.loginService.generateCredentials(user.id)
      : undefined;
    const userPayload: RegisteredUser | null = isVerified
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          userType: user.userType,
          isEmailVerified,
          isPhoneVerified,
          avatarUrl: user.avatarUrl ?? undefined,
          source: user.source ?? undefined,
          isIdentityVerified: Boolean(user.isIdentityVerified),
          identityVerificationType: user.identityVerificationType ?? undefined,
        }
      : null;

    this.logger.debug(`Successful OTP validation for identifier ${identifier}`);

    return {
      message: 'OTP validated successfully',
      statusCode: HttpStatus.OK,
      success: true,
      isValid: true,
      credentials,
      user: userPayload,
    };
  }
}
