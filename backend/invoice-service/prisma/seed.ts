import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

type SeedStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELED';
type SeedPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD';

const seedPrefix = 'AI-SEED-2026-';

const businessProfiles = [
  {
    businessId: '11111111-1111-4111-8111-111111111111',
    clientIds: [
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
    ],
    taxRate: 0.08,
  },
  {
    businessId: '22222222-2222-4222-8222-222222222222',
    clientIds: [
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbd',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbe',
    ],
    taxRate: 0.15,
  },
  {
    businessId: '33333333-3333-4333-8333-333333333333',
    clientIds: [
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccd',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccce',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccf',
    ],
    taxRate: 0.2,
  },
] as const;

const invoiceThemes = [
  {
    heading: 'Consulting and advisory services',
    items: [
      { description: 'Monthly consulting retainer', quantity: 1, unitPrice: 1200 },
      { description: 'Project discovery session', quantity: 1, unitPrice: 350 },
    ],
  },
  {
    heading: 'Cloud hosting and maintenance',
    items: [
      { description: 'Cloud hosting plan', quantity: 1, unitPrice: 480 },
      { description: 'Monitoring and maintenance', quantity: 1, unitPrice: 260 },
      { description: 'Backup storage', quantity: 2, unitPrice: 90 },
    ],
  },
  {
    heading: 'Office and stationery supplies',
    items: [
      { description: 'Printer paper and folders', quantity: 4, unitPrice: 28 },
      { description: 'Pens, notebooks and markers', quantity: 3, unitPrice: 35 },
    ],
  },
  {
    heading: 'Marketing and design services',
    items: [
      { description: 'Campaign creative design', quantity: 1, unitPrice: 780 },
      { description: 'Social media ads management', quantity: 1, unitPrice: 640 },
    ],
  },
  {
    heading: 'Sales training and coaching',
    items: [
      { description: 'Sales workshop', quantity: 1, unitPrice: 950 },
      { description: 'Coaching follow-up session', quantity: 1, unitPrice: 420 },
    ],
  },
  {
    heading: 'Software subscriptions',
    items: [
      { description: 'Annual SaaS license', quantity: 1, unitPrice: 2400 },
      { description: 'Team collaboration tools', quantity: 1, unitPrice: 590 },
    ],
  },
  {
    heading: 'Transport and logistics',
    items: [
      { description: 'Courier deliveries', quantity: 6, unitPrice: 22 },
      { description: 'Local transport reimbursement', quantity: 4, unitPrice: 18 },
    ],
  },
  {
    heading: 'Telecom and internet services',
    items: [
      { description: 'Internet access plan', quantity: 1, unitPrice: 210 },
      { description: 'Mobile lines package', quantity: 3, unitPrice: 55 },
    ],
  },
  {
    heading: 'Payroll and contractor support',
    items: [
      { description: 'Contractor payroll processing', quantity: 1, unitPrice: 1450 },
      { description: 'Administrative support fee', quantity: 1, unitPrice: 310 },
    ],
  },
  {
    heading: 'Rent and utilities',
    items: [
      { description: 'Office rent', quantity: 1, unitPrice: 1800 },
      { description: 'Electricity and water', quantity: 1, unitPrice: 380 },
    ],
  },
] as const;

const paymentMethods: SeedPaymentMethod[] = ['BANK_TRANSFER', 'CARD'];

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

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function pickStatus(index: number): SeedStatus {
  if (index % 11 === 0) return 'CANCELED';
  if (index % 7 === 0) return 'OVERDUE';
  if (index % 4 === 0) return 'DRAFT';
  if (index % 3 === 0) return 'SENT';
  return 'PAID';
}

function buildInvoice(index: number) {
  const businessProfile = businessProfiles[(index - 1) % businessProfiles.length];
  const theme = invoiceThemes[(index - 1) % invoiceThemes.length];
  const clientId = businessProfile.clientIds[(index - 1) % businessProfile.clientIds.length];
  const status = pickStatus(index);
  const issueDate = new Date(Date.UTC(2026, (index - 1) % 4, ((index - 1) % 26) + 1));
  const dueDate = addDays(issueDate, 30);

  const items = theme.items.map((item, itemIndex) => {
    const quantity = item.quantity + ((index + itemIndex) % 2);
    const unitPrice = item.unitPrice + ((index + itemIndex) % 3) * 10;
    return {
      description: `${item.description} - ${theme.heading}`,
      quantity,
      unitPrice,
      amount: roundAmount(quantity * unitPrice),
    };
  });

  const subtotal = roundAmount(items.reduce((sum, item) => sum + item.amount, 0));
  const taxAmount = roundAmount(subtotal * businessProfile.taxRate);
  const totalAmount = roundAmount(subtotal + taxAmount);
  const invoiceNumber = `${seedPrefix}${String(index).padStart(3, '0')}`;

  return {
    businessId: businessProfile.businessId,
    clientId,
    createdBy: undefined,
    invoiceNumber,
    status,
    issueDate,
    dueDate,
    totalAmount,
    taxAmount,
    pdfUrl: `https://files.taskflow.local/invoices/${invoiceNumber}.pdf`,
    notes: `Seed invoice ${index} for ${theme.heading.toLowerCase()}.`,
    items,
    payment:
      status === 'PAID'
        ? {
            amount: totalAmount,
            paymentDate: addDays(issueDate, 7),
            method: paymentMethods[index % paymentMethods.length],
            reference: `${invoiceNumber}-PAY`,
          }
        : null,
  };
}

async function main() {
  const prisma = new SeedPrismaClient();
  await prisma.$connect();

  try {
    const existingSeededInvoices = await prisma.invoice.findMany({
      where: {
        invoiceNumber: {
          startsWith: seedPrefix,
        },
      },
      select: { id: true },
    });

    if (existingSeededInvoices.length > 0) {
      const seededIds = existingSeededInvoices.map((invoice) => invoice.id);
      await prisma.payment.deleteMany({ where: { invoiceId: { in: seededIds } } });
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: seededIds } } });
      await prisma.invoice.deleteMany({ where: { id: { in: seededIds } } });
    }

    for (let index = 1; index <= 50; index += 1) {
      const seed = buildInvoice(index);

      await prisma.invoice.create({
        data: {
          businessId: seed.businessId,
          clientId: seed.clientId,
          createdBy: seed.createdBy,
          invoiceNumber: seed.invoiceNumber,
          status: seed.status,
          issueDate: seed.issueDate,
          dueDate: seed.dueDate,
          totalAmount: seed.totalAmount,
          taxAmount: seed.taxAmount,
          pdfUrl: seed.pdfUrl,
          notes: seed.notes,
          items: {
            create: seed.items,
          },
          ...(seed.payment
            ? {
                payments: {
                  create: [seed.payment],
                },
              }
            : {}),
        },
      });
    }

    const totalSeeded = await prisma.invoice.count({
      where: {
        invoiceNumber: {
          startsWith: seedPrefix,
        },
      },
    });

    console.log(`[invoice seed] Inserted ${totalSeeded} invoices.`);
    console.log(`[invoice seed] Prefix: ${seedPrefix}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[invoice seed] Error:', error);
  process.exitCode = 1;
});