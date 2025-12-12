// auth-service/src/auth/services/get-user-info-grpc.service.ts
import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { User, UserType } from 'src/database/entities/user.entity';

export interface GetUserInfoResult {
  success: boolean;
  statusCode: number;
  message: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    userType: UserType;
  } | null;
}

@Injectable()
export class GetUserInfoGrpcService {
  private readonly logger = new Logger(GetUserInfoGrpcService.name);

  constructor(private readonly em: EntityManager) {}

  @CreateRequestContext()
  async execute(userId: string): Promise<GetUserInfoResult> {
    this.logger.log(`Fetching user info for user: ${userId}`);

    try {
      const user = await this.em.findOne(User, { id: userId });

      if (!user) {
        this.logger.warn(`User with id ${userId} not found`);
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User not found',
          user: null,
        };
      }

      return {
        success: true,
        statusCode: HttpStatus.OK,
        message: 'User info retrieved successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: Boolean(user.isEmailVerified),
          isPhoneVerified: Boolean(user.isPhoneVerified),
          userType: user.userType,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error fetching user info for user ${userId}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch user info',
        user: null,
      };
    }
  }
}