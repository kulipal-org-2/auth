// src/auth/services/refresh-token.service.ts
import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomLogger as Logger } from 'kulipal-shared';
import { createHash, randomBytes } from 'crypto';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { RefreshToken, User, BusinessProfile, UserType } from 'src/database';
import type {
  LoginResponse,
  RegisteredUser,
  BusinessProfileSummary,
} from '../types/auth.type';
import { WalletGrpcService } from './wallet-grpc.service';

@Injectable()
export class RefreshAccessTokenService {
  private readonly logger = new Logger(RefreshAccessTokenService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
    private readonly walletGrpcService: WalletGrpcService,
  ) {}

  @CreateRequestContext()
  async execute(userId: string, refreshToken: string): Promise<LoginResponse> {
    const hashed = createHash('sha512').update(refreshToken).digest('hex');

    const token = await this.em.findOne(RefreshToken, {
      userId,
      tokenHash: hashed,
    });

    if (!token) {
      this.logger.warn(
        `Refresh failed: No matching token found for user ${userId}`,
      );
      return {
        success: false,
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'The refresh token provided is invalid.',
        user: null,
      };
    }

    const newRawRefreshToken = randomBytes(32).toString('base64url');
    const newHashedRefreshToken = createHash('sha512')
      .update(newRawRefreshToken)
      .digest('hex');

    await this.em.upsert(
      RefreshToken,
      {
        tokenHash: newHashedRefreshToken,
        userId,
        id: token.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      },
      {
        onConflictFields: ['id'],
      },
    );

    const accessToken = this.jwtService.sign(
      {
        userId,
      },
      {
        expiresIn: '1h',
      },
    );

    const credentials = {
      accessToken,
      refreshToken: newRawRefreshToken,
    };

    const user = await this.em.findOne(User, { id: userId });
    let userPayload: RegisteredUser | null = null;
    if (user) {
      // Fetch ALL business profiles if user is a vendor
      let businessProfiles: BusinessProfileSummary[] = [];
      if (user.userType === UserType.VENDOR) {
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

      userPayload = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        isEmailVerified: Boolean(user.isEmailVerified),
        isPhoneVerified: Boolean(user.isPhoneVerified),
        avatarUrl: user.avatarUrl ?? undefined,
        source: user.source ?? undefined,
        businessProfiles,
        isIdentityVerified: Boolean(user.isIdentityVerified),
        identityVerificationType: user.identityVerificationType ?? undefined,
        wallet: walletInfo ?? ({} as RegisteredUser['wallet']),
      };
    }

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Token refreshed successfully',
      credentials,
      user: userPayload,
    };
  }
}
