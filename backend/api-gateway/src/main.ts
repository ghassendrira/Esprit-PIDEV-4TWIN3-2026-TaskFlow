import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { randomUUID } from 'crypto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  app.enableCors({
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Access-Control-Allow-Origin',
      'Origin',
      'X-Tenant-Id',
      'x-user-id',
      'x-user-role',
      'x-tenant-id',
      'x-business-id',
      'x-employee-user-id',
      'x-request-id',
      'X-User-Id',
      'X-User-Role',
      'X-Business-Id',
      'X-Employee-User-Id',
      'X-Request-Id',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use((req, res, next) => {
    const incoming = String(req.headers['x-request-id'] || '').trim();
    const requestId = incoming || randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const startedAt = Date.now();
    console.log(`[RID:${requestId}] ${req.method} ${req.originalUrl}`);
    res.on('finish', () => {
      console.log(
        `[RID:${requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`,
      );
    });
    next();
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API Gateway is running on: http://localhost:${port}`);
}
bootstrap();