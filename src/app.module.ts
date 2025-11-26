import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SmileIdentityModule } from './smile-identity/smile-identity.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SmileIdentityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
