import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: PrismaService;
  let jwt: JwtService;
  const fetchMock = jest.fn();

  const mockPrisma = {
    userTenantMembership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
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
});
