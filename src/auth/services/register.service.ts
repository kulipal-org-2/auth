import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { type CreateUserType } from 'kulipal-shared';
import { hash } from 'argon2';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { User, UserType } from 'src/database';
import type { RegisterRequest, RegisterResponse } from '../types/auth.type';
import { WalletGrpcService } from './wallet-grpc.service';
import { DeviceTokenGrpcService } from './device-token-grpc.service';

@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);
  constructor(
    private readonly em: EntityManager,
    private readonly walletGrpcService: WalletGrpcService,
    private readonly deviceTokenGrpcService: DeviceTokenGrpcService,
  ) { }

  @CreateRequestContext()
  async execute(data: RegisterRequest): Promise<RegisterResponse> {
    this.logger.log(`Attempting to register user with email ${data.email}`);
    const {
      email,
      firstName,
      lastName,
      password,
      phoneNumber,
      source,
      agreeToTerms,
      avatarUrl,
    } = data;

    if (!phoneNumber?.trim()) {
      throw new BadRequestException(
        'Phone number is required for registration',
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhoneNumber = phoneNumber.trim();

    const existingUser = await this.em.findOne(User, {
      email: normalizedEmail,
    });

    if (existingUser) {
      this.logger.warn(
        `User with email ${normalizedEmail} found to already exist.`,
      );

      return {
        message: 'There is an existing account with this email. Please login',
        success: false,
        statusCode: HttpStatus.CONFLICT,
        user: null,
      };
    }

    const existingPhoneUser = await this.em.findOne(User, {
      phoneNumber: normalizedPhoneNumber,
    });

    if (existingPhoneUser) {
      this.logger.warn(
        `User with phone number ${normalizedPhoneNumber} found to already exist.`,
      );

      return {
        message:
          'There is an existing account with this phone number. Please login',
        success: false,
        statusCode: HttpStatus.CONFLICT,
        user: null,
      };
    }

    const hashedPassword = await this.hashPassword(password);

    const user = this.em.create(User, {
      agreeToTerms,
      email: normalizedEmail,
      firstName,
      lastName,
      password: hashedPassword,
      phoneNumber: normalizedPhoneNumber,
      source,
      userType: UserType.USER,
      avatarUrl,
    });

    await this.em.persistAndFlush(user);

    this.logger.log(
      `Successfully created user with email ${normalizedEmail} and id ${user.id}`,
    );

    try {
      const walletResult = await this.walletGrpcService.createWallet(user.id);
      if (walletResult.success && walletResult.wallet) {
        this.logger.log(
          `Successfully created wallet with account number ${walletResult.wallet.accountNumber} for user ${user.id}`,
        );
      } else {
        this.logger.warn(
          `Failed to create wallet for user ${user.id}: ${walletResult.message}`,
        );
      }
    } catch (walletError: any) {
      this.logger.error(
        `Error creating wallet for user ${user.id}: ${walletError.message}`,
        walletError.stack,
      );
    }

    // Register device token if provided (optional, don't fail if it fails)
    if (data.deviceToken?.fcmToken) {
      try {
        await this.deviceTokenGrpcService.registerToken({
          userId: user.id,
          token: data.deviceToken.fcmToken,
          platform: data.deviceToken.platform,
        });
        this.logger.log(
          `Device token registered for user ${user.id} during login`,
        );
      } catch (error: any) {
        this.logger.warn(
          `Failed to register device token during login for user ${user.id}: ${error.message}`,
        );
        // Don't fail login if token registration fails
      }
    }

    return {
      message: 'User created successfully',
      success: true,
      statusCode: HttpStatus.CREATED,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        isEmailVerified: Boolean(user.isEmailVerified),
        isPhoneVerified: Boolean(user.isPhoneVerified),
        source: user.source ?? undefined,
        businessProfiles: [],
        isIdentityVerified: Boolean(user.isIdentityVerified),
        identityVerificationType: user.identityVerificationType ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
      },
    };
  }

  /**
   * Returns the hash of a plain text password
   * @param pwd The password to hash
   * @returns The hashed password
   */
  public async hashPassword(pwd: string): Promise<string> {
    return await hash(pwd);
  }
}
