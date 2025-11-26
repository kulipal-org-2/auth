import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SmileIdentityModule } from './smile-identity/smile-identity.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ImageUploadModule } from './image-upload/image-upload.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SmileIdentityModule,
    CloudinaryModule,
    ImageUploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
