import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomLogger as Logger } from 'kulipal-shared';
import { MessageResponse } from '../types/auth.type';
import { verify } from 'argon2';
// import { createHash } from 'crypto';
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
  async execute({
    token,
    currentPassword,
    newPassword,
  }: {
    token: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<MessageResponse> {
    this.logger.debug('Validating current password...');

    try {
      if (!token) {
        return { message: 'Unauthorized', statusCode: 401, success: false };
      }

      const { userId } = this.jwtService.verify<{ userId: string }>(token);

      const user = await this.em.findOne(User, { id: userId });
      if (!user || !user.password) {
        return { message: 'Unauthorized', statusCode: 401, success: false };
      }

      if (currentPassword === newPassword) {
        return {
          message: 'New password cannot be the same as the current password',
          statusCode: 400,
          success: false,
        };
      }

      const matches = await verify(user.password, currentPassword);
      if (!matches) {
        return {
          message: 'Current password is incorrect',
          statusCode: 400,
          success: false,
        };
      }

      const hashed = await this.registerService.hashPassword(newPassword);
      this.em.assign(user, { password: hashed });
      await this.em.flush();

      return {
        message: 'Password has been reset successfully',
        statusCode: 200,
        success: true,
      };
    } catch (error) {
      this.logger.error('Change password failed', error as any);
      console.error(error);
      return {
        message: 'Internal error while changing password',
        statusCode: 500,
        success: false,
      };
    }
  }
}
