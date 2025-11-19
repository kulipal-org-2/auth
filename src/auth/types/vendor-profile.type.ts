import { DayOfWeek } from "src/database/entities/business-hours.entity";
import { BusinessType, ServiceType } from "src/database/entities/vendor-profile.entity";

export type BusinessHoursInput = {
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  openTime2?: string;
  closeTime2?: string;
};

export type UpdateVendorProfileRequest = {
  userId: string;
  businessName?: string;
  businessType?: BusinessType;
  address?: string;
  coverImageUrl?: string;
  description?: string;
  serviceTypes?: ServiceType[];
  businessHours?: BusinessHoursInput[];
  verificationStep?: number;
};

export type GetVendorProfileRequest = {
  userId: string;
};

export type BusinessHoursDto = {
  id: string;
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  openTime2?: string;
  closeTime2?: string;
};

export type VendorProfileDto = {
  id: string;
  userId: string;
  businessName?: string;
  businessType?: BusinessType;
  address?: string;
  coverImageUrl?: string;
  description?: string;
  serviceTypes?: ServiceType[];
  isProfileComplete: boolean;
  isThirdPartyVerified: boolean;
  isKycVerified: boolean;
  verificationStep: number;
  businessHours: BusinessHoursDto[];
  createdAt: Date;
  updatedAt: Date;
};

export type VendorProfileResponse = {
  message: string;
  statusCode: number;
  success: boolean;
  profile: VendorProfileDto | null;
};
