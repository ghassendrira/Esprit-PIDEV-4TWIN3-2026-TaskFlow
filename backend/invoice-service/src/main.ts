import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create(AppModule);
    const port = process.env.PORT ?? 3005;
    await app.listen(port);
    logger.log(`Invoice Service is running on: http://localhost:${port}`);
  } catch (err: any) {
    logger.error('Failed to start Invoice Service', err.stack);
  }
}
bootstrap();
