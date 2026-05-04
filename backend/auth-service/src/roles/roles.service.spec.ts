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

  describe('assignPermissionsToRole', () => {
    it('should assign permissions if super admin', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'CUSTOM' });
      mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.rolePermission.createMany.mockResolvedValue({ count: 2 });

      await service.assignPermissionsToRole('role-1', ['p1', 'p2'], 'admin-1', undefined, true);
      
      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role-1' } });
      expect(mockPrisma.rolePermission.createMany).toHaveBeenCalled();
    });

    it('should assign permissions if business owner for their tenant', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'CUSTOM', tenantId: 'tenant-1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        role: { name: 'BUSINESS_OWNER' },
      });

      await service.assignPermissionsToRole('role-1', ['p1'], 'user-1', 'tenant-1', false);
      expect(mockPrisma.rolePermission.createMany).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if business owner tries to modify SUPER_ADMIN', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'SUPER_ADMIN' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        role: { name: 'BUSINESS_OWNER' },
      });

      await expect(
        service.assignPermissionsToRole('role-1', ['p1'], 'user-1', 'tenant-1', false),
      ).rejects.toThrow('Business Owners cannot modify SUPER_ADMIN permissions');
    });

    it('should throw ForbiddenException if user has no membership', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'CUSTOM' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.assignPermissionsToRole('role-1', ['p1'], 'user-1', 'tenant-1', false),
      ).rejects.toThrow('Insufficient permissions to manage roles');
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([{ id: 'p1', name: 'P1' }]);
      const result = await service.getPermissions();
      expect(result).toEqual([{ id: 'p1', name: 'P1' }]);
    });
  });
});
