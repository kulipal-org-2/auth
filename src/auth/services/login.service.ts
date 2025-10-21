import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { CustomLogger as Logger } from 'kulipal-shared';
import { RefreshToken, User } from 'src/database';

export type LoginType = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  credentials: {
    accessToken: string;
    refreshToken: string;
    userId: string;
  };
  statusCode: number;
  success: boolean;
};

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);
  constructor(
    private readonly em: EntityManager,
    private jwtService: JwtService,
  ) {}

  @CreateRequestContext()
  async execute(data: LoginType): Promise<LoginResponse> {
    this.logger.log(`Attempting to login user with email ${data.email}`);

    const { email, password } = data;
    const existingUser = await this.em.findOne(User, {
      email,
    });

    if (!existingUser) {
      this.logger.warn(`User with email ${email} does not exist`);

      return {
        message: 'There is no account with this email. Please sign up.',
        statusCode: 404,
        success: false,
        credentials: {
          accessToken: '',
          refreshToken: '',
          userId: '',
        },
      };
    }

    this.logger.log(`Found user with email ${email} and id ${existingUser.id}`);

    if (!existingUser.password) {
      this.logger.warn(
        `User ${existingUser.id} who signed up via ouath attempted to login with password`,
      );
      return {
        message: 'There is no account with this email. Please sign up.',
        statusCode: 404,
        success: false,
        credentials: {
          accessToken: '',
          refreshToken: '',
          userId: '',
        },
      };
    }

    if (!(await this.comparePassword(existingUser.password, password))) {
      this.logger.warn(`User with email ${email} provided incorrect password`);
      return {
        message: 'Incorrect email or password provided.',
        statusCode: 401,
        success: false,
        credentials: {
          accessToken: '',
          refreshToken: '',
          userId: '',
        },
      };
    }

    this.logger.log(
      `User with email ${email} logged in successfully at ${Date.now()}`,
    );

    const credentials = await this.generateCredentials(existingUser.id);

    return {
      message: 'Login successful',
      credentials,
      statusCode: 200,
      success: true,
    };
  }

  private comparePassword(digest: string, password: string) {
    return verify(digest, password);
  }

  private async generateCredentials(userId: string) {
    const accessToken = this.jwtService.sign({ userId }, { expiresIn: '1h' });
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

    return { accessToken, refreshToken, userId };
  }
}
