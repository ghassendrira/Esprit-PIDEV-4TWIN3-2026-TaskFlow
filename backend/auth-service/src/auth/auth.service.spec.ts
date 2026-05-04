import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  BadGatewayException,
  InternalServerErrorException,
} from '@nestjs/common';
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
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
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

  describe('signup', () => {
    it('should throw BadRequestException if recaptcha is missing', async () => {
      await expect(service.signup({ recaptchaToken: '' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should return already registered response if user exists', async () => {
      jest.spyOn(service as any, 'verifyRecaptcha').mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 't1' });

      const result = await service.signup({
        email: 'test@test.com',
        firstName: 'F',
        lastName: 'L',
        companyName: 'C',
        recaptchaToken: 'token',
      } as any);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Si cette adresse email est éligible');
    });

    it('should create user and tenant if not exists', async () => {
      jest.spyOn(service as any, 'verifyRecaptcha').mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
        }) // create tenant
        .mockResolvedValueOnce({ ok: true }); // notify admin

      (mockPrisma as any).$transaction = jest.fn().mockImplementation(async (cb) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue({
              id: 'u1',
              firstName: 'F',
              lastName: 'L',
              email: 'test@test.com',
              isActive: false,
            }),
          },
          role: {
            findFirst: jest.fn().mockResolvedValue({ id: 'r1' }),
          },
          userTenantMembership: {
            upsert: jest.fn(),
          },
        };
        return await cb(tx);
      });

      const result = await service.signup({
        email: 'test@test.com',
        firstName: 'F',
        lastName: 'L',
        companyName: 'C',
        recaptchaToken: 'token',
      } as any);

      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException if fields are missing', async () => {
      jest.spyOn(service as any, 'verifyRecaptcha').mockResolvedValue(true);
      await expect(service.signup({ recaptchaToken: 'token', email: 'test@test.com' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadGatewayException if tenant service fails', async () => {
      jest.spyOn(service as any, 'verifyRecaptcha').mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('service down'));

      await expect(service.signup({
        email: 'test@test.com',
        firstName: 'F',
        lastName: 'L',
        companyName: 'C',
        recaptchaToken: 'token',
      } as any)).rejects.toThrow(BadGatewayException);
    });

    it('should throw InternalServerErrorException if tenant creation fails', async () => {
      jest.spyOn(service as any, 'verifyRecaptcha').mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Error',
        text: jest.fn().mockResolvedValue('fail'),
      });

      await expect(service.signup({
        email: 'test@test.com',
        firstName: 'F',
        lastName: 'L',
        companyName: 'C',
        recaptchaToken: 'token',
      } as any)).rejects.toThrow(InternalServerErrorException);
    });

    it('should return already registered response on P2002 error in transaction', async () => {
      jest.spyOn(service as any, 'verifyRecaptcha').mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'u1' });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      });

      (mockPrisma as any).$transaction = jest.fn().mockRejectedValue({ code: 'P2002' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 't1' });

      const result = await service.signup({
        email: 'test@test.com',
        firstName: 'F',
        lastName: 'L',
        companyName: 'C',
        recaptchaToken: 'token',
      } as any);

      expect(result.success).toBe(true);
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

  describe('verify2faAndLogin', () => {
    it('should throw BadRequestException if user has no 2FA', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', is2faEnabled: false });
      await expect(service.verify2faAndLogin('u1', '123456')).rejects.toThrow('2FA not enabled for this user');
    });

    it('should throw BadRequestException if OTP is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', is2faEnabled: true, twoFaSecret: 'secret' });
      (service as any).otplib = { verify: jest.fn().mockReturnValue(false) };
      await expect(service.verify2faAndLogin('u1', '123456')).rejects.toThrow('Invalid OTP');
    });

    it('should return token if OTP is valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        firstName: 'F',
        lastName: 'L',
        is2faEnabled: true,
        twoFaSecret: 'secret',
      });
      (service as any).otplib = { verify: jest.fn().mockReturnValue(true) };
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 't1', role: { name: 'ADMIN' } });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ name: 'Tenant' }) });
      mockJwt.signAsync.mockResolvedValue('token');

      const result = await service.verify2faAndLogin('u1', '123456');
      expect(result.token).toBe('token');
    });
  });

  describe('googleSignin', () => {
    it('should throw InternalServerErrorException if GOOGLE_CLIENT_ID missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      await expect(service.googleSignin({})).rejects.toThrow('GOOGLE_CLIENT_ID not configured');
    });

    it('should throw BadRequestException if no token or code', async () => {
      process.env.GOOGLE_CLIENT_ID = 'id';
      await expect(service.googleSignin({})).rejects.toThrow('Code ou idToken Google requis');
    });
  });

  describe('switchTenant', () => {
    it('should throw BadRequestException if request not found', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      await expect(service.resetPassword({ resetToken: 'token', newPassword: 'new' })).rejects.toThrow(BadRequestException);
    });

    it('should update password and clear reset token', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          resetTokenHash: await bcrypt.hash('valid-token', 10),
          resetTokenExpires: new Date(Date.now() + 10000),
        },
      ]);
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      const result = await service.resetPassword({ resetToken: 'valid-token', newPassword: 'NewPass1!' });
      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('contactAdminForReset', () => {
    it('should create a pending request and notify admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', firstName: 'F', lastName: 'L' });
      mockPrisma.passwordResetRequest.create.mockResolvedValue({ id: 'req-1' });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await service.contactAdminForReset('test@test.com');
      expect(result.success).toBe(true);
      expect(mockPrisma.passwordResetRequest.create).toHaveBeenCalledWith({
        data: { userId: 'u1', status: 'PENDING' },
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.contactAdminForReset('missing@test.com')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingPasswordResetRequests', () => {
    it('should return pending requests', async () => {
      mockPrisma.passwordResetRequest.findMany.mockResolvedValue([]);
      const result = await service.getPendingPasswordResetRequests();
      expect(result).toEqual([]);
      expect(mockPrisma.passwordResetRequest.findMany).toHaveBeenCalled();
    });
  });

  describe('approvePasswordReset', () => {
    it('should approve request, generate temp pass and notify', async () => {
      mockPrisma.passwordResetRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
        userId: 'u1',
        user: { email: 'test@test.com', firstName: 'F', lastName: 'L' },
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });
      mockPrisma.passwordResetRequest.update.mockResolvedValue({ id: 'req-1' });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await service.approvePasswordReset('req-1');
      expect(result.success).toBe(true);
      expect(result.tempPassword).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if request not found or not pending', async () => {
      mockPrisma.passwordResetRequest.findUnique.mockResolvedValue(null);
      await expect(service.approvePasswordReset('missing')).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectPasswordReset', () => {
    it('should reject request and notify', async () => {
      mockPrisma.passwordResetRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
        user: { email: 'test@test.com', firstName: 'F', lastName: 'L' },
      });
      mockPrisma.passwordResetRequest.update.mockResolvedValue({ id: 'req-1' });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await service.rejectPasswordReset('req-1', 'Reason');
      expect(result.success).toBe(true);
      expect(mockPrisma.passwordResetRequest.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'req-1' },
        data: expect.objectContaining({ status: 'REJECTED', adminNotes: 'Reason' }),
      }));
    });
  });

  describe('verifySecurityAnswer', () => {
    it('should return reset token on correct answer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true });
      mockPrisma.securityQuestion.findMany.mockResolvedValue([
        { answerHash: await bcrypt.hash('answer', 10) },
      ]);
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      const result = await service.verifySecurityAnswer({
        email: 'test@test.com',
        question: 'Q',
        answer: 'answer',
      });
      expect(result.resetToken).toBeDefined();
    });

    it('should throw BadRequestException on incorrect answer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true });
      mockPrisma.securityQuestion.findMany.mockResolvedValue([
        { answerHash: await bcrypt.hash('wrong', 10) },
      ]);

      await expect(service.verifySecurityAnswer({
        email: 'test@test.com',
        question: 'Q',
        answer: 'right',
      })).rejects.toThrow('Réponse incorrecte');
    });
  });

  describe('switchTenant', () => {
    it('should return a new token for the target tenant', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'u1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
        tenantId: 'tenant-2',
        role: { name: 'ADMIN' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        firstName: 'F',
        lastName: 'L',
      });
      mockJwt.signAsync.mockResolvedValue('new-token');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ name: 'Tenant 2' }),
      });

      const result = await service.switchTenant('Bearer token', 'tenant-2');
      expect(result.token).toBe('new-token');
      expect(result.tenantId).toBe('tenant-2');
    });
  });

  describe('handleWelcomeEmail', () => {
    it('should send welcome email and update user', async () => {
      const user = { id: 'u1', email: 'test@test.com', firstName: 'F', lastName: 'L', welcomeEmailSent: false, mustChangePassword: false };
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      await (service as any).handleWelcomeEmail(user);

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/notification/welcome'), expect.anything());
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u1' },
        data: { welcomeEmailSent: true },
      }));
    });
  });

  describe('checkAccountLock', () => {
    it('should throw ForbiddenException if account is blocked', async () => {
      const blockedUntil = new Date(Date.now() + 10000);
      const user = { id: 'u1', blockedUntil };
      await expect((service as any).checkAccountLock(user, new Date())).rejects.toThrow(ForbiddenException);
    });

    it('should unlock account if lock expired', async () => {
      const blockedUntil = new Date(Date.now() - 10000);
      const user = { id: 'u1', blockedUntil, loginAttempts: 5 };
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      await (service as any).checkAccountLock(user, new Date());

      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u1' },
        data: { blockedUntil: null, loginAttempts: 0 },
      }));
    });
  });

  describe('signin locking', () => {
    it('should lock account after 5 failed attempts', async () => {
      jest.spyOn(service as any, 'verifyRecaptcha').mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: await bcrypt.hash('correct', 10),
        loginAttempts: 4,
        registrationStatus: 'ACTIVE',
        isActive: true,
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      await expect(service.signin('test@test.com', 'wrong', 'token')).rejects.toThrow('Trop de tentatives. Compte bloqué pour 30 minutes.');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ blockedUntil: expect.any(Date) }),
      }));
    });
  });
});
