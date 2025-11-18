import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { addMinutes } from 'date-fns';
import { CustomLogger as Logger } from 'kulipal-shared';
import { ValidateTokenResponse } from '../types/auth.type';
import { createHash } from 'crypto';
import { User, ResetPasswordToken } from 'src/database';

@Injectable()
export class ValidateTokenService {
  private readonly logger = new Logger(ValidateTokenService.name);

  constructor(private readonly em: EntityManager) {}

  @CreateRequestContext()
  async execute({
    token,
    email,
  }: {
    token: string;
    email: string;
  }): Promise<ValidateTokenResponse> {
    this.logger.debug('Validating reset token...');

    try {
      const tokenHash = createHash('sha512').update(token).digest('hex');
      const record = await this.em.findOne(ResetPasswordToken, { tokenHash });
      if (!record) {
        this.logger.warn('Invalid token: no matching record');
        return {
          message: 'Invalid token',
          statusCode: 400,
          success: false,
          isValid: false,
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
          isValid: false,
        };
      }

      if (record.userId !== user.id) {
        this.logger.warn('Invalid token: not for the right user');
        return {
          message: 'Invalid token',
          statusCode: 400,
          success: false,
          isValid: false,
        };
      }

      if (record.expiresAt < new Date()) {
        this.logger.warn('Token has expired');
        await this.em.removeAndFlush(record);
        return {
          message: 'Token has expired',
          statusCode: 400,
          success: false,
          isValid: false,
        };
      }

      this.em.assign(record, {
        expiresAt: addMinutes(new Date(), 15), // Give the user 15 minutes to think about and change his password
      });
      await this.em.flush();

      this.logger.debug('Token successfully validated');
      return {
        message: 'Token is valid',
        statusCode: 200,
        success: true,
        isValid: true,
      };
    } catch (error) {
      this.logger.error('Error validating token');
      console.error(error);
      return {
        message: 'Internal error while validating token',
        statusCode: 500,
        success: false,
        isValid: false,
      };
    }
  }
}
