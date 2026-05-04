import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadGatewayException, InternalServerErrorException } from '@nestjs/common';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: PrismaService;
  let jwt: JwtService;
  const fetchMock = jest.fn();

  const mockPrisma = {
    userTenantMembership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  const mockJwt = {
    verifyAsync: jest.fn(),
  };

  beforeAll(() => {
    global.fetch = fetchMock as any;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return countries and categories', () => {
    expect(service.countries().length).toBeGreaterThan(0);
    expect(service.categories().length).toBeGreaterThan(0);
  });

  it('should return tenant data', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ id: 'm1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'tenant1',
        name: 'Acme',
        address: 'Street',
        slug: 'acme',
      }),
    });

    const result = await service.getTenant('Bearer token', 'tenant1');

    expect(result).toEqual(
      expect.objectContaining({ id: 'tenant1', name: 'Acme', slug: 'acme' }),
    );
  });

  it('should create a business', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 'tenant1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'b1',
        name: 'Biz',
        currency: 'USD',
        taxRate: 5,
        category: 'TECH',
      }),
    });

    const result = await service.createBusiness('Bearer token', {
      name: 'Biz',
      currency: 'USD',
      taxRate: 5,
      category: 'TECH',
    } as any);

    expect(result.success).toBe(true);
    expect(result.business).toEqual(
      expect.objectContaining({ id: 'b1', name: 'Biz', currency: 'USD' }),
    );
  });

  it('should get all tenants', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1', email: 'admin@test.com' });
    process.env.ADMIN_EMAIL = 'admin@test.com';
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([{ id: 't1', name: 'Tenant 1' }]),
    });

    const result = await service.getAllTenants('Bearer token');
    expect(result).toEqual([{ id: 't1', name: 'Tenant 1' }]);
  });

  it('should request a tenant', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
    mockPrisma.role.findFirst.mockResolvedValue({ id: 'r1' });
    mockPrisma.user.update.mockResolvedValue({ id: 'user1' });
    mockPrisma.userTenantMembership.findMany.mockResolvedValue([{ id: 'm1' }]);
    mockPrisma.userTenantMembership.update.mockResolvedValue({ id: 'm1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 't1', name: 'New Tenant' }),
    });

    const result = await service.requestTenant('Bearer token', { name: 'New Tenant' });
    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });

  it('should throw BadGatewayException if tenant service fails in requestTenant', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('error'),
    });

    try {
      await service.requestTenant('Bearer token', { name: 'New' });
    } catch (e) {
      expect(e).toBeInstanceOf(BadGatewayException);
    }
  });

  it('should throw InternalServerErrorException if tenant service returns invalid JSON', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error()),
      text: jest.fn().mockResolvedValue('not json'),
    });

    try {
      await service.requestTenant('Bearer token', { name: 'New' });
    } catch (e) {
      expect(e).toBeInstanceOf(InternalServerErrorException);
    }
  });

  it('should update a tenant', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 't1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 't1', name: 'Updated' }),
    });

    const result = await service.updateTenant('Bearer token', { name: 'Updated' } as any, 't1');
    expect(result.success).toBe(true);
    expect(result.tenant.name).toBe('Updated');
  });

  it('should get businesses', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 't1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([{ id: 'b1', name: 'Biz 1' }]),
    });

    const result = await service.getBusinesses('Bearer token', 't1');
    expect(result).toEqual([
      expect.objectContaining({ id: 'b1', name: 'Biz 1' }),
    ]);
  });

  it('should update a business', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 't1' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'b1', name: 'Updated Biz' }),
    });

    const result = await service.updateBusiness('Bearer token', 'b1', { name: 'Updated Biz' } as any, 't1');
    expect(result.success).toBe(true);
    expect(result.business.name).toBe('Updated Biz');
  });
});
