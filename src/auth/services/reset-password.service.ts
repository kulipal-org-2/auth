import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CustomLogger as Logger } from 'kulipal-shared';
import { MessageResponse } from '../types/auth.type';
import { createHash } from 'crypto';
import { User, ResetPasswordToken } from 'src/database';
import { RegisterService } from './register.service';

@Injectable()
export class ResetPasswordService {
  private readonly logger = new Logger(ResetPasswordService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly registerService: RegisterService,
  ) {}

  @CreateRequestContext()
  async execute({
    token,
    email,
    newPassword,
  }: {
    token: string;
    email: string;
    newPassword: string;
  }): Promise<MessageResponse> {
    this.logger.debug('Validating reset token...');

    try {
      // TODO: method-ify duplicated code from validate-token reused here
      const tokenHash = createHash('sha512').update(token).digest('hex');
      const record = await this.em.findOne(ResetPasswordToken, { tokenHash });
      if (!record) {
        this.logger.warn('Invalid token: no matching record');
        return {
          message: 'Invalid token',
          statusCode: 400,
          success: false,
        };
      }

      this.logger.debug(`User email: ${email}`);
      const user = await this.em.findOne(User, { email });
      if (!user) {
        this.logger.warn('Invalid token: no matching user');
        return {
          message: 'Invalid token',
          statusCode: 400,
          success: false,
        };
      }

      if (record.userId !== user.id) {
        this.logger.warn('Invalid token: not for the right user');
        return {
          message: 'Invalid token',
          statusCode: 400,
          success: false,
        };
      }

      if (record.expiresAt < new Date()) {
        this.logger.warn('Token has expired');
        await this.em.removeAndFlush(record);
        return {
          message: 'Token has expired',
          statusCode: 400,
          success: false,
        };
      }

      await this.em.removeAndFlush(record);
      this.logger.debug('Token successfully validated and deleted');

      const hashedPassword =
        await this.registerService.hashPassword(newPassword);
      this.em.assign(user, {
        password: hashedPassword,
      });
      await this.em.flush();

      this.logger.debug('Password successfully updated');
      return {
        message: 'Password has been reset successfully',
        statusCode: 200,
        success: true,
      };
    } catch (error) {
      this.logger.error('Error validating token');
      console.error(error);
      return {
        message: 'Internal error while validating token',
        statusCode: 500,
        success: false,
      };
    }
  }
}
