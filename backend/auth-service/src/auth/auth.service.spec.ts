import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(),
    keyuri: jest.fn(),
    verify: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(() => {
    global.fetch = jest.fn();
  });

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    userTenantMembership: {
      findFirst: jest.fn(),
    },
  };

  const mockJwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.update.mockResolvedValue(null);
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);
    mockJwt.signAsync.mockResolvedValue('jwt-token');
    mockJwt.verifyAsync.mockResolvedValue({ sub: '1' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue(''),
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signin', () => {
    it('should throw BadRequestException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.signin('test@test.com', 'password', 'token')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if account is blocked', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@test.com',
        blockedUntil: futureDate,
        registrationStatus: 'ACTIVE',
        isActive: true,
        passwordHash: 'hash',
      });
      // Mock verifyRecaptcha to return true
      jest.spyOn(service as any, 'verifyRecaptcha').mockResolvedValue(true);

      await expect(service.signin('test@test.com', 'password', 'token')).rejects.toThrow(ForbiddenException);
    });

    it('should return token on successful signin', async () => {
      const password = 'password';
      const hash = await bcrypt.hash(password, 10);
      const user = {
        id: '1',
        email: 'test@test.com',
        passwordHash: hash,
        registrationStatus: 'ACTIVE',
        isActive: true,
        blockedUntil: null,
        loginAttempts: 0,
        is2faEnabled: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant1',
        role: { name: 'ADMIN' },
      });
      mockJwt.signAsync.mockResolvedValue('jwt-token');
      jest.spyOn(service as any, 'verifyRecaptcha').mockResolvedValue(true);
      jest.spyOn(service as any, 'handleWelcomeEmail').mockResolvedValue(undefined);

      const result = await service.signin('test@test.com', password, 'token');
      expect(result.token).toBe('jwt-token');
      expect(result.requires2fa).toBe(false);
    });
  });

  describe('slugify', () => {
    it('should normalize and format string correctly', () => {
      const input = 'Hello World Éaccent!';
      const result = (service as any).slugify(input);
      expect(result).toBe('hello-world-eaccent');
    });
  });

  describe('changePassword', () => {
    const baseUser = {
      id: '1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: '',
      mustChangePassword: true,
      isActive: true,
      registrationStatus: 'ACTIVE',
    };

    it('should throw UnauthorizedException when auth header is missing', async () => {
      await expect(
        service.changePassword('', { currentPassword: 'old', newPassword: 'NewPass1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when account is not approved', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        isActive: false,
      });

      await expect(
        service.changePassword('Bearer token', {
          currentPassword: 'old',
          newPassword: 'NewPass1!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password change not required', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        mustChangePassword: false,
      });

      await expect(
        service.changePassword('Bearer token', {
          currentPassword: 'old',
          newPassword: 'NewPass1!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when current password is invalid', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockJwt.verifyAsync.mockResolvedValue({ sub: '1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash: hash,
      });

      await expect(
        service.changePassword('Bearer token', {
          currentPassword: 'wrong',
          newPassword: 'NewPass1!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update password and return new token on success', async () => {
      const hash = await bcrypt.hash('oldPass', 10);
      mockJwt.verifyAsync.mockResolvedValue({ sub: '1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash: hash,
      });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-1',
        role: { name: 'ADMIN' },
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'TaskFlow' }),
      } as any);
      mockJwt.signAsync.mockResolvedValue('new-token');

      const result = await service.changePassword('Bearer token', {
        currentPassword: 'oldPass',
        newPassword: 'NewPass1!',
      });

      expect(result.token).toBe('new-token');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          passwordHash: expect.any(String),
          mustChangePassword: false,
          tempPassword: null,
          welcomeEmailSent: true,
        },
      });
    });
  });
});
