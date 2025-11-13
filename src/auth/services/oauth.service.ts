import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { google, people_v1 } from 'googleapis';
import { default as jwksClient } from 'jwks-rsa';
import { APPLE_ISSUER, JWKS_URI } from 'src/constants';
import { CustomLogger as Logger } from 'kulipal-shared';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { RefreshToken, User } from 'src/database';
import { createHash, randomBytes } from 'crypto';
import type { LoginResponse, RegisteredUser } from '../types/auth.type';
import { type LoginGoogleRequest } from '../types/auth.type';

const getOauthClient = ({
  client_id,
  client_secret,
}: {
  client_id: string;
  client_secret: string;
}) => {
  return new OAuth2Client(client_id, client_secret);
};

@Injectable()
export class OauthService {
  private oauthClient: OAuth2Client;
  private jwksClient: any;
  private readonly logger = new Logger(OauthService.name);
  constructor(
    private configService: ConfigService,
    private jwt: JwtService,
    private readonly em: EntityManager,
  ) {
    this.oauthClient = getOauthClient({
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '',
      client_secret:
        this.configService.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
    });

    this.jwksClient = jwksClient({
      jwksUri: JWKS_URI,
      timeout: 30000,
    });
  }

  async getUserInfo(): Promise<people_v1.Schema$Person> {
    const peopleAPI = google.people({
      version: 'v1',
      auth: this.oauthClient,
    });

    try {
      const { data } = await peopleAPI.people.get({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,phoneNumbers',
      });
      return data;
    } catch (error: any) {
      this.logger.error('Error retrieving user information:', error.message);
      throw new Error(error.message || error);
    }
  }

  @CreateRequestContext()
  async authenticateGoogleUser({
    accessToken,
    refreshToken,
  }: LoginGoogleRequest): Promise<LoginResponse> {
    try {
      this.oauthClient.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const r = await this.getUserInfo().then(async ({ emailAddresses }) => {
        const email = emailAddresses?.[0].value?.toLowerCase() ?? '';
        const d = await this.verifyUser(email);
        return d;
      });

      return r;
    } catch (error: any) {
      this.logger.warn(error);

      return {
        message: 'We could not complete that request',
        success: false,
        statusCode: 400,
        credentials: {
          accessToken: '',
          refreshToken: '',
        },
        user: null,
      };
    }
  }

  @CreateRequestContext()
  async authenticateAppleUser(code: string): Promise<LoginResponse> {
    try {
      const data = this.jwt.decode(code, {
        complete: true,
      }) as {
        header: {
          kid: string;
          alg: any;
        };
      };

      if (!data) {
        throw new Error('Invalid token');
      }
      const header = data?.header;

      const { alg, kid } = header;
      const publicKey = (
        await this.jwksClient.getSigningKey(kid)
      ).getPublicKey();

      const { email } = this.jwt.verify(code, {
        publicKey,
        algorithms: [alg],
        ignoreExpiration: false,
        issuer: APPLE_ISSUER,
      });

      return this.verifyUser(email);
    } catch (error: any) {
      this.logger.warn(error);

      return {
        message: 'We could not complete that request',
        success: false,
        statusCode: 400,
        credentials: {
          accessToken: '',
          refreshToken: '',
        },
        user: null,
      };
    }
  }

  async verifyUser(email: string) {
    const existingUser = await this.em.findOne(User, {
      email,
    });
    if (!existingUser) {
      this.logger.log(`User with email: ${email} not found`);

      return {
        message:
          "We couldn't find a user associated with that account. Please sign up.",
        statusCode: 404,
        success: false,
        credentials: {
          accessToken: '',
          refreshToken: '',
        },
        user: null,
      };
    }

    const credentials = await this.generateCredentials(existingUser.id);
    const userPayload: RegisteredUser = {
      id: existingUser.id,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      email: existingUser.email,
      phoneNumber: existingUser.phoneNumber,
      userType: existingUser.userType,
      isEmailVerified: Boolean(existingUser.isEmailVerified),
      isPhoneVerified: Boolean(existingUser.isPhoneVerified),
      source: existingUser.source ?? undefined,
    };

    return {
      message: 'Login successful',
      credentials,
      statusCode: 200,
      success: true,
      user: userPayload,
    };
  }

  private async generateCredentials(userId: string) {
    const accessToken = this.jwt.sign({ userId }, { expiresIn: '1h' });
    const refreshToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha512').update(refreshToken).digest('hex');

    await this.em
      .insert(RefreshToken, {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .catch((error) => {
        this.logger.error(
          `Failed to store refresh token for user ${userId}: ${error.message}`,
        );
        throw new Error('Internal server error. Please try again later.');
      });

    return { accessToken, refreshToken };
  }
}
