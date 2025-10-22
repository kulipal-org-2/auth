import { MikroOrmModuleAsyncOptions } from '@mikro-orm/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envConfig, envService } from './env.config';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { config as dotenvConfig } from 'dotenv';
import { Migrator, TSMigrationGenerator } from '@mikro-orm/migrations';

export const MikroOrmOptions: MikroOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    driver: PostgreSqlDriver,
    dbName: configService.get<string>(envConfig.DATABASE_NAME),
    user: configService.get<string>(envConfig.DATABASE_USER),
    password: configService.get<string>(envConfig.DATABASE_PASSWORD),
    host: configService.get<string>(envConfig.DATABASE_HOST),
    port: parseInt(
      configService.get<string>(envConfig.DATABASE_PORT) ?? '5432',
      10,
    ),
    schema: configService.get<string>('DATABASE_SCHEMA'),
    entities: ['./dist/database/entities'],
    entitiesTs: ['./src/database/entities'],
    driverOptions: {
      connection: {
        ssl: configService.get<string>('NODE_ENV') === 'production',
      },
    },
    debug: configService.get<string>('NODE_ENV') !== 'production',
    extensions: [Migrator],
    migrations: {
      tableName: 'mikro_orm_migrations',
      path: 'dist/migrations',
      pathTs: 'src/migrations',
      glob: '!(*.d).{js,ts,cjs}',
      silent: false,
      transactional: true,
      disableForeignKeys: false,
      allOrNothing: true,
      dropTables: false,
      safe: true,
      snapshot: true,
      emit: 'ts',
      generator: TSMigrationGenerator,
      fileName: (timestamp: string, name?: string) =>
        `Migration${timestamp}${name ? '_' + name : ''}`,
    },
    // metadataProvider: TsMorphMetadataProvider,
  }),
  driver: PostgreSqlDriver,
};

dotenvConfig();

const config = {
  driver: PostgreSqlDriver,
  dbName: envService(envConfig.DATABASE_NAME),
  user: envService(envConfig.DATABASE_USER),
  password: envService(envConfig.DATABASE_PASSWORD),
  host: envService(envConfig.DATABASE_HOST),
  port: parseInt(envService(envConfig.DATABASE_PORT) ?? '5432', 10),
  schema: envService(envConfig.DATABASE_SCHEMA),
  entities: ['./dist/database/entities'],
  entitiesTs: ['./src/database/entities'],
  debug: envService('NODE_ENV') !== 'production',
  extensions: [Migrator],
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    glob: '!(*.d).{js,ts,cjs}',
    silent: false,
    transactional: true,
    disableForeignKeys: false,
    allOrNothing: true,
    dropTables: false,
    safe: true,
    snapshot: true,
    emit: 'ts',
    generator: TSMigrationGenerator,
    fileName: (timestamp: string, name?: string) =>
      `Migration${timestamp}${name ? '_' + name : ''}`,
  },
  // metadataProvider: TsMorphMetadataProvider,
};

export default config;
