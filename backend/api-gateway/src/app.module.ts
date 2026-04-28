import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthProxyController, AdminProxyController, RolesProxyController } from './auth.proxy.controller';
import { AiModule } from './ai/ai.module';
import { ProxyController } from './proxy.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule],
  controllers: [ProxyController, AuthProxyController, AdminProxyController, RolesProxyController, AppController],
  providers: [AppService],
})
export class AppModule {}
