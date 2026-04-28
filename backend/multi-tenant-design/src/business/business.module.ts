import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { Invoice } from '../entities/Invoice.entity';
import { Client } from '../entities/Client.entity';
import { Expense } from '../entities/Expense.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Client, Expense]),
  ],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
