import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ExceptionsFilter } from './filters/exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: ['auth', 'wallet'],
      protoPath: [join(__dirname, 'proto/auth.proto'), join(__dirname, 'proto/wallet.proto')],
      url: process.env.URL,
    },
  });

  app.useGlobalFilters(new ExceptionsFilter());
  app.enableShutdownHooks();

  await app.startAllMicroservices();

  await app.listen(process.env.APP_PORT ?? 5000);
}
bootstrap().catch((error) => {
  console.error('Error during application bootstrap:', error);
  process.exit(1);
});
