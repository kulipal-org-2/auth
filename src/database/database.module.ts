import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmOptions } from 'src/config';
import { RefreshToken, User } from './entities';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';

@Module({
  imports: [
    MikroOrmModule.forRootAsync(MikroOrmOptions),
    MikroOrmModule.forFeature([User, RefreshToken]),
  ],
  providers: [UserRepository, RefreshTokenRepository],
  exports: [UserRepository, RefreshTokenRepository],
})
export class DatabaseModule {}
