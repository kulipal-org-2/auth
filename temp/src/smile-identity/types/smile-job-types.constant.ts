// smile-identity/constants/smile-job-types.constant.ts
export const SMILE_JOB_TYPES = {
    BUSINESS_VERIFICATION: 7,
    BASIC_KYC: 5,
    BIOMETRIC_KYC: 1,
    DOCUMENT_VERIFICATION: 6,
} as const;

// smile-identity/constants/smile-id-types.constant.ts
export const SMILE_KYC_ID_TYPES = {
    BVN: 'BVN',
    NIN: 'NIN',
    NIN_SLIP: 'NIN_SLIP',
    VOTER_ID: 'VOTER_ID',
    DRIVERS_LICENSE: 'DRIVERS_LICENSE',
    PASSPORT: 'PASSPORT',
} as const;

export const SMILE_BUSINESS_ID_TYPES = {
    BUSINESS_REGISTRATION: 'BUSINESS_REGISTRATION',
    TAX_INFORMATION: 'TAX_INFORMATION',
} as const;

export const SMILE_COUNTRIES = {
  NIGERIA: 'NG',
  GHANA: 'GH',
  KENYA: 'KE',
  SOUTH_AFRICA: 'ZA',
} as const;

