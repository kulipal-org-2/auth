export interface CreateBusinessProfileRequest {
  businessName: string;
  industry: 'FOOD' | 'EVENTS' | 'HOUSING';
  description?: string;
  location: {
    placeId?: string;
    lat: number;
    long: number;
    stringAddress: string;
  };
  serviceModes: ('DELIVERY' | 'PICK_UP' | 'DINE_IN')[];
  coverImageUrl?: string;
  operatingTimes?: OperatingTimesInput;
}

export interface UpdateBusinessProfileRequest {
  businessProfileId: string;
  businessName?: string;
  industry?: 'FOOD' | 'EVENTS' | 'HOUSING';
  description?: string;
  location?: {
    placeId?: string;
    lat: number;
    long: number;
    stringAddress: string;
  };
  serviceModes?: ('DELIVERY' | 'PICK_UP' | 'DINE_IN')[];
  coverImageUrl?: string;
  operatingTimes?: OperatingTimesInput;
}

export interface GetBusinessProfileRequest {
  businessProfileId: string;
}

export interface SearchBusinessProfilesRequest {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  industry?: 'FOOD' | 'EVENTS' | 'HOUSING';
  limit?: number;
  offset?: number;
  page?: number;
}

export interface OperatingTimesInput {
  sun?: { start: string; end: string };
  mon?: { start: string; end: string };
  tue?: { start: string; end: string };
  wed?: { start: string; end: string };
  thu?: { start: string; end: string };
  fri?: { start: string; end: string };
  sat?: { start: string; end: string };
  weekdays?: { start: string; end: string };
  weekends?: { start: string; end: string };
}

export interface OperatingTimesDto {
  day: string;
  startTime: string;
  endTime: string;
}

export interface BusinessProfileDto {
  id: string;
  userId: string;
  businessName: string;
  industry: string;
  description?: string;
  location: {
    placeId?: string;
    lat: number;
    long: number;
    stringAddress: string;
  };
  serviceModes: string[];
  coverImageUrl?: string;
  isThirdPartyVerified?: boolean;
  isKycVerified?: boolean;
  operatingTimes: OperatingTimesDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicBusinessProfileDto {
  id: string;
  businessName: string;
  industry: string;
  description?: string;
  location: {
    placeId?: string;
    lat: number;
    long: number;
    stringAddress: string;
  };
  serviceModes: string[];
  coverImageUrl?: string;
  isThirdPartyVerified?: boolean;
  isKycVerified?: boolean;
  operatingTimes: OperatingTimesDto[];
  createdAt: Date;
}

export interface BusinessProfileResponse {
  message: string;
  statusCode: number;
  success: boolean;
  profile: BusinessProfileDto | null;
}

export interface PublicBusinessProfileResponse {
  message: string;
  statusCode: number;
  success: boolean;
  profile: PublicBusinessProfileDto | null;
}

export interface BusinessProfilesResponse {
  message: string;
  statusCode: number;
  success: boolean;
  profiles: BusinessProfileDto[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface BusinessProfileDistanceDto extends BusinessProfileDto {
  distanceKm: number;
}

export interface SearchBusinessProfilesResponse {
  message: string;
  statusCode: number;
  success: boolean;
  profiles: BusinessProfileDistanceDto[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}