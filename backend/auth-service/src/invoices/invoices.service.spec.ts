import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesProxyService } from './invoices.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('InvoicesProxyService', () => {
  let service: InvoicesProxyService;
  let prisma: PrismaService;
  let jwt: JwtService;

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
        InvoicesProxyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<InvoicesProxyService>(InvoicesProxyService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getContext', () => {
    it('should throw UnauthorizedException if no auth header', async () => {
      await expect((service as any).getContext(undefined, 'tenant1')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if no tenantId', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
      await expect((service as any).getContext('Bearer token', undefined)).rejects.toThrow(BadRequestException);
    });

    it('should return context on valid inputs', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1', email: 'test@test.com' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant1',
        role: { name: 'ADMIN' },
      });

      const result = await (service as any).getContext('Bearer token', 'tenant1');
      expect(result).toEqual({
        userId: 'user1',
        tenantId: 'tenant1',
        roleName: 'ADMIN',
      });
    });
  });
});
