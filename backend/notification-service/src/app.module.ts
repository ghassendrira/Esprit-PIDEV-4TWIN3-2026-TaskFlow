import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationController } from './notification.controller';
import { NotificationHttpController } from './notification.http.controller';
import { NotificationService } from './notification.service';
import { PdfModule } from './pdf/pdf.module';
import { ChatModule } from './chat/chat.module';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      // Must match auth-service JWT_SECRET, otherwise every guarded route returns 401.
      secret: process.env.JWT_SECRET ?? 'change-me',
      signOptions: { expiresIn: '1h' },
    }),
    PdfModule,
    ChatModule,
  ],
  controllers: [AppController, NotificationController, NotificationHttpController],
  providers: [AppService, NotificationService, JwtStrategy],
})
export class AppModule {}
