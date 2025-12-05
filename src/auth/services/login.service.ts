// auth-service/src/auth/services/login.service.ts
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { CustomLogger as Logger } from 'kulipal-shared';
import { BusinessProfile, RefreshToken, User } from 'src/database';
import type { BusinessProfileSummary, LoginResponse, RegisteredUser } from '../types/auth.type';
import { WalletGrpcService } from './wallet-grpc.service'; // Add this

export type LoginType = {
  email: string;
  password: string;
};

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly em: EntityManager,
    private jwtService: JwtService,
    private readonly walletGrpcService: WalletGrpcService, // Inject this
  ) { }

  @CreateRequestContext()
  async execute(data: LoginType): Promise<LoginResponse> {
    this.logger.log(`Attempting to login user with email ${data.email}`);

    const email = data.email.trim().toLowerCase();
    const { password } = data;
    const existingUser = await this.em.findOne(User, {
      email,
    });

    if (!existingUser) {
      this.logger.warn(`User with email ${email} does not exist`);

      return {
        message: 'Incorrect email or password provided.',
        statusCode: HttpStatus.UNAUTHORIZED,
        success: false,
        user: null,
      };
    }

    this.logger.log(`Found user with email ${email} and id ${existingUser.id}`);

    if (!existingUser.password) {
      this.logger.warn(
        `User ${existingUser.id} who signed up via o-auth attempted to login with password`,
      );
      return {
        message: 'Incorrect email or password provided.',
        statusCode: HttpStatus.UNAUTHORIZED,
        success: false,
        user: null,
      };
    }

    if (!(await this.comparePassword(existingUser.password, password))) {
      this.logger.warn(`User with email ${email} provided incorrect password`);
      return {
        message: 'Incorrect email or password provided.',
        statusCode: HttpStatus.UNAUTHORIZED,
        success: false,
        user: null,
      };
    }

    this.logger.log(
      `User with email ${email} logged in successfully at ${Date.now()}`,
    );

    const credentials = await this.generateCredentials(existingUser.id);

    let businessProfiles: BusinessProfileSummary[] = [];
    if (existingUser.userType === 'vendor') {
      this.logger.log(`User is a vendor, fetching all business profiles`);
      const profiles = await this.em.find(
        BusinessProfile,
        { user: existingUser.id },
        {
          orderBy: { createdAt: 'DESC' },
          populate: ['operatingTimes']
        }
      );

      if (profiles && profiles.length > 0) {
        businessProfiles = profiles.map(profile => ({
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
        this.logger.log(`Found ${businessProfiles.length} business profiles for vendor: ${existingUser.id}`);
      } else {
        this.logger.log(`No business profiles found for vendor ${existingUser.id}`);
      }
    }

    // Fetch wallet info via gRPC call to payment service
    let walletInfo: RegisteredUser['wallet'] | undefined;
    try {
      const walletResponse = await this.walletGrpcService.getWallet(existingUser.id);
      
      if (walletResponse.success && walletResponse.wallet) {
        walletInfo = {
          id: walletResponse.wallet.id,
          accountNumber: walletResponse.wallet.accountNumber,
          balance: walletResponse.wallet.balance,
          currency: walletResponse.wallet.currency,
          isPinSet: walletResponse.wallet.isPinSet,
          isActive: walletResponse.wallet.isActive,
        };
        this.logger.log(`Fetched wallet info for user ${existingUser.id}`);
      } else {
        this.logger.warn(`No wallet found or failed to fetch wallet for user ${existingUser.id}: ${walletResponse.message}`);
      }
    } catch (walletError: any) {
      this.logger.error(
        `Error fetching wallet for user ${existingUser.id}: ${walletError?.message ?? walletError}`,
        walletError?.stack,
      );
      // Don't fail login if wallet fetch fails
    }

    const userPayload: RegisteredUser = {
      id: existingUser.id,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      email: existingUser.email,
      phoneNumber: existingUser.phoneNumber,
      userType: existingUser.userType,
      isEmailVerified: Boolean(existingUser.isEmailVerified),
      isPhoneVerified: Boolean(existingUser.isPhoneVerified),
      avatarUrl: existingUser.avatarUrl ?? undefined,
      source: existingUser.source ?? undefined,
      businessProfiles,
      isIdentityVerified: Boolean(existingUser.isIdentityVerified),
      identityVerificationType: existingUser.identityVerificationType ?? undefined,
      wallet: walletInfo,
    };

    return {
      message: 'Login successful',
      credentials,
      statusCode: HttpStatus.OK,
      success: true,
      user: userPayload,
    };
  }

  async generateCredentials(userId: string) {
    const accessToken = this.jwtService.sign({ userId }, { expiresIn: '1h' });
    const refreshToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha512').update(refreshToken).digest('hex');

    await this.em
      .insert(RefreshToken, {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .catch((error) => {
        this.logger.error(
          `Failed to store refresh token for user ${userId}: ${error.message}`,
        );
        throw new Error('Internal server error. Please try again later.');
      });

    return { accessToken, refreshToken };
  }

  private comparePassword(digest: string, password: string) {
    return verify(digest, password);
  }
}