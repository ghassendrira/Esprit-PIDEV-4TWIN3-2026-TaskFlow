import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';

describe('ClientsService', () => {
  let service: ClientsService;

  const mockPrisma = {
    userTenantMembership: {
      findFirst: jest.fn(),
    },
  };

  const mockJwt = {
    verifyAsync: jest.fn(),
  };

  beforeAll(() => {
    global.fetch = jest.fn();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1', roles: [] });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
      text: jest.fn().mockResolvedValue(''),
      status: 200,
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveTenant', () => {
    it('should throw UnauthorizedException if no auth header', async () => {
      await expect(service.listByBusiness('', undefined, 'biz-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw Error if invalid token', async () => {
      mockJwt.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      await expect(
        service.listByBusiness('Bearer invalid', undefined, 'biz-1'),
      ).rejects.toThrow('Invalid token');
    });

    it('should authorize if user has elevated role in JWT', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        roles: ['ADMIN'],
      });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null); // No specific membership
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([{ id: 'biz-1' }]),
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      await service.listByBusiness('Bearer token', 'tenant-1', 'biz-1');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if no membership and not elevated', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1', roles: [] });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.listByBusiness('Bearer token', 'tenant-1', 'biz-1'),
      ).rejects.toThrow('No membership found for this tenant');
    });

    it('should throw UnauthorizedException if no sub in token', async () => {
      mockJwt.verifyAsync.mockResolvedValue({});
      await expect(
        service.listByBusiness('Bearer valid', undefined, 'biz-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should resolve tenant from membership if tenantId not provided', async () => {
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
      });
      // Mock assertBusinessAccess to return true
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([{ id: 'biz-1' }]),
      });
      // Mock business service call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      await service.listByBusiness('Bearer token', undefined, 'biz-1');
      expect(mockPrisma.userTenantMembership.findFirst).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if no memberships found', async () => {
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);
      await expect(
        service.listByBusiness('Bearer token', undefined, 'biz-1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('listByBusiness', () => {
    it('should return clients if authorized', async () => {
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
      });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([{ id: 'biz-1' }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([{ id: 'client-1' }]),
        });

      const result = await service.listByBusiness('Bearer token', 'tenant-1', 'biz-1');
      expect(result).toEqual([{ id: 'client-1' }]);
    });

    it('should throw UnauthorizedException if business access denied', async () => {
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([{ id: 'other-biz' }]),
      });

      await expect(
        service.listByBusiness('Bearer token', 'tenant-1', 'biz-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadGatewayException if business service returns error', async () => {
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
      });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([{ id: 'biz-1' }]),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: jest.fn().mockResolvedValue('error'),
        });

      await expect(
        service.listByBusiness('Bearer token', 'tenant-1', 'biz-1'),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('create', () => {
    it('should create client if authorized', async () => {
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
      });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([{ id: 'biz-1' }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'client-1' }),
        });

      const result = await service.create('Bearer token', 'tenant-1', {
        businessId: 'biz-1',
        name: 'New Client',
      });
      expect(result).toEqual({ id: 'client-1' });
    });
  });

  describe('get', () => {
    it('should return client if authorized', async () => {
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
      });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'client-1', businessId: 'biz-1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([{ id: 'biz-1' }]),
        });

      const result = await service.get('Bearer token', 'tenant-1', 'client-1');
      expect(result).toEqual({ id: 'client-1', businessId: 'biz-1' });
    });

    it('should throw NotFoundException if client not found', async () => {
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 404,
      });

      await expect(
        service.get('Bearer token', 'tenant-1', 'client-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update client if authorized', async () => {
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
      });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'client-1', businessId: 'biz-1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([{ id: 'biz-1' }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'client-1', name: 'Updated' }),
        });

      const result = await service.update('Bearer token', 'tenant-1', 'client-1', {
        name: 'Updated',
      });
      expect(result).toEqual({ id: 'client-1', name: 'Updated' });
    });
  });

  describe('remove', () => {
    it('should remove client if authorized', async () => {
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
      });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'client-1', businessId: 'biz-1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([{ id: 'biz-1' }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true }),
        });

      const result = await service.remove('Bearer token', 'tenant-1', 'client-1');
      expect(result).toEqual({ success: true });
    });
  });
});
