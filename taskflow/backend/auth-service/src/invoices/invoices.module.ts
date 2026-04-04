import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InvoicesController } from './invoices.controller';
import { InvoicesProxyService } from './invoices.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [InvoicesController],
  providers: [InvoicesProxyService],
})
export class InvoicesModule {}
