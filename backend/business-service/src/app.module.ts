import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BusinessController } from './business/business.controller';
import { BusinessService } from './business/business.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [AppController, BusinessController],
  providers: [AppService, BusinessService, PrismaService],
})
export class AppModule {}
