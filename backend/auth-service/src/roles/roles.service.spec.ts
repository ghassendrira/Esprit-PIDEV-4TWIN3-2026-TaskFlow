import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma.service';

describe('RolesService', () => {
  let service: RolesService;

  const mockPrisma = {
    role: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      upsert: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      upsert: jest.fn(),
    },
    userTenantMembership: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.role.findMany.mockResolvedValue([]);
    mockPrisma.role.findFirst.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({ id: 'role-1', name: 'ADMIN' });
    mockPrisma.permission.findMany.mockResolvedValue([]);
    mockPrisma.rolePermission.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.userTenantMembership.findMany.mockResolvedValue([]);
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should create standard roles and upsert permissions', async () => {
      mockPrisma.permission.upsert.mockResolvedValue({ id: 'perm-1', name: 'Create_User' });
      mockPrisma.role.findFirst.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue({ id: 'role-1', name: 'ADMIN' });
      mockPrisma.role.findMany.mockResolvedValue([{ id: 'role-1' }]);
      mockPrisma.rolePermission.upsert.mockResolvedValue({});

      await service.onModuleInit();
      
      expect(mockPrisma.permission.upsert).toHaveBeenCalled();
      expect(mockPrisma.role.create).toHaveBeenCalled();
    });
  });

  describe('getRoles', () => {
    it('should attach userCount per role', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'role-1', name: 'ADMIN', permissions: [] },
      ]);
      mockPrisma.userTenantMembership.findMany.mockResolvedValue([
        { roleId: 'role-1' },
        { roleId: 'role-1' },
      ]);

      const result = await service.getRoles('tenant-1', ['ADMIN']);

      expect(result[0].userCount).toBe(2);
    });
  });

  describe('createRole', () => {
    it('should throw when role already exists', async () => {
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-1', name: 'ADMIN' });

      await expect(
        service.createRole({ name: 'ADMIN' } as any, 'user-1', 'tenant-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
