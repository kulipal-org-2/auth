import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CustomLogger as Logger } from 'kulipal-shared';
import { createHash, randomBytes } from 'crypto';
import { MessageResponse } from 'kulipal-shared';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { User, ResetPasswordToken } from 'src/database';
import { addMinutes } from 'date-fns';
import { NotificationService } from './notification.service';

@Injectable()
export class ForgotPasswordService {
  private readonly logger = new Logger(ForgotPasswordService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  @CreateRequestContext()
  async execute({ email }: { email: string }): Promise<MessageResponse> {
    this.logger.debug(`Forgot password requested for: ${email}`);
    try {
      const user = await this.em.findOne(User, { email });
      if (!user) {
        this.logger.warn(`No user found for email: ${email}`);
        return {
          message: `No user found for email: ${email}`,
        };
      }

      await this.cleanUpExpiredTokens();
      await this.invalidateToken({ userId: user.id });

      const { rawToken, expiresAt } = await this.generateResetToken(user.id);

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

      const expiryMinutes = 15;

      await this.notificationService.sendPasswordResetEmail({
        user,
        resetLink,
        expiryMinutes,
      });

      this.logger.debug(
        `Password reset email sent to user ID: ${user.id} at email: ${user.email}`,
      );

      return {
        message: 'Password reset link sent successfully',
        // success: true,
      };
    } catch (error) {
      this.logger.error(
        'Error generating password reset token for email:',
        email,
      );

      // For debugging, throw or return details
      throw new InternalServerErrorException({
        message: 'Internal error while generating password reset link',
        error: error,
        stack: error,
      });
    }
  }

  /**
   * Generates the password reset token
   * @param userId The user ID to generate the forgot password token
   * @returns {Promise<{ rawToken: string; expiresAt: Date }>}
   */
  private async generateResetToken(
    userId: string,
  ): Promise<{ rawToken: string; expiresAt: Date }> {
    try {
      const rawToken = randomBytes(32).toString('hex'); // 64 characters
      const tokenHash = createHash('sha512').update(rawToken).digest('hex');
      const expiresAt = addMinutes(new Date(), 15); // valid for 15 mins

      // Store the hashed token in the database
      await this.em.insert(ResetPasswordToken, {
        userId,
        tokenHash,
        expiresAt,
      });

      this.logger.debug(
        `Generated password reset token for user ID: ${userId}`,
      );
      return { rawToken, expiresAt };
    } catch (error) {
      this.logger.error(`Error generating reset token for user ID: ${userId}`);
      console.error(error);
      throw error;
    }
  }

  /**
   * Cleans up expired tokens.
   * @returns {Promise<number>} The number of deleted expired tokens.
   */
  private cleanUpExpiredTokens(): Promise<number> {
    return this.em.nativeDelete(ResetPasswordToken, {
      expiresAt: { $lt: new Date() },
    });
  }

  /**
   * Invalidates a used or compromised reset token.
   * Also invalidates when a new token is generated for the same user.
   * @param tokenHash The hash of the token to invalidate.
   * @returns {Promise<number>} The number of invalidated tokens.
   */
  private invalidateToken({
    tokenHash,
    userId,
  }: {
    tokenHash?: string;
    userId?: string;
  }): Promise<number> {
    if (tokenHash) {
      return this.em.nativeDelete(ResetPasswordToken, { tokenHash });
    }
    return this.em.nativeDelete(ResetPasswordToken, { userId });
  }
}
