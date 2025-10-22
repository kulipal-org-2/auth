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
      package: 'auth',
      protoPath: [join(__dirname, 'proto/auth.proto')],
      url: process.env.URL,
    },
  });

  app.useGlobalFilters(new ExceptionsFilter());

  app.enableShutdownHooks();
  await app.startAllMicroservices();

  await app.listen(5000);
}
bootstrap();
