import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('AdminController', () => {
  let controller: AdminController;
  let prisma: PrismaService;
  let jwt: JwtService;
  const fetchMock = jest.fn();

  beforeAll(() => {
    global.fetch = fetchMock as any;
  });

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
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
      controllers: [AdminController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registrations', () => {
    it('should throw UnauthorizedException if auth header is missing', async () => {
      await expect(controller.registrations('')).rejects.toThrow(UnauthorizedException);
    });

    it('should return pending registrations for super admin', async () => {
      const mockPayload = { sub: 'admin-id' };
      mockJwt.verifyAsync.mockResolvedValue(mockPayload);
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        role: { name: 'SUPER_ADMIN' },
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', memberships: [] },
      ]);

      const result = await controller.registrations('Bearer token');
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });
  });

  describe('blockedAccounts', () => {
    it('should return blocked users for super admin', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'admin-id' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        role: { name: 'SUPER_ADMIN' },
      });
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@test.com',
          blockedUntil: new Date(),
          loginAttempts: 2,
          createdAt: new Date(),
          memberships: [{ tenantId: 't1', role: { name: 'ADMIN' } }],
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ name: 'Acme' }) });

      const result = await controller.blockedAccounts('Bearer token');

      expect(result[0].companyName).toBe('Acme');
      expect(result[0].roleName).toBe('ADMIN');
    });
  });

  describe('approve', () => {
    it('should approve pending user and notify', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'admin-id' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        role: { name: 'SUPER_ADMIN' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u1@test.com',
        firstName: 'U1',
        lastName: 'L1',
        registrationStatus: 'PENDING',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', email: 'u1@test.com' });
      fetchMock.mockResolvedValue({ ok: true }); // notify approval

      const result = await controller.approve('Bearer token', 'u1');
      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ registrationStatus: 'ACTIVE' }),
      }));
    });
  });

  describe('reject', () => {
    it('should reject pending user', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'admin-id' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        role: { name: 'SUPER_ADMIN' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u1@test.com',
        firstName: 'U1',
        lastName: 'L1',
        registrationStatus: 'PENDING',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', email: 'u1@test.com' });
      fetchMock.mockResolvedValue({ ok: true }); // notify rejection

      const result = await controller.reject('Bearer token', 'u1', { reason: 'No' });
      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ registrationStatus: 'REJECTED' }),
      }));
    });
  });

  describe('unblockAccount', () => {
    it('should unblock user', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'admin-id' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        role: { name: 'SUPER_ADMIN' },
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      const result = await controller.unblockAccount('Bearer token', 'u1');
      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ loginAttempts: 0, blockedUntil: null }),
      }));
    });

    it('should unblock account when user exists (legacy test case)', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'admin-id' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        role: { name: 'SUPER_ADMIN' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'jane@test.com' });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      const result = await controller.unblockAccount('Bearer token', 'u1');

      expect(result.success).toBe(true);
    });
  });
});
