import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BusinessController } from './business/business.controller';
import { BusinessService } from './business/business.service';
import { ClientsController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [AppController, BusinessController, ClientsController],
  providers: [AppService, BusinessService, ClientsService, PrismaService],
})
export class AppModule {}
