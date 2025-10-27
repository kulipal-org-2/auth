import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { type CreateUserType } from 'kulipal-shared';
import { hash } from 'argon2';
import { CreateRequestContext, EntityManager } from '@mikro-orm/postgresql';
import { User } from 'src/database';

export type MessageResponse = {
  message: string;
  success: boolean;
  statusCode: number;
};

@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);
  constructor(
    private readonly em: EntityManager,
  ) {}

  @CreateRequestContext()
  async execute(data: CreateUserType): Promise<MessageResponse> {
    this.logger.log(`Attempting to register user with email ${data.email}`);
    const {
      email,
      firstName,
      lastName,
      password,
      phoneNumber,
      source,
      agreeToTerms,
    } = data;
    const existingUser = await this.em.findOne(User,{
      email,
    });

    if (existingUser) {
      this.logger.warn(`User with email ${email} found to already exist.`);

      return {
        message: 'There is an existing account with this email. Please login',
        success: false,
        statusCode: HttpStatus.CONFLICT,
      };
    }

    const user = this.em.create(User, {
      agreeToTerms,
      email,
      firstName,
      lastName,
      password: await hash(password),
      phoneNumber,
      source,
    });

    await this.em.persistAndFlush(user);

    this.logger.log(
      `Successfully created user with email ${email} and id ${user.id}`,
    );

    return {
      message: 'User created successfully',
      success: true,
      statusCode: HttpStatus.CREATED,
    };
  }
}
