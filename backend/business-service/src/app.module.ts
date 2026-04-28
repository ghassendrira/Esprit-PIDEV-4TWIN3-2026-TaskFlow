import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BusinessController } from './business/business.controller';
import { BusinessService } from './business/business.service';
import { ClientsController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './roles/roles.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'change-me',
      signOptions: { expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600) },
    }),
  ],
  controllers: [AppController, BusinessController, ClientsController],
  providers: [AppService, BusinessService, ClientsService, PrismaService, JwtAuthGuard, RolesGuard],
})
export class AppModule {}
