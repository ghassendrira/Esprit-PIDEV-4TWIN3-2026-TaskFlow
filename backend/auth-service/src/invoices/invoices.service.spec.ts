import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesProxyService } from './invoices.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  BadGatewayException,
} from '@nestjs/common';

describe('InvoicesProxyService', () => {
  let service: InvoicesProxyService;
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
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1', email: 'user@test.com', roles: [] });
    fetchMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesProxyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<InvoicesProxyService>(InvoicesProxyService);
  });

  const jsonResponse = (body: unknown, ok = true) => ({
    ok,
    json: jest.fn().mockResolvedValue(body),
  });

  const currentBaseUrl = () => (service as any).getBaseUrl() as string;

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
      fetchMock.mockResolvedValue(jsonResponse({ tenantId: 'resolved-tenant' }));

      const result = await (service as any).resolveTenantIdFromBusiness('bus1');
      expect(result).toBe('resolved-tenant');
    });

    it('should use elevated jwt role when membership is missing', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1', email: 'user@test.com', roles: ['admin'] });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValueOnce(null);
      mockPrisma.userTenantMembership.findFirst.mockResolvedValueOnce(null);

      const result = await (service as any).getContext('Bearer token', 'tenant1');
      expect(result.roleName).toBe('ADMIN');
    });

    it('should return correct write permissions', () => {
      expect((service as any).canWrite('ADMIN')).toBe(true);
      expect((service as any).canWrite('BUSINESS_OWNER')).toBe(false);
    });
  });

  describe('proxy operations', () => {
    it('should validate that a business belongs to a tenant', async () => {
      fetchMock.mockResolvedValue(jsonResponse([{ id: 'business-1' }]));
      await expect(
        (service as any).assertBusinessInTenant('tenant-1', 'business-1'),
      ).resolves.toBeUndefined();
    });

    it('should reject when a business is not in the tenant', async () => {
      fetchMock.mockResolvedValue(jsonResponse([{ id: 'other-business' }]));
      await expect(
        (service as any).assertBusinessInTenant('tenant-1', 'business-1'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('should list invoices by business', async () => {
      jest.spyOn(service as any, 'resolveTenantIdFromBusiness').mockResolvedValue('tenant-1');
      jest.spyOn(service as any, 'getContext').mockResolvedValue({
        userId: 'user-1',
        tenantId: 'tenant-1',
        roleName: 'ADMIN',
      });
      jest.spyOn(service as any, 'assertBusinessInTenant').mockResolvedValue(undefined);
      fetchMock.mockResolvedValue(jsonResponse([{ id: 'invoice-1' }]));

      const result = await service.listByBusiness('Bearer token', 'null', 'business-1');

      expect(result).toEqual([{ id: 'invoice-1' }]);
      expect(fetchMock).toHaveBeenCalledWith(`${currentBaseUrl()}/by-business/business-1`);
    });

    it('should create an invoice for the authenticated user', async () => {
      jest.spyOn(service as any, 'getContext').mockResolvedValue({
        userId: 'user-1',
        tenantId: 'tenant-1',
        roleName: 'ADMIN',
      });
      jest.spyOn(service as any, 'assertBusinessInTenant').mockResolvedValue(undefined);
      fetchMock.mockResolvedValue(jsonResponse({ id: 'invoice-1' }));

      const result = await service.create('Bearer token', 'tenant-1', {
        businessId: 'business-1',
        totalAmount: 120,
      });

      expect(result).toEqual({ id: 'invoice-1' });
      expect(fetchMock).toHaveBeenCalledWith(currentBaseUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'business-1',
          totalAmount: 120,
          createdBy: 'user-1',
        }),
      });
    });

    it('should allow assigning another creator for admin when membership exists', async () => {
      jest.spyOn(service as any, 'getContext').mockResolvedValue({
        userId: 'user-1',
        tenantId: 'tenant-1',
        roleName: 'SUPER_ADMIN',
      });
      jest.spyOn(service as any, 'assertBusinessInTenant').mockResolvedValue(undefined);
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ id: 'membership-1' });
      fetchMock.mockResolvedValue(jsonResponse({ id: 'invoice-1' }));

      await service.create('Bearer token', 'tenant-1', {
        businessId: 'business-1',
        createdByUserId: 'user-2',
      });

      expect(fetchMock).toHaveBeenCalledWith(currentBaseUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'business-1',
          createdBy: 'user-2',
        }),
      });
    });

    it('should reject create when businessId is missing', async () => {
      jest.spyOn(service as any, 'getContext').mockResolvedValue({
        userId: 'user-1',
        tenantId: 'tenant-1',
        roleName: 'ADMIN',
      });

      await expect(service.create('Bearer token', 'tenant-1', {})).rejects.toThrow(BadRequestException);
    });

    it('should reject create for read-only roles', async () => {
      jest.spyOn(service as any, 'getContext').mockResolvedValue({
        userId: 'user-1',
        tenantId: 'tenant-1',
        roleName: 'BUSINESS_OWNER',
      });

      await expect(
        service.create('Bearer token', 'tenant-1', { businessId: 'business-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject create when assigned user is not in the company', async () => {
      jest.spyOn(service as any, 'getContext').mockResolvedValue({
        userId: 'user-1',
        tenantId: 'tenant-1',
        roleName: 'ADMIN',
      });
      jest.spyOn(service as any, 'assertBusinessInTenant').mockResolvedValue(undefined);
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.create('Bearer token', 'tenant-1', {
          businessId: 'business-1',
          createdByUserId: 'user-2',
        }),
      ).rejects.toThrow('Target user not in this company');
    });

    it('should update an invoice and strip creator fields', async () => {
      jest.spyOn(service as any, 'getContext').mockResolvedValue({
        userId: 'user-1',
        tenantId: 'tenant-1',
        roleName: 'ADMIN',
      });
      jest.spyOn(service as any, 'assertBusinessInTenant').mockResolvedValue(undefined);
      fetchMock.mockResolvedValue(jsonResponse({ id: 'invoice-1', totalAmount: 99 }));

      const result = await service.update('Bearer token', 'tenant-1', 'invoice-1', {
        businessId: 'business-1',
        createdBy: 'user-x',
        createdByUserId: 'user-y',
        totalAmount: 99,
      });

      expect(result).toEqual({ id: 'invoice-1', totalAmount: 99 });
      expect(fetchMock).toHaveBeenCalledWith(`${currentBaseUrl()}/invoice-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'business-1',
          totalAmount: 99,
        }),
      });
    });

    it('should remove an invoice', async () => {
      jest.spyOn(service as any, 'getContext').mockResolvedValue({
        userId: 'user-1',
        tenantId: 'tenant-1',
        roleName: 'ADMIN',
      });
      fetchMock.mockResolvedValue({ ok: true });

      await expect(service.remove('Bearer token', 'tenant-1', 'invoice-1')).resolves.toEqual({
        success: true,
      });
      expect(fetchMock).toHaveBeenCalledWith(`${currentBaseUrl()}/invoice-1`, {
        method: 'DELETE',
      });
    });
  });
});
