import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: RolesService;
  let jwtService: JwtService;

  const mockRolesService = {
    createRole: jest.fn(),
    getRoles: jest.fn(),
    getPermissions: jest.fn(),
    assignPermissionsToRole: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: RolesService, useValue: mockRolesService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    rolesService = module.get<RolesService>(RolesService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPayload', () => {
    it('should throw UnauthorizedException if no bearer token', async () => {
      await expect(controller.createRole('invalid', {} as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error());
      await expect(
        controller.createRole('Bearer token', {} as any),
      ).rejects.toThrow('Invalid token');
    });
  });

  describe('createRole', () => {
    it('should create role', async () => {
      const payload = { sub: 'user-1', tenantId: 'tenant-1', roles: ['ADMIN'] };
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockRolesService.createRole.mockResolvedValue({ id: 'role-1' });

      const dto = { name: 'New Role', description: 'Desc' };
      const result = await controller.createRole('Bearer token', dto as any);

      expect(result).toEqual({ id: 'role-1' });
      expect(rolesService.createRole).toHaveBeenCalledWith(
        dto,
        'user-1',
        'tenant-1',
        true,
      );
    });
  });

  describe('listRoles', () => {
    it('should list roles', async () => {
      const payload = { sub: 'user-1', company_id: 'tenant-1', roles: [] };
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockRolesService.getRoles.mockResolvedValue([]);

      const result = await controller.listRoles('Bearer token');

      expect(result).toEqual([]);
      expect(rolesService.getRoles).toHaveBeenCalledWith('tenant-1', []);
    });
  });

  describe('listPermissions', () => {
    it('should list permissions', async () => {
      mockRolesService.getPermissions.mockResolvedValue([]);
      const result = await controller.listPermissions();
      expect(result).toEqual([]);
    });
  });

  describe('assignPermissions', () => {
    it('should assign permissions', async () => {
      const payload = { sub: 'user-1', tenantId: 'tenant-1', roles: ['SUPER_ADMIN'] };
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockRolesService.assignPermissionsToRole.mockResolvedValue({ success: true });

      const dto = { permissionIds: ['p1', 'p2'] };
      const result = await controller.assignPermissions('role-1', 'Bearer token', dto as any);

      expect(result).toEqual({ success: true });
      expect(rolesService.assignPermissionsToRole).toHaveBeenCalledWith(
        'role-1',
        ['p1', 'p2'],
        'user-1',
        'tenant-1',
        true,
      );
    });
  });
});
