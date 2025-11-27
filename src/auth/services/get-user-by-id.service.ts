import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable } from '@nestjs/common';
import { CustomLogger as Logger } from 'kulipal-shared';
import { User } from 'src/database';
import type { ProfileResponse, RegisteredUser } from '../types/auth.type';

@Injectable()
export class GetUserByIdService {
  private readonly logger = new Logger(GetUserByIdService.name);

  constructor(private readonly em: EntityManager) {}

  @CreateRequestContext()
  async execute(userId: string): Promise<ProfileResponse> {
    this.logger.log(`Fetching user by ID: ${userId}`);

    try {
      const user = await this.em.findOne(User, { id: userId });

      if (!user) {
        this.logger.warn(`User with id ${userId} not found`);
        return {
          user: null,
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
        };
      }

      const userPayload: RegisteredUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        isEmailVerified: Boolean(user.isEmailVerified),
        isPhoneVerified: Boolean(user.isPhoneVerified),
        avatarUrl: user.avatarUrl ?? undefined,
        source: user.source ?? undefined,
        isIdentityVerified: Boolean(user.isIdentityVerified),
        identityVerificationType: user.identityVerificationType ?? undefined,
      };

      return {
        user: userPayload,
        message: 'User retrieved successfully',
        statusCode: HttpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      this.logger.error(
        `Error fetching user by ID: ${error.message}`,
        error.stack,
      );
      return {
        user: null,
        message: 'Failed to fetch user',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
      };
    }
  }
}

