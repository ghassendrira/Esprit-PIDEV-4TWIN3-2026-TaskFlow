import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesProxyService } from './invoices.service';

@Module({
  imports: [],
  controllers: [InvoicesController],
  providers: [InvoicesProxyService],
})
export class InvoicesModule {}
