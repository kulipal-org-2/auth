import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { DatabaseModule } from 'src/database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { CreateWalletService } from './services/create-wallet.service';
import { GetWalletService } from './services/get-wallet.service';
import { SetWalletPinService } from './services/set-wallet-pin.service';
import { ChangePinService } from './services/change-pin.service';
import { ResetPinService } from './services/reset-pin.service';
import { InitiateResetPinService } from './services/initiate-reset-pin.service';
import { ValidateWalletPinService } from './services/validate-wallet-pin.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { NotificationService } from 'src/auth/services/notification.service';


@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    ClientsModule.register([
      {
        name: 'NOTIFICATION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'notification',
          protoPath: join(__dirname, '..', 'proto/notification.proto'),
          url: process.env.NOTIFICATION_GRPC_URL,
        },
      },
    ]),
  ],
  controllers: [WalletController],
  providers: [
    CreateWalletService,
    GetWalletService,
    SetWalletPinService,
    ChangePinService,
    ResetPinService,
    InitiateResetPinService,
    ValidateWalletPinService,
    JwtAuthGuard,
    NotificationService,
  ],
  exports: [CreateWalletService],
})
export class WalletModule {}