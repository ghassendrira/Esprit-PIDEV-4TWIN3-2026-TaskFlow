import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  const prisma = {
    invoice: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  } as any;

  let service: InvoicesService;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = fetchMock;
    service = new InvoicesService(prisma);
  });

  it('rejects invoice creation when the business belongs to another company', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'b1', companyId: 'company-b', tenantId: 'company-b' }),
    });

    await expect(
      service.create(
        {
          businessId: 'b1',
          clientId: 'c1',
          items: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
        },
        'company-a',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invoice creation when the client belongs to another business', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'b1', companyId: 'company-a', tenantId: 'company-a' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'c1', businessId: 'other-business', email: 'x@test.com' }),
      });

    await expect(
      service.create(
        {
          businessId: 'b1',
          clientId: 'c1',
          items: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
        },
        'company-a',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates the invoice when business and client belong to the selected company/business', async () => {
    prisma.invoice.create.mockResolvedValue({ id: 'inv-1' });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'b1', companyId: 'company-a', tenantId: 'company-a' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'c1', businessId: 'b1', email: 'client@test.com' }),
      });

    const result = await service.create(
      {
        businessId: 'b1',
        clientId: 'c1',
        items: [{ description: 'Item', quantity: 2, unitPrice: 15 }],
      },
      'company-a',
    );

    expect(prisma.invoice.create).toHaveBeenCalled();
    expect(result).toEqual({ id: 'inv-1' });
  });

  it('rejects invoice creation when the client belongs to another employee', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'b1', companyId: 'company-a', tenantId: 'company-a' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'c1',
          businessId: 'b1',
          assignedUserId: 'employee-a',
          email: 'client@test.com',
        }),
      });

    await expect(
      service.create(
        {
          businessId: 'b1',
          clientId: 'c1',
          createdByUserId: 'employee-b',
          items: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
        },
        'company-a',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
