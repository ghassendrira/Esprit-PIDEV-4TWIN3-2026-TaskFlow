import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesProxyService } from './expenses.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('ExpensesProxyService', () => {
  let service: ExpensesProxyService;

  const mockPrisma = {
    userTenantMembership: {
      findFirst: jest.fn(),
    },
  };

  const mockJwt = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesProxyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<ExpensesProxyService>(ExpensesProxyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build the default expense base url', () => {
    delete process.env.EXPENSE_SERVICE_URL;
    expect((service as any).getBaseUrl()).toBe('http://localhost:3006/expenses');
  });

  it('should normalize a configured expense base url', () => {
    process.env.EXPENSE_SERVICE_URL = 'http://expense-service.local/';
    expect((service as any).getBaseUrl()).toBe('http://expense-service.local/expenses');
  });

  it('should expose the service name', () => {
    expect((service as any).getServiceName()).toBe('Expense');
  });
});
