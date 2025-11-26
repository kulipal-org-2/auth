import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type { GetImageUploadSignatureDto, ImageUploadSignatureResponseDto } from './dto/image-upload.dto';

@Controller()
export class ImageUploadController {
  constructor(private readonly cloudinarySigningService: CloudinaryService) { }

  @GrpcMethod('ImageUploadService', 'GetImageUploadSignature')
  getImageUploadSignature(data: GetImageUploadSignatureDto): ImageUploadSignatureResponseDto {
    if (!this.isValidFileType(data.fileType)) {
      throw new Error('Invalid file type');
    }

    return this.cloudinarySigningService.getSignatureForFrontend(data.filename, data.fileType);
  }

  private isValidFileType(fileType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(fileType);
  }
}