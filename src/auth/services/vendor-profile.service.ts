import { CreateRequestContext, EntityManager } from "@mikro-orm/postgresql";
import { Injectable, Logger } from "@nestjs/common";
import type { BusinessHoursDto, GetVendorProfileRequest, SearchVendorsByLocationRequest, SearchVendorsByLocationResponse, UpdateVendorProfileRequest, VendorDistanceDto, VendorProfileDto, VendorProfileResponse } from "../types/vendor-profile.type";
import { User } from "src/database";
import { VendorProfile } from "src/database/entities/vendor-profile.entity";
import { BusinessHours } from "src/database/entities/business-hours.entity";

@Injectable()
export class VendorProfileService {
    private readonly logger = new Logger(VendorProfileService.name);
    constructor(
        private readonly em: EntityManager
    ) { }

    @CreateRequestContext()
    async getVendorProfile(data: GetVendorProfileRequest): Promise<VendorProfileResponse> {
        this.logger.log(`Fetching vendor profile for user: ${data.userId}`)
        try {
            const user = await this.em.findOne(User, { id: data.userId });

            if (!user) {
                this.logger.warn(`User not found: ${data.userId}`);
                return {
                    message: 'User not found',
                    statusCode: 404,
                    success: false,
                    profile: null
                };
            }

            if (user.userType !== 'vendor') {
                this.logger.warn(`User not a vendor: ${data.userId}`);
                return {
                    message: 'User is not a vendor',
                    statusCode: 403,
                    success: false,
                    profile: null
                }
            }

            let vendorProfile: VendorProfile | null = await this.em.findOne(
                VendorProfile,
                { userId: data.userId },
                { populate: ['businessHours'] }
            );

            if (!vendorProfile) {
                this.logger.log(`Creating new vendor profile for user: ${data.userId}`);
                vendorProfile = this.em.create(VendorProfile, {
                    userId: data.userId,
                    isProfileComplete: false,
                    isThirdPartyVerified: false,
                    isKycVerified: false,
                    verificationStep: 0,
                });

                await this.em.persistAndFlush(vendorProfile);
            }

            const profileDto = this.mapToDto(vendorProfile);

            return {
                message: 'Vendor profile retrieved successfully',
                statusCode: 200,
                success: true,
                profile: profileDto,
            };
        } catch (error: any) {
            this.logger.error(`Error fetching vendor profile: ${error.message}`, error.stack);
            return {
                message: 'Failed to fetch vedor profile',
                statusCode: 500,
                success: false,
                profile: null,
            };
        }
    }

    @CreateRequestContext()
    async updateVendorProfile(data: UpdateVendorProfileRequest): Promise<VendorProfileResponse> {
        this.logger.log(`Updating vendor profile for user: ${data.userId}`);

        try {
            const user = await this.em.findOne(User, { id: data.userId });

            if (!user) {
                this.logger.warn(`User not found: ${data.userId}`);

                return {
                    message: 'User not found',
                    statusCode: 404,
                    success: false,
                    profile: null,
                };
            }

            if (user.userType !== 'vendor') {
                this.logger.warn(`User is not a vendor: ${data.userId}`);

                return {
                    message: 'User is not a vendor',
                    statusCode: 403,
                    success: false,
                    profile: null,
                }
            }

            let vendorProfile: VendorProfile | null = await this.em.findOne(
                VendorProfile,
                { userId: data.userId },
                { populate: ['businessHours'] }
            );

            if (!vendorProfile) {
                vendorProfile = this.em.create(VendorProfile, {
                    userId: data.userId
                });
            }

            if (data.businessName !== undefined) {
                vendorProfile.businessName = data.businessName;
            }

            if (data.businessType !== undefined) {
                vendorProfile.businessType = data.businessType;
            }

            if (data.address !== undefined) {
                vendorProfile.address = data.address;
            }

            if (data.latitude !== undefined && data.longitude !== undefined) {
                vendorProfile.latitude = data.latitude;
                vendorProfile.longitude = data.longitude;
                // Create PostGIS point: POINT(longitude latitude)
                vendorProfile.location = `POINT(${data.longitude} ${data.latitude})`;
            }

            if (data.coverImageUrl !== undefined) {
                vendorProfile.coverImageUrl = data.coverImageUrl;
            }

            if (data.description !== undefined) {
                vendorProfile.description = data.description;
            }

            if (data.serviceTypes !== undefined) {
                vendorProfile.serviceTypes = data.serviceTypes;
            }

            if (data.verificationStep !== undefined) {
                vendorProfile.verificationStep = data.verificationStep;
            }

            if (data.businessHours && data.businessHours.length > 0) {
                await this.updateBusinessHours(vendorProfile, data.businessHours);
            }

            vendorProfile.isProfileComplete = this.checkProfileComplete(vendorProfile);

            await this.em.persistAndFlush(vendorProfile);

            await this.em.populate(vendorProfile, ['businessHours']);

            const profileDto = this.mapToDto(vendorProfile);

            this.logger.log(`Vendor profile updated successfully for user: ${data.userId}`);

            return {
                message: 'Vendor profile updated successfully',
                statusCode: 200,
                success: true,
                profile: profileDto,
            };
        } catch (error: any) {
            this.logger.error(`Error updating vendor profile: ${error.message}`, error.stack);
            return {
                message: 'Failed to update vendor profile',
                statusCode: 500,
                success: false,
                profile: null
            }
        }
    }

    @CreateRequestContext()
    async searchVendorsByLocation(
        data: SearchVendorsByLocationRequest,
    ): Promise<SearchVendorsByLocationResponse> {
        this.logger.log(`Searching vendors near (${data.latitude}, ${data.longitude})`);

        try {
            const radiusKm = data.radiusKm || 10;
            const limit = data.limit || 20;
            const offset = data.offset || 0;
            const radiusMeters = radiusKm * 1000;

            // Build WHERE clause and parameters
            let whereClause = `location IS NOT NULL 
        AND is_third_party_verified = true 
        AND is_kyc_verified = true`;

            let businessTypeFilter = '';
            if (data.businessType) {
                businessTypeFilter = ` AND business_type = ?`;
                whereClause += businessTypeFilter;
            }

            // Build parameters array - order matters!
            // For main query: long, lat, long, lat, radius, [businessType?], limit, offset
            const params: (number | string)[] = [
                data.longitude,
                data.latitude,
                data.longitude,
                data.latitude,
                radiusMeters,
            ];

            if (data.businessType) {
                params.push(data.businessType);
            }

            params.push(limit, offset);

            // PostGIS query to find vendors within radius, ordered by distance
            const query = `
        SELECT 
          *,
          ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
          ) / 1000 as distance_km
        FROM auth.vendor_profile
        WHERE ${whereClause}
          AND ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
            ?
          )
        ORDER BY distance_km ASC
        LIMIT ? OFFSET ?
      `;

            const vendors = await this.em.getConnection().execute(query, params);

            // Get total count
            const countParams: (number | string)[] = [
                data.longitude,
                data.latitude,
                radiusMeters,
            ];

            if (data.businessType) {
                countParams.push(data.businessType);
            }

            const countQuery = `
        SELECT COUNT(*) as total
        FROM auth.vendor_profile
        WHERE ${whereClause}
          AND ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
            ?
          )
      `;

            const countResult = await this.em.getConnection().execute(countQuery, countParams);

            const total = parseInt(countResult[0]?.total || '0');

            // Map to DTOs
            const vendorDtos: VendorDistanceDto[] = vendors.map((v: any) => ({
                id: v.id,
                userId: v.user_id,
                businessName: v.business_name,
                businessType: v.business_type,
                address: v.address,
                latitude: parseFloat(v.latitude),
                longitude: parseFloat(v.longitude),
                coverImageUrl: v.cover_image_url,
                description: v.description,
                serviceTypes: v.service_types,
                isProfileComplete: v.is_profile_complete,
                isThirdPartyVerified: v.is_third_party_verified,
                isKycVerified: v.is_kyc_verified,
                verificationStep: v.verification_step,
                businessHours: [], // Can populate separately if needed
                createdAt: v.created_at,
                updatedAt: v.updated_at,
                distanceKm: Number(parseFloat(v.distance_km).toFixed(2)), // Distance in km
            }));

            return {
                message: 'Vendors retrieved successfully',
                statusCode: 200,
                success: true,
                vendors: vendorDtos,
                total,
            };
        } catch (error: any) {
            this.logger.error(`Error searching vendors: ${error.message}`, error.stack);
            return {
                message: 'Failed to search vendors',
                statusCode: 500,
                success: false,
                vendors: [],
                total: 0,
            };
        }
    }


    private async updateBusinessHours(
        vendorProfile: VendorProfile,
        businessHoursData: UpdateVendorProfileRequest['businessHours']
    ): Promise<void> {
        if (!businessHoursData) return;

        const existingHours = await this.em.find(BusinessHours, {
            vendorProfile: vendorProfile,
        });

        if (existingHours.length > 0) {
            await this.em.removeAndFlush(existingHours);
        }

        const newBusinessHours = businessHoursData.map((hours) =>
            this.em.create(BusinessHours, {
                vendorProfile: vendorProfile,
                dayOfWeek: hours.dayOfWeek,
                isOpen: hours.isOpen,
                openTime: hours.openTime,
                closeTime: hours.closeTime,
                openTime2: hours.openTime2,
                closeTime2: hours.closeTime2,
            })
        );

        if (newBusinessHours.length > 0) {
            await this.em.persistAndFlush(newBusinessHours);
        }
    }

    private checkProfileComplete(profile: VendorProfile): boolean {
        return !!(
            profile.businessName &&
            profile.businessType &&
            profile.address &&
            profile.serviceTypes &&
            profile.serviceTypes.length > 0
        );
    }

    private mapBusinessHoursToDto(hours: BusinessHours): BusinessHoursDto {
        return {
            id: hours.id,
            dayOfWeek: hours.dayOfWeek,
            isOpen: Boolean(hours.isOpen),
            openTime: hours.openTime,
            closeTime: hours.closeTime,
            openTime2: hours.openTime2,
            closeTime2: hours.closeTime2,
        };
    }

    private mapToDto(profile: VendorProfile): VendorProfileDto {
        return {
            id: profile.id,
            userId: profile.userId,
            businessName: profile.businessName,
            businessType: profile.businessType,
            address: profile.address,
            latitude: profile.latitude,
            longitude: profile.longitude,
            coverImageUrl: profile.coverImageUrl,
            description: profile.description,
            serviceTypes: profile.serviceTypes,
            isProfileComplete: Boolean(profile.isProfileComplete),
            isThirdPartyVerified: Boolean(profile.isThirdPartyVerified),
            isKycVerified: Boolean(profile.isKycVerified),
            verificationStep: profile.verificationStep ?? 0,
            businessHours: profile.businessHours
                ? profile.businessHours.getItems().map(this.mapBusinessHoursToDto)
                : [],
            createdAt: profile.createdAt ?? new Date(),
            updatedAt: profile.updatedAt ?? new Date(),
        };
    }


}