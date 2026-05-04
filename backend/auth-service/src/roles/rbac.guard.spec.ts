import { Test, TestingModule } from '@nestjs/testing';
import { RBACGuard } from './rbac.guard';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('RBACGuard', () => {
  let guard: RBACGuard;
  let reflector: Reflector;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockPrisma = {
    userTenantMembership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockJwt = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RBACGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    guard = module.get<RBACGuard>(RBACGuard);
    reflector = module.get<Reflector>(Reflector);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow if no permissions required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if no auth header', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['perm1']);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token invalid', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['perm1']);
    mockJwt.verifyAsync.mockRejectedValue(new Error());
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer invalid' },
        }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow('Invalid token');
  });

  it('should throw ForbiddenException if userId or tenantId missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['perm1']);
    mockJwt.verifyAsync.mockResolvedValue({});
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid' },
        }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow if user is global SUPER_ADMIN', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['perm1']);
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1', tenantId: 'tenant-1' });
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ id: 'm1' });
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid' },
        }),
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow if user has required permissions', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['perm1']);
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1', tenantId: 'tenant-1' });
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);
    mockPrisma.userTenantMembership.findMany.mockResolvedValue([
      {
        role: {
          permissions: [
            { permission: { name: 'perm1' } },
          ],
        },
      },
    ]);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid' },
        }),
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if permissions missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['perm1']);
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1', tenantId: 'tenant-1' });
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);
    mockPrisma.userTenantMembership.findMany.mockResolvedValue([
      {
        role: {
          permissions: [
            { permission: { name: 'other' } },
          ],
        },
      },
    ]);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid' },
        }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
