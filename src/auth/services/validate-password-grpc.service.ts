// auth-service/src/auth/services/validate-password-grpc.service.ts
import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { User } from 'src/database/entities/user.entity';
import { verify } from 'argon2';

export interface ValidatePasswordResult {
  success: boolean;
  statusCode: number;
  message: string;
  isValid: boolean;
  isOAuthUser: boolean;
}

@Injectable()
export class ValidatePasswordGrpcService {
  private readonly logger = new Logger(ValidatePasswordGrpcService.name);

  constructor(private readonly em: EntityManager) {}

  @CreateRequestContext()
  async execute(userId: string, password: string): Promise<ValidatePasswordResult> {
    this.logger.log(`Validating password for user: ${userId}`);

    try {
      const user = await this.em.findOne(User, { id: userId });

      if (!user) {
        this.logger.warn(`User with id ${userId} not found`);
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User not found',
          isValid: false,
          isOAuthUser: false,
        };
      }

      // Check if user has a password (OAuth users might not)
      if (!user.password) {
        this.logger.warn(`User ${userId} has no password (OAuth user)`);
        return {
          success: true,
          statusCode: HttpStatus.OK,
          message: 'OAuth user - no password to validate',
          isValid: false,
          isOAuthUser: true,
        };
      }

      // Validate password
      const isPasswordValid = await verify(user.password, password);

      if (isPasswordValid) {
        this.logger.log(`Password validated successfully for user ${userId}`);
      } else {
        this.logger.warn(`Invalid password provided for user ${userId}`);
      }

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: isPasswordValid ? 'Password is valid' : 'Invalid password',
        isValid: isPasswordValid,
        isOAuthUser: false,
      };
    } catch (error: any) {
      this.logger.error(
        `Error validating password for user ${userId}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to validate password',
        isValid: false,
        isOAuthUser: false,
      };
    }
  }
}