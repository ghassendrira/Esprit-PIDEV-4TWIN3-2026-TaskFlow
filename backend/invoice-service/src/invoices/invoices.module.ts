import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceReminderScheduler } from './invoice-reminder.scheduler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'change-me',
      signOptions: { expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600) },
    }),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, PrismaService, InvoiceReminderScheduler, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class InvoicesModule {}
