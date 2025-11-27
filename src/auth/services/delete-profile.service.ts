import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable } from '@nestjs/common';
import { CustomLogger as Logger } from 'kulipal-shared';
import { User } from 'src/database';
import type { MessageResponse } from '../types/auth.type';

@Injectable()
export class DeleteProfileService {
  private readonly logger = new Logger(DeleteProfileService.name);

  constructor(private readonly em: EntityManager) {}

  @CreateRequestContext()
  async execute(userId: string): Promise<MessageResponse> {
    this.logger.log(`Deleting profile for user ID: ${userId}`);

    try {
      const user = await this.em.findOne(User, { id: userId });

      if (!user) {
        this.logger.warn(`User with id ${userId} not found`);
        return {
          message: 'User not found',
          statusCode: HttpStatus.NOT_FOUND,
          success: false,
        };
      }

      await this.em.removeAndFlush(user);

      this.logger.log(`Successfully deleted profile for user ID: ${userId}`);

      return {
        message: 'Profile deleted successfully',
        statusCode: HttpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      this.logger.error(
        `Error deleting profile: ${error.message}`,
        error.stack,
      );
      return {
        message: 'Failed to delete profile',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
      };
    }
  }
}

