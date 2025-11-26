// src/cloudinary/cloudinary.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { ImageUploadSignatureResponseDto } from 'src/image-upload/dto/image-upload.dto';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly uploadPreset: string;

  constructor(private configService: ConfigService) {
    this.cloudName = this.getRequiredConfig('CLOUDINARY_CLOUD_NAME');
    this.apiKey = this.getRequiredConfig('CLOUDINARY_API_KEY');
    this.apiSecret = this.getRequiredConfig('CLOUDINARY_API_SECRET');
    this.uploadPreset = this.configService.get('CLOUDINARY_UPLOAD_PRESET') || 'foodapp_uploads';
    
    this.logger.log(`Cloudinary configured for cloud: ${this.cloudName}`);
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get(key);
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  generateSignature(timestamp: number): string {
    const paramsToSign = { 
      timestamp, 
      upload_preset: this.uploadPreset 
    };
    
    return cloudinary.utils.api_sign_request(paramsToSign, this.apiSecret);
  }

  getSignatureForFrontend(filename: string, fileType: string): ImageUploadSignatureResponseDto {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(timestamp);

    return {
      apiKey: this.apiKey,
      signature,
      timestamp,
      uploadPreset: this.uploadPreset,
      cloudName: this.cloudName,
    };
  }
}