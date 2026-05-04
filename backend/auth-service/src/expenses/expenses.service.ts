import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { BaseProxyService } from '../common/base-proxy.service';

@Injectable()
export class ExpensesProxyService extends BaseProxyService {
  constructor(
    prisma: PrismaService,
    jwt: JwtService,
  ) {
    super(prisma, jwt);
  }

  protected getBaseUrl(): string {
    const baseUrl = process.env.EXPENSE_SERVICE_URL ?? 'http://localhost:3006';
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return normalizedBaseUrl + '/expenses';
  }

  protected getServiceName(): string {
    return 'Expense';
  }
}

