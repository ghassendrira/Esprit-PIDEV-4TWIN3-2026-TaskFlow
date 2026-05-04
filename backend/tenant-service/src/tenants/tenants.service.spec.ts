import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: PrismaService;

  const mockPrisma = {
    tenant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list all tenants', async () => {
    mockPrisma.tenant.findMany.mockResolvedValue([]);
    const result = await service.listAll();
    expect(result).toEqual([]);
    expect(prisma.tenant.findMany).toHaveBeenCalled();
  });

  it('should create a tenant', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);
    mockPrisma.tenant.create.mockResolvedValue({ id: '1', name: 'Acme', slug: 'acme' });

    const result = await service.create({ name: 'Acme' });
    expect(result.id).toBe('1');
    expect(prisma.tenant.create).toHaveBeenCalled();
  });

  it('should find tenant by id', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: '1', name: 'Acme' });
    const result = await service.findById('1');
    expect(result.id).toBe('1');
  });

  it('should throw NotFoundException if tenant not found', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });

  it('should update tenant', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: '1' });
    mockPrisma.tenant.update.mockResolvedValue({ id: '1', name: 'Updated' });

    const result = await service.update('1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('should find tenant by name', async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue({ id: '1', name: 'Acme' });
    const result = await service.findByName('Acme');
    expect(result.id).toBe('1');
  });
});
