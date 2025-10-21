import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmOptions } from 'src/config';
import { User } from './entities';

@Module({
  imports: [
    MikroOrmModule.forRootAsync(MikroOrmOptions),
    MikroOrmModule.forFeature([User]),
  ],
})
export class DatabaseModule {}
