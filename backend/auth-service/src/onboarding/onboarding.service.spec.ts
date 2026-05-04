import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockPrisma = {
    userTenantMembership: {
      findFirst: jest.fn(),
    },
  };

  const mockJwt = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveTenantIdFromAuth', () => {
    it('should throw UnauthorizedException if auth header invalid', async () => {
      await expect((service as any).resolveTenantIdFromAuth('invalid')).rejects.toThrow(UnauthorizedException);
    });

    it('should return tenantId from membership', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
      mockPrisma.userTenantMembership.findFirst.mockResolvedValue({ tenantId: 'tenant1' });

      const result = await (service as any).resolveTenantIdFromAuth('Bearer token');
      expect(result).toEqual({ userId: 'user1', tenantId: 'tenant1' });
    });
  });
});
