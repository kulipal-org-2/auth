import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable } from '@nestjs/common';
import { CustomLogger as Logger } from 'kulipal-shared';
import { User, BusinessProfile, UserType } from 'src/database';
import type {
  ProfileResponse,
  RegisteredUser,
  BusinessProfileSummary,
} from '../types/auth.type';

@Injectable()
export class GetProfileService {
  private readonly logger = new Logger(GetProfileService.name);

  constructor(private readonly em: EntityManager) {}

  @CreateRequestContext()
  async execute(userId: string): Promise<ProfileResponse> {
    this.logger.log(`Fetching profile for user: ${userId}`);

    try {
      const user = await this.em.findOne(User, { id: userId });

      if (!user) {
        this.logger.warn(`User with id ${userId} not found`);
        return {
          user: null,
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
        };
      }

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

      const userPayload: RegisteredUser = {
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
      };

      return {
        user: userPayload,
        message: 'Profile retrieved successfully',
        statusCode: HttpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      this.logger.error(
        `Error fetching profile: ${error.message}`,
        error.stack,
      );
      return {
        user: null,
        message: 'Failed to fetch profile',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
      };
    }
  }
}
