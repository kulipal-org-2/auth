import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable } from '@nestjs/common';
import { CustomLogger as Logger } from 'kulipal-shared';
import { User } from 'src/database';
import type { ProfileResponse, RegisteredUser } from '../types/auth.type';

@Injectable()
export class GetProfileService {
  private readonly logger = new Logger(GetProfileService.name);

  constructor(private readonly em: EntityManager) {}

  @CreateRequestContext()
  async execute(userId: string): Promise<ProfileResponse> {
    this.logger.log(`Fetching profile for user: ${userId}`);

    try {
      const user = await this.em.findOne(User, { id: userId });

      if (!user) {
        this.logger.warn(`User with id ${userId} not found`);
        return {
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
          user: null,
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
        source: user.source ?? undefined,
      };

      return {
        message: 'Profile retrieved successfully',
        statusCode: HttpStatus.OK,
        success: true,
        user: userPayload,
      };
    } catch (error: any) {
      this.logger.error(
        `Error fetching profile: ${error.message}`,
        error.stack,
      );
      return {
        message: 'Failed to fetch profile',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        user: null,
      };
    }
  }
}
