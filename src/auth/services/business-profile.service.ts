import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type {
  BusinessProfileDistanceDto,
  BusinessProfileDto,
  BusinessProfileResponse,
  BusinessProfilesResponse,
  CreateBusinessProfileRequest,
  GetBusinessProfileRequest,
  OperatingTimesDto,
  OperatingTimesInput,
  PaginationParams,
  PublicBusinessProfileDto,
  PublicBusinessProfileResponse,
  SearchBusinessProfilesRequest,
  SearchBusinessProfilesResponse,
  UpdateBusinessProfileRequest,
} from '../types/business-profile.type';
import {
  BusinessProfile,
  OperatingTimes,
  User,
  UserType,
} from 'src/database/entities';
import {
  paginate,
  PaginatedResponse,
  createPaginationMeta,
} from 'src/lib/utils/pagination.util';
import { WalletGrpcService } from './wallet-grpc.service';

@Injectable()
export class BusinessProfileService {
  private readonly logger = new Logger(BusinessProfileService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly walletGrpcService: WalletGrpcService,
  ) { }

  @CreateRequestContext()
  async createBusinessProfile(
    userId: string,
    data: CreateBusinessProfileRequest,
  ): Promise<BusinessProfileResponse> {
    this.logger.log(`Creating business profile for user: ${userId}`);

    try {
      const user = await this.em.findOne(User, { id: userId });

      if (!user) {
        return {
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          profile: null,
        };
      }

      // Auto-apply user verification status to business profile
      const isUserVerified = user.isIdentityVerified ?? false;

      this.logger.log(
        `User verification status: ${isUserVerified} for user: ${userId}`,
      );

      const businessProfile = this.em.create(BusinessProfile, {
        user: user,
        businessName: data.businessName,
        industry: data.industry,
        description: data.description,
        placeId: data.location.placeId,
        latitude: data.location.lat,
        longitude: data.location.long,
        stringAddress: data.location.stringAddress,
        location: `POINT(${data.location.long} ${data.location.lat})`,
        serviceModes: data.serviceModes,
        coverImageUrl: data.coverImageUrl,
        // Apply user's verification status to the business profile
        isThirdPartyVerified: isUserVerified,
        isKycVerified: isUserVerified,
      });

      await this.em.persistAndFlush(businessProfile);

      user.userType = UserType.VENDOR;
      await this.em.flush();
      this.logger.log(`Updated user ${userId} userType to vendor`);

      try {
        const walletUpdateResult = await this.walletGrpcService.updateWalletAccountOwnerType(
          userId,
          'vendor',
        );

        if (walletUpdateResult.success) {
          this.logger.log(
            `Successfully updated wallet accountOwnerType to vendor for user ${userId}`,
          );
        } else {
          this.logger.warn(
            `Failed to update wallet accountOwnerType for user ${userId}: ${walletUpdateResult.message}`,
          );
        }
      } catch (walletError: any) {
        this.logger.error(
          `Error updating wallet accountOwnerType for user ${userId}: ${walletError.message}`,
          walletError.stack,
        );
      }

      if (data.operatingTimes) {
        await this.updateOperatingTimes(businessProfile, data.operatingTimes);
      }

      await this.em.populate(businessProfile, ['operatingTimes']);

      const profileDto = this.mapToDto(businessProfile);

      return {
        message: 'Business profile created successfully',
        statusCode: HttpStatus.CREATED,
        success: true,
        profile: profileDto,
        // Include user verification status in response
        userVerificationStatus: {
          isIdentityVerified: isUserVerified,
          identityVerificationType: user.identityVerificationType,
        },
      } as any; // Cast to any to include the additional field
    } catch (error: any) {
      this.logger.error(
        `Error creating business profile: ${error.message}`,
        error.stack,
      );
      return {
        message: 'Failed to create business profile',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        profile: null,
      };
    }
  }

  @CreateRequestContext()
  async updateBusinessProfile(
    userId: string,
    data: UpdateBusinessProfileRequest,
  ): Promise<BusinessProfileResponse> {
    this.logger.log(`Updating business profile: ${data.businessProfileId}`);

    try {
      const businessProfile = await this.em.findOne(
        BusinessProfile,
        { id: data.businessProfileId },
        { populate: ['user', 'operatingTimes'] },
      );

      if (!businessProfile) {
        return {
          message: 'Business profile not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          profile: null,
        };
      }

      if (businessProfile.user.id !== userId) {
        return {
          message: 'Unauthorized to update this business profile',
          statusCode: HttpStatus.FORBIDDEN,
          success: false,
          profile: null,
        };
      }

      // Check if user verification status has changed and update business profile accordingly
      const user = await this.em.findOne(User, { id: userId });

      if (!user) {
        return {
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          profile: null,
        };
      }

      if (user.isIdentityVerified) {
        businessProfile.isThirdPartyVerified = true;
        businessProfile.isKycVerified = true;
      }

      if (data.businessName !== undefined) {
        businessProfile.businessName = data.businessName;
      }

      if (data.industry !== undefined) {
        businessProfile.industry = data.industry;
      }

      if (data.description !== undefined) {
        businessProfile.description = data.description;
      }

      if (data.location) {
        businessProfile.placeId = data.location.placeId;
        businessProfile.latitude = data.location.lat;
        businessProfile.longitude = data.location.long;
        businessProfile.stringAddress = data.location.stringAddress;
        businessProfile.location = `POINT(${data.location.long} ${data.location.lat})`;
      }

      if (data.serviceModes !== undefined) {
        businessProfile.serviceModes = data.serviceModes;
      }

      if (data.coverImageUrl !== undefined) {
        businessProfile.coverImageUrl = data.coverImageUrl;
      }

      if (data.operatingTimes) {
        await this.updateOperatingTimes(businessProfile, data.operatingTimes);
      }

      await this.em.flush();
      await this.em.populate(businessProfile, ['operatingTimes']);

      const profileDto = this.mapToDto(businessProfile);

      return {
        message: 'Business profile updated successfully',
        statusCode: HttpStatus.OK,
        success: true,
        profile: profileDto,
      };
    } catch (error: any) {
      this.logger.error(
        `Error updating business profile: ${error.message}`,
        error.stack,
      );
      return {
        message: 'Failed to update business profile',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        profile: null,
      };
    }
  }

  @CreateRequestContext()
  async getBusinessProfile(
    data: GetBusinessProfileRequest,
    userId?: string,
  ): Promise<BusinessProfileResponse | PublicBusinessProfileResponse> {
    this.logger.log(`Fetching business profile: ${data.businessProfileId}`);

    try {
      const businessProfile = await this.em.findOne(
        BusinessProfile,
        { id: data.businessProfileId },
        { populate: ['user', 'operatingTimes'] },
      );

      if (!businessProfile) {
        return {
          message: 'Business profile not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          profile: null,
        };
      }

      if (userId && businessProfile.user.id !== userId) {
        return {
          message: 'You do not have permission to view this business profile',
          statusCode: HttpStatus.FORBIDDEN,
          success: false,
          profile: null,
        };
      }

      if (userId) {
        const profileDto = this.mapToDto(businessProfile);
        return {
          message: 'Business profile retrieved successfully',
          statusCode: HttpStatus.OK,
          success: true,
          profile: profileDto,
        } as BusinessProfileResponse;
      } else {
        const profileDto = this.mapToPublicDto(businessProfile);
        return {
          message: 'Business profile retrieved successfully',
          statusCode: HttpStatus.OK,
          success: true,
          profile: profileDto,
        } as PublicBusinessProfileResponse;
      }
    } catch (error: any) {
      this.logger.error(
        `Error fetching business profile: ${error.message}`,
        error.stack,
      );
      return {
        message: 'Failed to fetch business profile',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        profile: null,
      };
    }
  }

  @CreateRequestContext()
  async getVendorBusinessProfiles(
    userId: string,
    pagination?: PaginationParams,
  ): Promise<BusinessProfilesResponse> {
    this.logger.log(`Fetching business profiles for vendor: ${userId}`);

    try {
      const result = await paginate<BusinessProfile>(
        this.em,
        BusinessProfile,
        { user: { id: userId } },
        {
          page: pagination?.page,
          limit: pagination?.limit,
          orderBy: { createdAt: 'DESC' },
          populate: ['operatingTimes'],
        },
      );

      const profileDtos = (result.data || []).map((profile) =>
        this.mapToDto(profile),
      );

      return {
        message: 'Business profiles retrieved successfully',
        statusCode: HttpStatus.OK,
        success: true,
        profiles: profileDtos.length > 0 ? profileDtos : [],
        meta: result.meta,
      };
    } catch (error: any) {
      this.logger.error(
        `Error fetching vendor business profiles: ${error.message}`,
        error.stack,
      );
      return {
        message: 'Failed to fetch business profiles',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        profiles: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  }

  @CreateRequestContext()
  async searchBusinessProfiles(
    data: SearchBusinessProfilesRequest,
  ): Promise<SearchBusinessProfilesResponse> {
    this.logger.log(
      `Searching business profiles near (${data.latitude}, ${data.longitude})`,
    );

    try {
      const radiusKm = data.radiusKm || 10;
      const page = data.page || 1;
      const limit = data.limit || 10;
      const offset = (page - 1) * limit;
      const radiusMeters = radiusKm * 1000;

      let whereClause = `location IS NOT NULL 
      AND (is_third_party_verified = true OR is_kyc_verified = true)`;

      if (data.industry) {
        whereClause += ` AND industry = ?`;
      }

      const params: (number | string)[] = [
        data.longitude,
        data.latitude,
        ...(data.industry ? [data.industry] : []),
        data.longitude,
        data.latitude,
        radiusMeters,
        limit,
        offset,
      ];

      const query = `
      SELECT 
        *,
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
        ) / 1000 as distance_km
      FROM auth.business_profile
      WHERE ${whereClause}
        AND ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
          ?
        )
      ORDER BY distance_km ASC
      LIMIT ? OFFSET ?
    `;

      this.logger.log(
        `Executing search query with radius: ${radiusKm}km, page: ${page}, limit: ${limit}`,
      );
      const profiles = await this.em.getConnection().execute(query, params);

      // Count query
      const countParams: (number | string)[] = [
        ...(data.industry ? [data.industry] : []),
        data.longitude,
        data.latitude,
        radiusMeters,
      ];

      const countQuery = `
      SELECT COUNT(*) as total
      FROM auth.business_profile
      WHERE ${whereClause}
        AND ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
          ?
        )
    `;

      const countResult = await this.em
        .getConnection()
        .execute(countQuery, countParams);
      const total = parseInt(countResult[0]?.total || '0');
      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `Found ${profiles.length} profiles out of ${total} total (Page ${page}/${totalPages})`,
      );

      // Map results to DTOs
      const profileDtos = profiles.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        businessName: p.business_name,
        industry: p.industry,
        description: p.description,
        location: {
          placeId: p.place_id,
          lat: parseFloat(p.latitude),
          long: parseFloat(p.longitude),
          stringAddress: p.string_address,
        },
        serviceModes: p.service_modes,
        coverImageUrl: p.cover_image_url,
        isThirdPartyVerified: p.is_third_party_verified,
        isKycVerified: p.is_kyc_verified,
        operatingTimes: [],
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        distanceKm: Number(parseFloat(p.distance_km).toFixed(2)),
      }));

      const { meta } = createPaginationMeta(total, page, limit);

      return {
        message: 'Business profiles retrieved successfully',
        statusCode: HttpStatus.OK,
        success: true,
        profiles: profileDtos,
        meta,
      };
    } catch (error: any) {
      this.logger.error(
        `Error searching business profiles: ${error.message}`,
        error.stack,
      );
      return {
        message: 'Failed to search business profiles',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        profiles: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  }

  private async updateOperatingTimes(
    businessProfile: BusinessProfile,
    operatingTimesData: OperatingTimesInput,
  ): Promise<void> {
    const existingTimes = await this.em.find(OperatingTimes, {
      businessProfile: businessProfile,
    });

    if (existingTimes.length > 0) {
      await this.em.removeAndFlush(existingTimes);
    }

    const newOperatingTimes: OperatingTimes[] = [];

    for (const [day, times] of Object.entries(operatingTimesData)) {
      if (times) {
        const operatingTime = this.em.create(OperatingTimes, {
          businessProfile: businessProfile,
          day: day as any,
          startTime: times.start,
          endTime: times.end,
        });
        newOperatingTimes.push(operatingTime);
      }
    }

    if (newOperatingTimes.length > 0) {
      await this.em.persistAndFlush(newOperatingTimes);
    }
  }

  private mapToDto(profile: BusinessProfile): BusinessProfileDto {
    return {
      id: profile.id,
      userId: profile.user.id,
      businessName: profile.businessName,
      industry: profile.industry,
      description: profile.description,
      location: {
        placeId: profile.placeId,
        lat: profile.latitude,
        long: profile.longitude,
        stringAddress: profile.stringAddress,
      },
      serviceModes: profile.serviceModes,
      coverImageUrl: profile.coverImageUrl,
      isThirdPartyVerified: profile.isThirdPartyVerified,
      isKycVerified: profile.isKycVerified,
      operatingTimes: profile.operatingTimes
        ? profile.operatingTimes.getItems().map(this.mapOperatingTimesToDto)
        : [],
      createdAt: profile.createdAt ?? new Date(),
      updatedAt: profile.updatedAt ?? new Date(),
    };
  }

  private mapToPublicDto(profile: BusinessProfile): PublicBusinessProfileDto {
    return {
      id: profile.id,
      businessName: profile.businessName,
      industry: profile.industry,
      description: profile.description,
      location: {
        placeId: profile.placeId,
        lat: profile.latitude,
        long: profile.longitude,
        stringAddress: profile.stringAddress,
      },
      serviceModes: profile.serviceModes,
      coverImageUrl: profile.coverImageUrl,
      isThirdPartyVerified: profile.isThirdPartyVerified,
      isKycVerified: profile.isKycVerified,
      operatingTimes: profile.operatingTimes
        ? profile.operatingTimes.getItems().map(this.mapOperatingTimesToDto)
        : [],
      createdAt: profile.createdAt ?? new Date(),
    };
  }

  private mapOperatingTimesToDto(times: OperatingTimes): OperatingTimesDto {
    return {
      day: times.day,
      startTime: times.startTime,
      endTime: times.endTime,
    };
  }
}
