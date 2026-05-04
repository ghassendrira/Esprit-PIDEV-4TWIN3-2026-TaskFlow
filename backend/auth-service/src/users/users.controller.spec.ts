import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: { hash: jest.fn().mockResolvedValue('hashed') },
}));

describe('UsersController', () => {
  let controller: UsersController;
  let prisma: PrismaService;
  let jwt: JwtService;
  const fetchMock = jest.fn();

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    userTenantMembership: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockJwt = {
    verifyAsync: jest.fn(),
  };

  beforeAll(() => {
    global.fetch = fetchMock as any;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create an employee', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1' });
    mockPrisma.userTenantMembership.findFirst.mockResolvedValue({
      tenantId: 'tenant1',
      role: { name: 'ADMIN' },
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-1', name: 'ADMIN' });
    mockPrisma.user.create.mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      firstName: 'John',
      lastName: 'Doe',
    });
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ name: 'Acme' }) })
      .mockResolvedValueOnce({ ok: true, text: jest.fn().mockResolvedValue('ok') });

    const result = await controller.createEmployee('Bearer token', 'tenant1', {
      email: 'user@test.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'ADMIN',
    } as any);

    expect(result.success).toBe(true);
    expect(mockPrisma.userTenantMembership.create).toHaveBeenCalled();
  });

  it('should list employees with mapped roles', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user1', tenantId: 'tenant1' });
    mockPrisma.userTenantMembership.findMany.mockResolvedValue([
      {
        user: {
          id: 'u1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'user@test.com',
          isActive: true,
        },
        role: { name: 'BUSINESS_OWNER' },
        joinedAt: new Date('2024-01-01'),
      },
    ]);

    const result = await controller.listEmployees('Bearer token', 'tenant1');

    expect(result[0].role).toBe('BUSINESS_OWNER');
    expect(result[0].email).toBe('user@test.com');
  });
});
