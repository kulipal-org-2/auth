import { VerificationStatus, VerificationType, DocumentType } from "src/database/entities/vendor-verification.entity";

export type InitiateVerificationRequest = {
  userId: string;
};

export type InitiateVerificationResponse = {
  message: string;
  statusCode: number;
  success: boolean;
  token: string | null;
  jobId: string | null;
};

export type SubmitVerificationRequest = {
  userId: string;
  documentType: DocumentType;
  documentNumber: string;
  dateOfBirth?: string;
  selfieImageBase64: string;
  documentImageBase64?: string;
  selfieImageUrl?: string;
  documentImageUrl?: string;
};

export type SubmitVerificationResponse = {
  message: string;
  statusCode: number;
  success: boolean;
  verificationId: string | null;
};

export type GetVerificationStatusRequest = {
  userId: string;
};

export type VerificationDto = {
  id: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  documentType?: DocumentType;
  smileResultText?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  createdAt?: Date;
  reviewedAt?: Date;
};

export type GetVerificationStatusResponse = {
  message: string;
  statusCode: number;
  success: boolean;
  isThirdPartyVerified: boolean;
  isKycVerified: boolean;
  verifications: VerificationDto[];
};

export type AdminReviewVerificationRequest = {
  verificationId: string;
  adminUserId: string;
  approved: boolean;
  reviewNotes?: string;
  rejectionReason?: string;
};

export type AdminReviewVerificationResponse = {
  message: string;
  statusCode: number;
  success: boolean;
};