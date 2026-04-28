import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceReminderScheduler } from './invoice-reminder.scheduler';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, PrismaService, InvoiceReminderScheduler],
})
export class InvoicesModule {}
