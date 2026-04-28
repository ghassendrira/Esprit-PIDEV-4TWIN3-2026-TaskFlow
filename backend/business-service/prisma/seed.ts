import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const tenantName = 'Nova Ledger AI Lab';
const businessPrefix = 'Nova Ledger';
const clientPrefix = 'NL-CLIENT-2026-';

const businessSeeds = [
  {
    name: 'Nova Ledger Consulting',
    currency: 'EUR',
    taxRate: 0.2,
    category: 'Consulting',
    clients: [
      {
        name: 'Nova Ledger Reliable',
        email: 'reliable@nova-ledger.example',
        phone: '+216 70 100 001',
        address: '1 Rue Stable, Tunis',
        taxNumber: 'NL-R-001',
      },
      {
        name: 'Nova Ledger Slow',
        email: 'slow@nova-ledger.example',
        phone: '+216 70 100 002',
        address: '2 Rue Delay, Tunis',
        taxNumber: 'NL-S-002',
      },
    ],
  },
  {
    name: 'Nova Ledger Retail',
    currency: 'TND',
    taxRate: 0.19,
    category: 'Retail',
    clients: [
      {
        name: 'Nova Ledger Risky',
        email: 'risky@nova-ledger.example',
        phone: '+216 71 200 001',
        address: '3 Avenue Risk, Sfax',
        taxNumber: 'NL-RK-003',
      },
      {
        name: 'Nova Ledger New',
        email: 'new@nova-ledger.example',
        phone: '+216 71 200 002',
        address: '4 Avenue New, Sfax',
        taxNumber: 'NL-N-004',
      },
      {
        name: 'Nova Ledger Unpaid',
        email: 'unpaid@nova-ledger.example',
        phone: '+216 71 200 003',
        address: '7 Avenue Unpaid, Sfax',
        taxNumber: 'NL-UP-007',
      },
      {
        name: 'Nova Ledger Long History',
        email: 'long-history@nova-ledger.example',
        phone: '+216 71 200 004',
        address: '8 Avenue History, Sfax',
        taxNumber: 'NL-LH-008',
      },
      {
        name: 'Nova Ledger Mostly Paid',
        email: 'mostly-paid@nova-ledger.example',
        phone: '+216 71 200 005',
        address: '9 Avenue Paid, Sfax',
        taxNumber: 'NL-MP-009',
      },
    ],
  },
  {
    name: 'Nova Ledger Logistics',
    currency: 'USD',
    taxRate: 0.07,
    category: 'Logistics',
    clients: [
      {
        name: 'Nova Ledger Mixed',
        email: 'mixed@nova-ledger.example',
        phone: '+216 72 300 001',
        address: '5 Route Mixed, Ariana',
        taxNumber: 'NL-M-005',
      },
      {
        name: 'Nova Ledger Very Risky',
        email: 'very-risky@nova-ledger.example',
        phone: '+216 72 300 002',
        address: '6 Route Risk, Ariana',
        taxNumber: 'NL-VR-006',
      },
      {
        name: 'Nova Ledger Sparse Paid',
        email: 'sparse-paid@nova-ledger.example',
        phone: '+216 72 300 003',
        address: '10 Avenue Sparse, Ariana',
        taxNumber: 'NL-SP-010',
      },
      {
        name: 'Nova Ledger Borderline High',
        email: 'borderline-high@nova-ledger.example',
        phone: '+216 72 300 004',
        address: '11 Avenue Borderline High, Ariana',
        taxNumber: 'NL-BH-011',
      },
      {
        name: 'Nova Ledger Borderline Low',
        email: 'borderline-low@nova-ledger.example',
        phone: '+216 72 300 005',
        address: '12 Avenue Borderline Low, Ariana',
        taxNumber: 'NL-BL-012',
      },
    ],
  },
] as const;

class SeedPrismaClient extends PrismaClient {
  constructor() {
    const url = process.env.DATABASE_URL_BUSINESS ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL_BUSINESS or DATABASE_URL is required for business seeding');
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

async function findTenantId(prisma: TenantLookupPrismaClient): Promise<string> {
  const tenant = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Tenant"
    WHERE name = ${tenantName}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  if (!tenant[0]?.id) {
    throw new Error(`Tenant not found: ${tenantName}. Run the tenant seed first.`);
  }

  return tenant[0].id;
}

async function cleanup(prisma: SeedPrismaClient) {
  const businessNames = businessSeeds.map((business) => business.name);
  const existingBusinesses = await prisma.business.findMany({
    where: { name: { in: businessNames } },
    select: { id: true },
  });

  if (existingBusinesses.length > 0) {
    const businessIds = existingBusinesses.map((business) => business.id);
    await prisma.client.deleteMany({ where: { businessId: { in: businessIds } } });
    await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
  }

  await prisma.client.deleteMany({
    where: { name: { startsWith: clientPrefix } },
  });
}

async function main() {
  const prisma = new SeedPrismaClient();
  const tenantLookup = new TenantLookupPrismaClient();
  await prisma.$connect();
  await tenantLookup.$connect();

  try {
    const tenantId = await findTenantId(tenantLookup);
    await cleanup(prisma);

    let businessCount = 0;
    let clientCount = 0;

    for (const businessSeed of businessSeeds) {
      const business = await prisma.business.create({
        data: {
          tenantId,
          name: businessSeed.name,
          logoUrl: '',
          currency: businessSeed.currency,
          taxRate: businessSeed.taxRate,
          category: businessSeed.category,
        },
        select: { id: true, name: true },
      });
      businessCount += 1;

      for (const clientSeed of businessSeed.clients) {
        await prisma.client.create({
          data: {
            businessId: business.id,
            name: clientSeed.name,
            email: clientSeed.email,
            phone: clientSeed.phone,
            address: clientSeed.address,
            taxNumber: clientSeed.taxNumber,
          },
          select: { id: true },
        });
        clientCount += 1;
      }
    }

    console.log(`[business seed] Created ${businessCount} businesses and ${clientCount} clients for tenant ${tenantName}`);
    console.log(`[business seed] Business prefix: ${businessPrefix}`);
  } finally {
    await tenantLookup.$disconnect();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[business seed] Error:', error);
  process.exitCode = 1;
});
