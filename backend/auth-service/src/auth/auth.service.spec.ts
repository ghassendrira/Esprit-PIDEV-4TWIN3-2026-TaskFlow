import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qr'),
}));

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
      findMany: jest.fn(),
    },
    userTenantMembership: {
      findFirst: jest.fn(),
    },
    securityQuestion: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    passwordResetRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);
    mockPrisma.securityQuestion.create.mockResolvedValue({
      id: 'sq-1',
      question: 'Q?',
    });
    mockPrisma.securityQuestion.findMany.mockResolvedValue([]);
    mockPrisma.passwordResetRequest.create.mockResolvedValue(null);
    mockPrisma.passwordResetRequest.findMany.mockResolvedValue([]);
    mockPrisma.passwordResetRequest.findUnique.mockResolvedValue(null);
    mockPrisma.passwordResetRequest.update.mockResolvedValue(null);
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

  describe('2FA', () => {
    it('should generate 2fa secret and qr code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@test.com',
        twoFaSecret: null,
        is2faEnabled: false,
      });
      mockPrisma.user.update.mockResolvedValue({ id: '1' });
      (service as any).otplib.generateSecret = jest.fn().mockReturnValue('secret');
      (service as any).otplib.keyuri = jest.fn().mockReturnValue('otpauth://mock');

      const result = await service.generate2faSecret('1');

      expect(result.secret).toBeDefined();
      expect(result.qrCodeDataUrl).toContain('data:image/png');
    });

    it('should enable 2fa when otp is valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ twoFaSecret: 'secret' });
      (service as any).otplib.verify = jest.fn().mockReturnValue(true);

      const result = await service.enable2fa('1', '123456');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should reject 2fa enable when otp is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ twoFaSecret: 'secret' });
      (service as any).otplib.verify = jest.fn().mockReturnValue(false);

      await expect(service.enable2fa('1', '000000')).rejects.toThrow(BadRequestException);
    });
  });

  describe('security questions', () => {
    it('should set security question for user', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '1' });

      const result = await service.setSecurityQuestions('Bearer token', {
        question: 'Q?',
        answer: 'Answer',
      } as any);

      expect(result.success).toBe(true);
      expect(mockPrisma.securityQuestion.create).toHaveBeenCalled();
    });

    it('should return security questions', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '1' });
      mockPrisma.securityQuestion.findMany.mockResolvedValue([
        { id: 'sq-1', question: 'Q1' },
      ]);

      const result = await service.getSecurityQuestions('Bearer token');

      expect(result).toEqual([{ id: 'sq-1', question: 'Q1' }]);
    });
  });

  describe('forgot password', () => {
    it('should return not found when user missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'missing@test.com' } as any);

      expect(result.hasSecurityQuestions).toBe(false);
    });

    it('should return questions when present', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.securityQuestion.findMany.mockResolvedValue([
        { question: 'Q1' },
        { question: 'Q2' },
      ]);

      const result = await service.forgotPassword({ email: 'user@test.com' } as any);

      expect(result.hasSecurityQuestions).toBe(true);
      expect(result.questions).toEqual(['Q1', 'Q2']);
      expect(result.userId).toBe('1');
    });
  });

  describe('send reset email', () => {
    it('should update reset token and call notification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        firstName: 'Test',
        lastName: 'User',
      });

      const result = await service.sendResetEmail('user@test.com');

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reject when token not found', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await expect(
        service.resetPassword({ resetToken: 'bad', newPassword: 'NewPass1!' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reset password when token valid', async () => {
      const hash = await bcrypt.hash('token', 10);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', resetTokenHash: hash },
      ]);

      const result = await service.resetPassword({ resetToken: 'token', newPassword: 'NewPass1!' } as any);

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('switchTenant', () => {
    it('should reject when membership missing', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue(null);

      await expect(service.switchTenant('Bearer token', 'tenant-1')).rejects.toThrow(UnauthorizedException);
    });
  });
});
