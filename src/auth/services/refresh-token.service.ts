import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomLogger as Logger } from 'kulipal-shared';
import { createHash, randomBytes } from 'crypto';
import { LoginResponse } from './login.service';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { RefreshToken } from 'src/database';

@Injectable()
export class RefreshAccessTokenService {
  private readonly logger = new Logger(RefreshAccessTokenService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
  ) {}

  @CreateRequestContext()
  async execute({
    userId,
    refreshToken,
  }: {
    userId: string;
    refreshToken: string;
  }): Promise<LoginResponse> {
    const hashed = createHash('sha512').update(refreshToken).digest('hex');
    console.log(hashed);

    const token = await this.em.findOne(RefreshToken, {
      userId,
      tokenHash: hashed,
    });

    if (!token) {
      this.logger.warn(
        `Refresh failed: No matching token found for user ${userId}`,
      );
      return {
        success: false,
        statusCode: 401,
        message: 'The refresh token provided is invalid.',
        credentials: {
          accessToken: '',
          refreshToken: '',
          userId: '',
        },
      };
    }

    const newRawRefreshToken = randomBytes(32).toString('base64url');
    const newHashedRefreshToken = createHash('sha512')
      .update(newRawRefreshToken)
      .digest('hex');

    await this.em.upsert(
      RefreshToken,
      {
        tokenHash: newHashedRefreshToken,
        userId,
        id: token.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      },
      {
        onConflictFields: ['id'],
      },
    );

    const accessToken = this.jwtService.sign(
      {
        userId,
      },
      {
        expiresIn: '1h',
      },
    );

    const credentials = {
      accessToken,
      refreshToken: newRawRefreshToken,
      userId,
    };

    return {
      statusCode: 200,
      success: true,
      message: 'Token refreshed successfully',
      credentials,
    };
  }
}
