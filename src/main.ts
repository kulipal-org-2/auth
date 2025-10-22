import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ExceptionsFilter } from './filters/exception.filter';

async function bootstrap() {
  // const app = await NestFactory.create(AppModule);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'auth',
        protoPath: [join(__dirname, 'proto/auth.proto')],
        url: process.env.URL,
      },
    },
  );

  app.useGlobalFilters(new ExceptionsFilter());

  app.enableShutdownHooks();

  // Optional: monitor memory usage when MONITOR_MEMORY env var is set.
  if (process.env.MONITOR_MEMORY === 'true') {
    const interval = setInterval(() => {
      const mem = process.memoryUsage();
      // log RSS and heapUsed in MB
      // eslint-disable-next-line no-console
      console.log(
        `[memory-monitor] rss=${Math.round(mem.rss / 1024 / 1024)}MB heapUsed=${Math.round(
          mem.heapUsed / 1024 / 1024,
        )}MB heapTotal=${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      );
    }, 5000);

    process.on('exit', () => clearInterval(interval));
  }

  await app.listen();
}
bootstrap();
