import { BadGatewayException, BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
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
    return (process.env.EXPENSE_SERVICE_URL ?? 'http://localhost:3006').replace(/\/+$/, '') + '/expenses';
  }

  protected getServiceName(): string {
    return 'Expense';
  }
}

