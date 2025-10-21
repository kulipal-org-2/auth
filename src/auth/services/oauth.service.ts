import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { google, people_v1 } from 'googleapis';
import { default as jwksClient } from 'jwks-rsa';
import { APPLE_ISSUER, JWKS_URI } from 'src/constants';
import { CustomLogger as Logger } from 'kulipal-shared';
// import { APPLE_ISSUER, JWKS_URI } from 'src/constants';
// import * as jwtTool from 'jsonwebtoken';
// import { RpcException } from '@nestjs/microservices';
// import { LoginSaga } from './sagas/login/login.saga';
// import { EUserType, Login } from 'src/types/interface';
// import { UserAdapter } from 'src/outbound/user.adapter';
// import { JwtTokenAdapter } from 'src/outbound/jwtToken.adapter';
// import * as dayjs from 'dayjs';
// import { UserNotificationTokenAdapter } from 'src/outbound/user-notification-token.adapter';

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
  private oauthClient: OAuth2Client; // Google Oauth Client
  private jwksClient: any; // Apple Oauth Client
  private readonly logger = new Logger(OauthService.name);
  constructor(
    private configService: ConfigService,
    private jwt: JwtService,
    // private user: UserAdapter,
    // private jwtToken: JwtTokenAdapter,
    // private userNofificationToken: UserNotificationTokenAdapter,
    // private loginSaga: LoginSaga,
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

  async authenticateGoogleUser({
    access_token: accessToken,
    refresh_token: refreshToken,
    notificationToken,
  }) {
    try {
      this.oauthClient.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const r = await this.getUserInfo().then(async ({ emailAddresses }) => {
        const email = emailAddresses?.[0].value?.toLowerCase() ?? '';
        const d = await this.verifyUser(email, notificationToken);
        return d;
      });

      return r;
    } catch (error: any) {
      this.logger.warn(error);
      throw new Error(error.message || error);
    }
  }

  async authenticateAppleUser(code: string, notificationToken: string) {
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

      //   const= {
      //     algorithms: [alg],
      //     ignoreExpiration: false,
      //     issuer: APPLE_ISSUER,
      //   }
      const { email } = this.jwt.verify(code, publicKey);

      return this.verifyUser(email, notificationToken);
    } catch (error: any) {
      this.logger.warn(error);

      throw new Error(error['message'] || error);
    }
  }

  async verifyUser(email: string, notificationToken: string) {
    // const _user = await this.user.getUnique(
    //   { email },
    //   { profile: { select: { id: true, industry: true } } },
    // );
    // if (!_user) {
    //   this.logger.log(`User with email: ${email} not found`);

    //   throw new Error('User not registered. Please sign up');
    // }

    const user = {
      //   type: _user.type,
      //   email: _user.email,
      //   id: _user.id,
      //   isEmailVerified: _user.isEmailVerified,
      //   isKycVerified: _user.isKycVerified,
      //   hasProfile: !!_user.profileId,
      //   industry: _user?.profile?.industry,
    };

    const access_token = await this.createAccessToken(user);
    const refresh_token = await this.createRefreshToken();

    // const expiryDate = dayjs().add(30, 'day').toDate();

    return {
      access_token: access_token,
      //   access_token_expires_on: expiryDate,
      refresh_token: refresh_token,
      date: new Date(),
      ...user,
    };
  }

  private async createAccessToken(payload: object) {
    return this.jwt.sign(payload);
  }

  private async createRefreshToken() {
    return this.jwt.sign(
      {
        type: 'refresh',
      },
      {
        expiresIn: '90D',
      },
    );
  }
}
