import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma.service';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: PrismaService;

  const mockPrisma = {
    role: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    prisma = module.get<PrismaService>(PrismaService);
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
});
