import { BusinessService } from './business.service';

describe('BusinessService', () => {
  const prisma = {
    business: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  let service: BusinessService;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = fetchMock;
    fetchMock.mockResolvedValue({ ok: true });
    service = new BusinessService(prisma);
  });

  it('creates a business with companyId mirrored to tenantId by default', async () => {
    prisma.business.create.mockResolvedValue({ id: 'b1', companyId: 'c1', tenantId: 'c1' });

    await service.create({
      tenantId: 'c1',
      name: 'TaskFlow Ops',
      currency: 'TND',
      taxRate: 19,
    });

    expect(prisma.business.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'c1',
          tenantId: 'c1',
        }),
      }),
    );
  });

  it('filters businesses by companyId', async () => {
    prisma.business.findMany.mockResolvedValue([{ id: 'b1', companyId: 'c1' }]);

    await service.byCompany('c1');

    expect(prisma.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'c1' },
      }),
    );
  });

  it('counts businesses by companyId', async () => {
    prisma.business.count.mockResolvedValue(40);

    const count = await service.countByTenant('c1');

    expect(prisma.business.count).toHaveBeenCalledWith({
      where: { companyId: 'c1' },
    });
    expect(count).toBe(40);
  });
});
