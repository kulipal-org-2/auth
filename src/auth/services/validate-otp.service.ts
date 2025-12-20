import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Otp } from 'src/database/entities/otp.entity';
import { User, BusinessProfile, UserType } from 'src/database';
import type {
  ValidateOtpRequest,
  ValidateOtpResponse,
  RegisteredUser,
  LoginCredentials,
  BusinessProfileSummary,
  Platform,
} from '../types/auth.type';
import { OtpChannel } from '../enums/otp.enum';
import { LoginService } from './login.service';
import { DeviceTokenGrpcService } from './device-token-grpc.service';

interface ValidateOtpInternalParams {
  otpChannel: OtpChannel;
  identifier: string;
  token: string;
  user: User;
  fcmToken?: string;
  platform?: Platform;
}

@Injectable()
export class ValidateOtpService {
  private readonly logger = new Logger(ValidateOtpService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly loginService: LoginService,
    private readonly deviceTokenGrpcService: DeviceTokenGrpcService,
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
      fcmToken: data.deviceToken?.fcmToken,
      platform: data.deviceToken?.platform,
    });
  }

  private async validateOtpInternal(
    params: ValidateOtpInternalParams,
  ): Promise<ValidateOtpResponse> {
    const {
    otpChannel,
    identifier,
    token,
    user,
      fcmToken,
      platform,
    } = params;
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

    // Register device token if provided and verified (optional, don't fail if it fails)
    if (isVerified && fcmToken) {
      try {
        await this.deviceTokenGrpcService.registerToken({
          userId: user.id,
          token: fcmToken,
          platform: platform,
        });
        this.logger.log(
          `Device token registered for user ${user.id} during OTP validation`,
        );
      } catch (error: any) {
        this.logger.warn(
          `Failed to register device token during OTP validation for user ${user.id}: ${error.message}`,
        );
        // Don't fail OTP validation if token registration fails
      }
    }

    let businessProfiles: BusinessProfileSummary[] = [];
    if (isVerified && user.userType === UserType.VENDOR) {
      const profiles = await this.em.find(
        BusinessProfile,
        { user: user.id },
        { orderBy: { createdAt: 'DESC' } },
      );

      if (profiles && profiles.length > 0) {
        businessProfiles = profiles.map((profile) => ({
          id: profile.id,
          businessName: profile.businessName,
          industry: profile.industry,
          isThirdPartyVerified: profile.isThirdPartyVerified ?? false,
          isKycVerified: profile.isKycVerified ?? false,
          coverImageUrl: profile.coverImageUrl,
          description: profile.description,
          serviceModes: profile.serviceModes,
          location: {
            placeId: profile.placeId,
            lat: profile.latitude,
            long: profile.longitude,
            stringAddress: profile.stringAddress,
          },
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        }));
      }
    }

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
          businessProfiles,
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
