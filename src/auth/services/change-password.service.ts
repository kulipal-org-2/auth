import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomLogger as Logger } from 'kulipal-shared';
import {
  type ChangePasswordRequest,
  MessageResponse,
} from '../types/auth.type';
import { verify } from 'argon2';
import { User } from 'src/database';
import { RegisterService } from './register.service';

@Injectable()
export class ChangePasswordService {
  private readonly logger = new Logger(ChangePasswordService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
    private readonly registerService: RegisterService,
  ) {}

  @CreateRequestContext()
  async execute(
    data: ChangePasswordRequest,
    token: string,
  ): Promise<MessageResponse> {
    this.logger.debug('Validating current password...');

    try {
      const { currentPassword, newPassword } = data;
      if (!token) {
        return {
          message: 'Unauthorized',
          statusCode: HttpStatus.UNAUTHORIZED,
          success: false,
        };
      }

      const { userId } = this.jwtService.verify<{ userId: string }>(token);

      const user = await this.em.findOne(User, { id: userId });
      if (!user || !user.password) {
        return {
          message: 'Unauthorized',
          statusCode: HttpStatus.UNAUTHORIZED,
          success: false,
        };
      }

      if (currentPassword === newPassword) {
        return {
          message: 'New password cannot be the same as the current password',
          statusCode: HttpStatus.BAD_REQUEST,
          success: false,
        };
      }

      const matches = await verify(user.password, currentPassword);
      if (!matches) {
        return {
          message: 'Current password is incorrect',
          statusCode: HttpStatus.BAD_REQUEST,
          success: false,
        };
      }

      const hashed = await this.registerService.hashPassword(newPassword);
      this.em.assign(user, { password: hashed });
      await this.em.flush();

      return {
        message: 'Password has been changed successfully',
        statusCode: HttpStatus.OK,
        success: true,
      };
    } catch (error) {
      this.logger.error('Change password failed');
      this.logger.error((error as Error).message);

      // Handle JWT-specific errors
      if ((error as Error).name === 'TokenExpiredError') {
        return {
          message: 'Session expired. Please login again.',
          statusCode: HttpStatus.UNAUTHORIZED,
          success: false,
        };
      }

      if ((error as Error).name === 'JsonWebTokenError') {
        return {
          message: 'Invalid token. Please login again.',
          statusCode: HttpStatus.UNAUTHORIZED,
          success: false,
        };
      }

      return {
        message: 'Internal error while changing password',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
      };
    }
  }
}
