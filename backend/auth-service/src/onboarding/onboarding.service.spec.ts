import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: PrismaService;
  let jwt: JwtService;
  const fetchMock = jest.fn();

  beforeAll(() => {
    global.fetch = fetchMock as any;
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
    jest.clearAllMocks();
    fetchMock.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveTenantIdFromAuth', () => {
    it('should throw UnauthorizedException if auth header invalid', async () => {
      await expect((service as any).resolveTenantIdFromAuth('invalid')).rejects.toThrow(UnauthorizedException);
    });

    it('should return tenantId from membership', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 'tenant1' });

      const result = await (service as any).resolveTenantIdFromAuth('Bearer token');
      expect(result).toEqual({ userId: 'user1', tenantId: 'tenant1' });
    });
  });

  describe('companySetup', () => {
    it('should patch tenant profile with merged branding', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 'tenant1' });
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ branding: { theme: 'dark' } }) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ id: 'tenant1' }) });

      const result = await service.companySetup('Bearer token', {
        name: 'Acme',
        address: 'Street',
        slug: 'Acme Inc',
        country: 'TN',
        phone: '123',
        logoUrl: 'logo',
      } as any);

      expect(result.success).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/tenants/tenant1'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  describe('status', () => {
    it('should return setup completed when business count > 0', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 'tenant1' });
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ slug: 'acme' }) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ count: 2 }) });

      const result = await service.status('Bearer token');

      expect(result).toEqual({ isSetupCompleted: true, tenantSlug: 'acme' });
    });

    it('should return setup NOT completed when slug missing', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 'tenant1' });
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ slug: null }) });

      const result = await service.status('Bearer token');
      expect(result.isSetupCompleted).toBe(false);
    });

    it('should return setup NOT completed when business count is 0', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 'tenant1' });
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ slug: 'acme' }) })
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ count: 0 }) });

      const result = await service.status('Bearer token');
      expect(result.isSetupCompleted).toBe(false);
    });
  });

  describe('createBusiness', () => {
    it('should create a business', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 'tenant1' });
      fetchMock.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'b1', name: 'Biz' }),
      });

      const result = await service.createBusiness('Bearer token', { name: 'Biz' } as any);
      expect(result.success).toBe(true);
      expect(result.business).toEqual({ id: 'b1', name: 'Biz' });
    });
  });
});
