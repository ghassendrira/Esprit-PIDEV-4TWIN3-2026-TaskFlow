import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-User-Id', 'X-User-Role'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
    optionsSuccessStatus: 204,
  });
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3004);
}
void bootstrap();
