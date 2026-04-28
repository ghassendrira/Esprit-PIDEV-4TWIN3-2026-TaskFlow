import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const tenantName = 'Nova Ledger AI Lab';
const seedPrefix = 'NL-INV-2026-';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELED';
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD';

type ClientProfile = {
  clientName: string;
  businessName: string;
  amountBase: number;
  invoiceCount: number;
  pattern: Array<'on_time' | 'late' | 'open' | 'overdue'>;
  paymentOffsetDays: number;
  dueDays: number;
};

const profiles: ClientProfile[] = [
  {
    clientName: 'Nova Ledger Reliable',
    businessName: 'Nova Ledger Consulting',
    amountBase: 1800,
    invoiceCount: 5,
    pattern: ['on_time', 'on_time', 'on_time', 'late', 'open'],
    paymentOffsetDays: 5,
    dueDays: 30,
  },
  {
    clientName: 'Nova Ledger Slow',
    businessName: 'Nova Ledger Consulting',
    amountBase: 2600,
    invoiceCount: 5,
    pattern: ['late', 'late', 'late', 'late', 'open'],
    paymentOffsetDays: 12,
    dueDays: 30,
  },
  {
    clientName: 'Nova Ledger Risky',
    businessName: 'Nova Ledger Retail',
    amountBase: 3400,
    invoiceCount: 5,
    pattern: ['open', 'overdue', 'late', 'open', 'overdue'],
    paymentOffsetDays: 22,
    dueDays: 21,
  },
  {
    clientName: 'Nova Ledger New',
    businessName: 'Nova Ledger Retail',
    amountBase: 950,
    invoiceCount: 2,
    pattern: ['on_time', 'open'],
    paymentOffsetDays: 4,
    dueDays: 30,
  },
  {
    clientName: 'Nova Ledger Unpaid',
    businessName: 'Nova Ledger Retail',
    amountBase: 1500,
    invoiceCount: 6,
    pattern: ['open', 'overdue', 'open', 'overdue', 'open', 'on_time'],
    paymentOffsetDays: 0,
    dueDays: 21,
  },
  {
    clientName: 'Nova Ledger Long History',
    businessName: 'Nova Ledger Retail',
    amountBase: 2100,
    invoiceCount: 30,
    pattern: [
      'on_time', 'on_time', 'on_time', 'on_time', 'on_time',
      'on_time', 'on_time', 'open', 'on_time', 'on_time',
      'on_time', 'on_time', 'on_time', 'open', 'on_time',
      'on_time', 'on_time', 'on_time', 'on_time', 'open',
      'on_time', 'on_time', 'on_time', 'on_time', 'on_time',
      'open', 'on_time', 'on_time', 'open', 'on_time',
    ],
    paymentOffsetDays: 6,
    dueDays: 30,
  },
  {
    clientName: 'Nova Ledger Mostly Paid',
    businessName: 'Nova Ledger Retail',
    amountBase: 2600,
    invoiceCount: 6,
    pattern: ['on_time', 'on_time', 'on_time', 'on_time', 'on_time', 'open'],
    paymentOffsetDays: 4,
    dueDays: 30,
  },
  {
    clientName: 'Nova Ledger Sparse Paid',
    businessName: 'Nova Ledger Logistics',
    amountBase: 3900,
    invoiceCount: 30,
    pattern: [
      'on_time', 'on_time', 'on_time', 'on_time', 'on_time',
      'on_time', 'on_time', 'on_time', 'on_time', 'on_time',
      'open', 'open', 'open', 'open', 'open',
      'open', 'open', 'open', 'open', 'open',
      'open', 'open', 'open', 'open', 'open',
      'open', 'open', 'open', 'open', 'open',
    ],
    paymentOffsetDays: 7,
    dueDays: 30,
  },
  {
    clientName: 'Nova Ledger Borderline High',
    businessName: 'Nova Ledger Logistics',
    amountBase: 3200,
    invoiceCount: 10,
    pattern: ['late', 'late', 'open', 'late', 'open', 'overdue', 'late', 'open', 'late', 'on_time'],
    paymentOffsetDays: 14,
    dueDays: 21,
  },
  {
    clientName: 'Nova Ledger Borderline Low',
    businessName: 'Nova Ledger Logistics',
    amountBase: 1600,
    invoiceCount: 10,
    pattern: ['on_time', 'on_time', 'on_time', 'on_time', 'on_time', 'on_time', 'on_time', 'on_time', 'open', 'on_time'],
    paymentOffsetDays: 4,
    dueDays: 30,
  },
  {
    clientName: 'Nova Ledger Mixed',
    businessName: 'Nova Ledger Logistics',
    amountBase: 2200,
    invoiceCount: 4,
    pattern: ['on_time', 'late', 'open', 'on_time'],
    paymentOffsetDays: 8,
    dueDays: 30,
  },
  {
    clientName: 'Nova Ledger Very Risky',
    businessName: 'Nova Ledger Logistics',
    amountBase: 4100,
    invoiceCount: 5,
    pattern: ['overdue', 'open', 'overdue', 'late', 'open'],
    paymentOffsetDays: 18,
    dueDays: 14,
  },
];

class SeedPrismaClient extends PrismaClient {
  constructor() {
    const url = process.env.DATABASE_URL_INVOICE ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL_INVOICE or DATABASE_URL is required for invoice seeding');
    }

    const adapter = new PrismaPg({ connectionString: url } as any);
    super({ adapter } as any);
  }
}

class BusinessLookupPrismaClient extends PrismaClient {
  constructor() {
    const url = process.env.DATABASE_URL_BUSINESS ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL_BUSINESS or DATABASE_URL is required for business lookup');
    }

    const adapter = new PrismaPg({ connectionString: url } as any);
    super({ adapter } as any);
  }
}

class TenantLookupPrismaClient extends PrismaClient {
  constructor() {
    const url = process.env.DATABASE_URL_TENANT ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL_TENANT or DATABASE_URL is required for tenant lookup');
    }

    const adapter = new PrismaPg({ connectionString: url } as any);
    super({ adapter } as any);
  }
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function statusForOutcome(outcome: ClientProfile['pattern'][number]): InvoiceStatus {
  if (outcome === 'on_time' || outcome === 'late') return 'PAID';
  if (outcome === 'overdue') return 'OVERDUE';
  return 'SENT';
}

function paymentDateForOutcome(issueDate: Date, dueDate: Date, outcome: ClientProfile['pattern'][number], offsetDays: number): Date | null {
  if (outcome === 'on_time') return addDays(issueDate, Math.max(1, offsetDays));
  if (outcome === 'late') return addDays(dueDate, offsetDays);
  if (outcome === 'overdue') return addDays(dueDate, offsetDays + 10);
  return null;
}

async function findIds(prisma: BusinessLookupPrismaClient) {
  const businesses = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name
    FROM "Business"
    WHERE name IN (
      'Nova Ledger Consulting',
      'Nova Ledger Retail',
      'Nova Ledger Logistics'
    )
    ORDER BY name ASC
  `;

  const clients = await prisma.$queryRaw<Array<{ id: string; name: string; businessId: string }>>`
    SELECT id, name, "businessId"
    FROM "Client"
    WHERE name IN (
      'Nova Ledger Reliable',
      'Nova Ledger Slow',
      'Nova Ledger Risky',
      'Nova Ledger New',
      'Nova Ledger Unpaid',
      'Nova Ledger Long History',
      'Nova Ledger Mostly Paid',
      'Nova Ledger Sparse Paid',
      'Nova Ledger Borderline High',
      'Nova Ledger Borderline Low',
      'Nova Ledger Mixed',
      'Nova Ledger Very Risky'
    )
    ORDER BY name ASC
  `;

  return { businesses, clients };
}

async function cleanup(prisma: SeedPrismaClient) {
  const seededInvoices = await prisma.invoice.findMany({
    where: {
      invoiceNumber: { startsWith: seedPrefix },
    },
    select: { id: true },
  });

  if (seededInvoices.length > 0) {
    const seededIds = seededInvoices.map((invoice) => invoice.id);
    await prisma.payment.deleteMany({ where: { invoiceId: { in: seededIds } } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: seededIds } } });
    await prisma.invoice.deleteMany({ where: { id: { in: seededIds } } });
  }
}

async function main() {
  const prisma = new SeedPrismaClient();
  const lookup = new BusinessLookupPrismaClient();
  const tenantLookup = new TenantLookupPrismaClient();
  await prisma.$connect();
  await lookup.$connect();
  await tenantLookup.$connect();

  try {
    const tenant = await tenantLookup.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Tenant"
      WHERE name = ${tenantName}
      LIMIT 1
    `;

    if (!tenant[0]?.id) {
      throw new Error(`Tenant not found: ${tenantName}. Run tenant seed first.`);
    }

    const { businesses, clients } = await findIds(lookup);
    if (businesses.length === 0 || clients.length === 0) {
      throw new Error('Businesses or clients not found. Run business seed first.');
    }

    await cleanup(prisma);

    const clientByName = new Map(clients.map((client) => [client.name, client]));
    const businessByName = new Map(businesses.map((business) => [business.name, business]));

    let invoiceCount = 0;
    let paymentCount = 0;

    for (const profile of profiles) {
      const business = businessByName.get(profile.businessName);
      const client = clientByName.get(profile.clientName);

      if (!business || !client) {
        throw new Error(`Missing business or client for profile ${profile.clientName}`);
      }

      for (let index = 0; index < profile.invoiceCount; index += 1) {
        const outcome = profile.pattern[index] ?? 'open';
        const issueDate = new Date(Date.UTC(2026, index % 4, index + 1 + profiles.indexOf(profile)));
        const dueDate = addDays(issueDate, profile.dueDays);
        const totalAmount = roundAmount(profile.amountBase + index * 250 + profiles.indexOf(profile) * 120);
        const invoiceNumber = `${seedPrefix}${String(invoiceCount + 1).padStart(4, '0')}`;
        const status = statusForOutcome(outcome);
        const paymentDate = paymentDateForOutcome(issueDate, dueDate, outcome, profile.paymentOffsetDays);

        const created = await prisma.invoice.create({
          data: {
            businessId: business.id,
            clientId: client.id,
            invoiceNumber,
            status,
            issueDate,
            dueDate,
            totalAmount,
            taxAmount: roundAmount(totalAmount * 0.19),
            pdfUrl: `https://files.nova-ledger.example/invoices/${invoiceNumber}.pdf`,
            notes: `${profile.clientName} ${outcome} invoice ${index + 1}`,
            items: {
              create: [
                {
                  description: `Professional service for ${profile.clientName}`,
                  quantity: 1,
                  unitPrice: totalAmount,
                  amount: totalAmount,
                },
              ],
            },
            ...(paymentDate
              ? {
                  payments: {
                    create: [
                      {
                        amount: totalAmount,
                        paymentDate,
                        method: outcome === 'late' ? 'BANK_TRANSFER' : 'CARD',
                        reference: `${invoiceNumber}-PAY`,
                      },
                    ],
                  },
                }
              : {}),
          },
          select: { id: true },
        });

        invoiceCount += 1;
        if (paymentDate) {
          paymentCount += 1;
        }
      }
    }

    console.log(`[invoice seed] Created ${invoiceCount} invoices for Nova Ledger`);
    console.log(`[invoice seed] Created ${paymentCount} payments for Nova Ledger`);
  } finally {
    await tenantLookup.$disconnect();
    await lookup.$disconnect();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[invoice seed] Error:', error);
  process.exitCode = 1;
});
