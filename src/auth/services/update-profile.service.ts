import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable } from '@nestjs/common';
import { CustomLogger as Logger } from 'kulipal-shared';
import { User, BusinessProfile, UserType } from 'src/database';
import type {
  ProfileResponse,
  RegisteredUser,
  UpdateProfileRequest,
  BusinessProfileSummary,
} from '../types/auth.type';

@Injectable()
export class UpdateProfileService {
  private readonly logger = new Logger(UpdateProfileService.name);

  constructor(
    private readonly em: EntityManager,
  ) {}

  @CreateRequestContext()
  async execute(
    userId: string,
    data: UpdateProfileRequest,
  ): Promise<ProfileResponse> {
    this.logger.log(`Updating profile for user: ${userId}`);

    try {
      // Ensure data is defined
      const updateRequest = data || {};

      const user = await this.em.findOne(User, { id: userId });

      if (!user) {
        this.logger.warn(`User with id ${userId} not found`);
        return {
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          user: null,
        };
      }

      const updateData: Partial<User> = {};
      if (updateRequest.firstName !== undefined) {
        updateData.firstName = updateRequest.firstName.trim();
      }
      if (updateRequest.lastName !== undefined) {
        updateData.lastName = updateRequest.lastName.trim();
      }
      if (updateRequest.avatarUrl !== undefined) {
        updateData.avatarUrl = updateRequest.avatarUrl || undefined;
      }

      if (Object.keys(updateData).length > 0) {
        this.em.assign(user, updateData);
        await this.em.flush();
        this.logger.log(`Successfully updated profile for user: ${userId}`);
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
        source: user.source ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        businessProfiles,
        isIdentityVerified: Boolean(user.isIdentityVerified),
        identityVerificationType: user.identityVerificationType ?? undefined,
      };

      return {
        message: 'Profile updated successfully',
        statusCode: HttpStatus.OK,
        success: true,
        user: userPayload,
      };
    } catch (error: any) {
      this.logger.error(
        `Error updating profile: ${error.message}`,
        error.stack,
      );
      return {
        message: 'Failed to update profile',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        user: null,
      };
    }
  }
}
