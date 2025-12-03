import { Controller } from "@nestjs/common";
import { GetWalletService } from "./services/get-wallet.service";
import { CreateWalletService } from "./services/create-wallet.service";
import { SetWalletPinService } from "./services/set-wallet-pin.service";
import { ChangePinService } from "./services/change-pin.service";
import { InitiateResetPinService } from "./services/initiate-reset-pin.service";
import { ResetPinService } from "./services/reset-pin.service";
import { ValidateWalletPinService } from "./services/validate-wallet-pin.service";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { GrpcMethod } from "@nestjs/microservices";
import type { ChangePinRequest, ChangePinResponse, CreateWalletRequest, CreateWalletResponse, GetWalletByAccountNumberRequest, GetWalletRequest, GetWalletResponse, InitiateResetPinRequest, InitiateResetPinResponse, ResetPinRequest, ResetPinResponse, SetWalletPinRequest, SetWalletPinResponse, ValidateWalletPinRequest, ValidateWalletPinResponse } from "./dto/wallet.type";
import { Metadata } from "@grpc/grpc-js";

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly createWalletService: CreateWalletService,
    private readonly getWalletService: GetWalletService,
    private readonly setWalletPinService: SetWalletPinService,
    private readonly changePinService: ChangePinService,
    private readonly initiateResetPinService: InitiateResetPinService,
    private readonly resetPinService: ResetPinService,
    private readonly validateWalletPinService: ValidateWalletPinService,
    private readonly jwtAuthGuard: JwtAuthGuard,
  ) { }

  @GrpcMethod('WalletService', 'CreateWallet')
  async createWallet(
    data: CreateWalletRequest,
    metadata: Metadata,
  ): Promise<CreateWalletResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        wallet: null,
      };
    }

    const result = await this.createWalletService.execute(authResult.userId);
    return {
      ...result,
      wallet: result.wallet ?? null,
    };
  }

  @GrpcMethod('WalletService', 'GetWallet')
  async getWallet(
    _data: GetWalletRequest,
    metadata: Metadata,
  ): Promise<GetWalletResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        wallet: null,
      };
    }

    const result = await this.getWalletService.execute(authResult.userId);
    return {
      ...result,
      wallet: result.wallet ?? null,
    };
  }

  @GrpcMethod('WalletService', 'GetWalletByAccountNumber')
  async getWalletByAccountNumber(
    data: GetWalletByAccountNumberRequest,
    metadata: Metadata,
  ): Promise<GetWalletResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        wallet: null,
      };
    }

    const result = await this.getWalletService.getByAccountNumber(data.accountNumber);
    return {
      ...result,
      wallet: result.wallet ?? null, 
    };
  }

  @GrpcMethod('WalletService', 'SetWalletPin')
  async setWalletPin(
    data: SetWalletPinRequest,
    metadata: Metadata,
  ): Promise<SetWalletPinResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
      };
    }

    return this.setWalletPinService.execute({
      userId: authResult.userId,
      pin: data.pin,
    });
  }

  @GrpcMethod('WalletService', 'ChangePin')
  async changePin(
    data: ChangePinRequest,
    metadata: Metadata,
  ): Promise<ChangePinResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
      };
    }

    return this.changePinService.execute({
      userId: authResult.userId,
      oldPin: data.oldPin,
      newPin: data.newPin,
    });
  }

  @GrpcMethod('WalletService', 'InitiateResetPin')
  async initiateResetPin(
    data: InitiateResetPinRequest,
    metadata: Metadata,
  ): Promise<InitiateResetPinResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
      };
    }

    return this.initiateResetPinService.execute({
      userId: authResult.userId,
      password: data.password,
    });
  }

  @GrpcMethod('WalletService', 'ResetPin')
  async resetPin(
    data: ResetPinRequest,
    metadata: Metadata,
  ): Promise<ResetPinResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
      };
    }

    return this.resetPinService.execute({
      userId: authResult.userId,
      otp: data.otp,
      newPin: data.newPin,
    });
  }

  @GrpcMethod('WalletService', 'ValidateWalletPin')
  async validateWalletPin(
    data: ValidateWalletPinRequest,
    metadata: Metadata,
  ): Promise<ValidateWalletPinResponse> {
    const authResult = this.jwtAuthGuard.validateToken(metadata);

    if (!authResult.success) {
      return {
        message: authResult.message,
        statusCode: 401,
        success: false,
        isValid: false,
      };
    }

    return this.validateWalletPinService.execute({
      userId: authResult.userId,
      pin: data.pin,
    });
  }
}