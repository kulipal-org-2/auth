// smile-identity/interfaces/smile-identity.interface.ts

export interface SmileConfig {
  partnerId: string;
  apiKey: string;
  sidServer: string;
}

export interface PartnerParams {
  job_id: string;
  user_id: string;
  job_type: number;
}

export interface IdInfo {
  country: string;
  id_type: string;
  id_number: string;
  entered?: string;
  business_type?: BusinessType;
  first_name?: string;
  last_name?: string;
  dob?: string;
  business_name?: string;
}

export type BusinessType = 'bn' | 'co' | 'it';

export interface SmileVerificationResult {
  success: boolean;
  resultCode: string;
  resultText: string;
  smileJobId: string;
  timestamp: string;
  signature: string;
  fullResponse: any;
}

export interface BusinessVerificationRequest {
  registrationNumber: string;
  businessType: BusinessType;
  businessName?: string;
}

export interface BusinessVerificationResponse {
  success: boolean;
  message: string;
  resultCode: string;
  smileJobId: string;
  companyInformation?: CompanyInformation;
  directors?: Director[];
  beneficialOwners?: BeneficialOwner[];
  timestamp: string;
}

export interface CompanyInformation {
  legal_name?: string;
  registration_number?: string;
  company_type?: string;
  status?: string;
  date_of_registration?: string;
  address?: string;
  [key: string]: unknown;
}

export interface Director {
  name?: string;
  designation?: string;
  [key: string]: unknown;
}

export interface BeneficialOwner {
  name?: string;
  ownership_percentage?: string;
  [key: string]: unknown;
}

// KYC Interfaces
export interface KycVerificationRequest {
  idType: string;
  idNumber: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
}

export interface KycVerificationResponse {
  success: boolean;
  message: string;
  resultCode: string;
  smileJobId: string;
  kycResult: KycResult;
  timestamp: string;
}

export interface KycResult {
  success: boolean;
  resultCode: string;
  resultText: string;
  fullName?: string;
  idNumber?: string;
  dob?: string;
  gender?: string;
  photo?: string;
  actions?: {
    Return_Personal_Info?: string;
    Verify_ID_Number?: string;
    Liveness_Check?: string;
    Human_Review_Compare?: string;
  };
}

// Webhook Interfaces
export interface SmileDocumentVerificationWebhookData {
  Actions: {
    Document_Check: string;
    Human_Review_Compare: string;
    Human_Review_Document_Check: string;
    Human_Review_Liveness_Check: string;
    Liveness_Check: string;
    Register_Selfie: string;
    Return_Personal_Info: string;
    Selfie_To_ID_Card_Compare: string;
    Verify_Document: string;
  };
  Country: string;
  DOB: string;
  Document: string;
  ExpirationDate: string;
  FullName: string;
  Gender: string;
  IDNumber: string;
  IDType: string;
  ImageLinks: {
    id_card_back: string;
    id_card_image: string;
    selfie_image: string;
  };
  KYCReceipt: string;
  PartnerParams: {
    job_id: string;
    job_type: number;
    user_id: string;
  };
  PhoneNumber2: string;
  ResultCode: string;
  ResultText: string;
  SecondaryIDNumber: string;
  signature: string;
  SmileJobID: string;
  timestamp: string;
}

export interface SmileBusinessVerificationWebhookData {
  signature: string;
  timestamp: string;
  JSONVersion: string;
  SmileJobID: string;
  PartnerParams: {
    user_id: string;
    job_id: string;
    job_type: number;
  };
  ResultType: string;
  ResultText: string;
  ResultCode: string;
  IsFinalResult: string;
  Actions: {
    Verify_Business: string;
    Return_Business_Info: string;
  };
  company_information: {
    company_type: string;
    country: string;
    address: string;
    registration_number: string;
    search_number: string;
    authorized_shared_capital: string;
    industry: string;
    tax_id: string;
    registration_date: string;
    phone: string;
    legal_name: string;
    state: string;
    email: string;
    status: string;
  };
  fiduciaries: Array<{
    name: string;
    fiduciary_type: string;
    address: string;
    registration_number: string;
    status: string;
  }>;
  beneficial_owners: Array<{
    shareholdings: string;
    address: string;
    gender: string;
    nationality: string;
    registration_number: string;
    name: string;
    shareholder_type: string;
    phone_number: string;
  }>;
  proprietors: any[];
  documents: {
    search_certificate: string;
  };
  directors: Array<{
    shareholdings: string;
    id_number: string;
    address: string;
    occupation: string;
    gender: string;
    nationality: string;
    date_of_birth: string;
    name: string;
    id_type: string;
    phone_number: string;
  }>;
  success: boolean;
}

// Enum for ID Types
export enum KycIdType {
  BVN = 'BVN',
  NIN = 'NIN',
  NIN_SLIP = 'NIN_SLIP',
  VOTER_ID = 'VOTER_ID',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  PASSPORT = 'PASSPORT',
}

export enum BusinessIdType {
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  TAX_INFORMATION = 'TAX_INFORMATION',
}

// Response Types for Different Verification Types
export interface BvnVerificationResponse {
  success: boolean;
  message: string;
  resultCode: string;
  smileJobId: string;
  fullName?: string;
  dob?: string;
  phoneNumber?: string;
  timestamp: string;
}

export interface NinVerificationResponse {
  success: boolean;
  message: string;
  resultCode: string;
  smileJobId: string;
  fullName?: string;
  nin?: string;
  photo?: string;
  timestamp: string;
}

export interface InitiateBusinessVerificationDto {
  businessProfileId: string;
  registrationNumber: string;
  verificationType: string;
  businessType?: string;
}

export interface BusinessVerificationResultDto {
  success: boolean;
  message: string;
  smileJobId: string;
  resultCode: string;
  companyInformation?: any;
  timestamp: string;
}
