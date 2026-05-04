import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
  let prisma: PrismaService;
  let jwt: JwtService;

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
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
});
