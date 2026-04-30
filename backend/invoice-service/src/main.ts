import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Tenant-Id',
        'X-User-Id',
        'X-User-Role',
        'X-Business-Id',
        'x-business-id',
        'x-request-id',
        'X-Request-Id',
      ],
      credentials: true,
      optionsSuccessStatus: 204,
    });
    const port = process.env.PORT ?? 3005;
    await app.listen(port);
    logger.log(`Invoice Service is running on: http://localhost:${port}`);
  } catch (err: any) {
    logger.error('Failed to start Invoice Service', err.stack);
  }
}
bootstrap();
