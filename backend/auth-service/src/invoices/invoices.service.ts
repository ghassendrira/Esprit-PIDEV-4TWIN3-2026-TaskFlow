import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { BaseProxyService } from '../common/base-proxy.service';

@Injectable()
export class InvoicesProxyService extends BaseProxyService {
  constructor(
    prisma: PrismaService,
    jwt: JwtService,
  ) {
    super(prisma, jwt);
  }

  protected getBaseUrl(): string {
    return (process.env.INVOICE_SERVICE_URL ?? 'http://localhost:3007').replace(/\/+$/, '') + '/invoices';
  }

  protected getServiceName(): string {
    return 'Invoice';
  }
}

