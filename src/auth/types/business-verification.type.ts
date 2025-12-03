export interface InitiateVerificationRequest {
  businessProfileId: string;
}

export interface InitiateVerificationResponse {
  message: string;
  statusCode: number;
  success: boolean;
  token: string | null;
  jobId: string | null;
}

export interface SubmitVerificationRequest {
  businessProfileId: string;
  idType: string;
  idNumber?: string;
  dob?: string;
  selfieImageUrl: string;
  documentImageUrl: string;
}

export interface SubmitVerificationResponse {
  message: string;
  statusCode: number;
  success: boolean;
  verificationId: string | null;
}

export interface GetVerificationStatusRequest {
  businessProfileId: string;
}

export interface VerificationDto {
  id: string;
  verificationType: string;
  status: string;
  smileResultText?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  createdAt?: Date;
  reviewedAt?: Date;
}

export interface GetVerificationStatusResponse {
  message: string;
  statusCode: number;
  success: boolean;
  isThirdPartyVerified: boolean;
  isKycVerified: boolean;
  verifications: VerificationDto[];
}

export interface AdminReviewVerificationRequest {
  verificationId: string;
  approved: boolean;
  reviewNotes?: string;
  rejectionReason?: string;
}

export interface AdminReviewVerificationResponse {
  message: string;
  statusCode: number;
  success: boolean;
}