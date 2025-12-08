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
} from '../types/auth.type';
import { OtpChannel } from '../enums/otp.enum';
import { LoginService } from './login.service';
import { WalletGrpcService } from './wallet-grpc.service';

@Injectable()
export class ValidateOtpService {
  private readonly logger = new Logger(ValidateOtpService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly loginService: LoginService,
    private readonly walletGrpcService: WalletGrpcService,
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

    let walletInfo: RegisteredUser['wallet'] | undefined;
    if (isVerified) {
      try {
        const walletResponse = await this.walletGrpcService.getWallet(user.id);
        
        if (walletResponse.success && walletResponse.wallet) {
          walletInfo = this.walletGrpcService.mapWalletToUserFormat(walletResponse.wallet);
          this.logger.log(`Fetched wallet info for user ${user.id}`);
        } else {
          this.logger.warn(`No wallet found or failed to fetch wallet for user ${user.id}: ${walletResponse.message}`);
        }
      } catch (walletError: any) {
        this.logger.error(
          `Error fetching wallet for user ${user.id}: ${walletError?.message ?? walletError}`,
          walletError?.stack,
        );
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
          wallet: walletInfo ?? ({} as RegisteredUser['wallet']),
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
