export interface GetImageUploadSignatureDto {
  filename: string;
  fileType: string;
}

// image-upload-signature-response.dto.ts
export interface ImageUploadSignatureResponseDto {
  apiKey: string;
  signature: string;
  timestamp: number;
  uploadPreset: string;
  cloudName: string;
}