import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('AdminController', () => {
  let controller: AdminController;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(() => {
    global.fetch = jest.fn();
  });

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
    },
    userTenantMembership: {
      findFirst: jest.fn(),
    },
  };

  const mockJwt = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
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
});
