import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesProxyService } from './invoices.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('InvoicesProxyService', () => {
  let service: InvoicesProxyService;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(() => {
    global.fetch = jest.fn();
  });

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

    it('should return context for elevated user by email', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1', email: 'admin@test.com' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValueOnce(null); // Elevated membership
      mockPrisma.userTenantMembership.findFirst.mockResolvedValueOnce(null); // Normal membership

      const result = await (service as any).getContext('Bearer token', 'tenant1');
      expect(result.roleName).toBe('SUPER_ADMIN');
    });

    it('should throw ForbiddenException if no membership and not elevated', async () => {
      process.env.ADMIN_EMAIL = 'admin@test.com';
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1', email: 'other@test.com' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);

      await expect((service as any).getContext('Bearer token', 'tenant1')).rejects.toThrow(ForbiddenException);
    });

    it('should resolve tenant from business if not provided', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ tenantId: 'resolved-tenant' }),
      });

      const result = await (service as any).resolveTenantIdFromBusiness('bus1');
      expect(result).toBe('resolved-tenant');
    });

    it('should return correct write permissions', () => {
      expect((service as any).canWrite('ADMIN')).toBe(true);
      expect((service as any).canWrite('BUSINESS_OWNER')).toBe(false);
    });
  });
});
