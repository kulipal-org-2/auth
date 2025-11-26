import { Module } from '@nestjs/common';
import { ImageUploadService } from './image-upload.service';
import { ImageUploadController } from './image-upload.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CloudinaryProvider } from 'src/cloudinary/cloudinary.provider';

@Module({
  controllers: [ImageUploadController],
  providers: [ImageUploadService, CloudinaryService, CloudinaryProvider],
  exports: [CloudinaryService]
})
export class ImageUploadModule {}
