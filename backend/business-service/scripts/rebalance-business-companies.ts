import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

type TenantRecord = {
  id: string;
  name: string;
};

type BusinessRecord = {
  id: string;
  name: string;
  tenantId: string;
  companyId: string | null;
  createdAt: Date;
};

class BusinessDbClient extends PrismaClient {
  constructor() {
    const url = process.env.DATABASE_URL_BUSINESS ?? process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL_BUSINESS or DATABASE_URL is required');
    const adapter = new PrismaPg({ connectionString: url } as any);
    super({ adapter } as any);
  }
}

class TenantDbClient extends PrismaClient {
  constructor() {
    const url =
      process.env.DATABASE_URL_TENANT ??
      'postgresql://postgres:taskflow2026@localhost:5432/taskflow_tenant';
    if (!url) throw new Error('DATABASE_URL_TENANT or DATABASE_URL is required');
    const adapter = new PrismaPg({ connectionString: url } as any);
    super({ adapter } as any);
  }
}

function buildBalancedAssignments<TTenant extends TenantRecord, TBusiness extends BusinessRecord>(
  tenants: TTenant[],
  businesses: TBusiness[],
) {
  const assignments: Array<{ business: TBusiness; tenant: TTenant }> = [];
  const base = Math.floor(businesses.length / tenants.length);
  const remainder = businesses.length % tenants.length;

  let cursor = 0;
  tenants.forEach((tenant, index) => {
    const bucketSize = base + (index < remainder ? 1 : 0);
    for (let offset = 0; offset < bucketSize; offset += 1) {
      assignments.push({ business: businesses[cursor], tenant });
      cursor += 1;
    }
  });

  return assignments;
}

async function main() {
  const businessDb = new BusinessDbClient();
  const tenantDb = new TenantDbClient();

  await businessDb.$connect();
  await tenantDb.$connect();

  try {
    const tenants = await tenantDb.$queryRaw<TenantRecord[]>`
      SELECT id, name
      FROM "Tenant"
      WHERE "deletedAt" IS NULL
      ORDER BY name ASC, "createdAt" ASC
    `;

    const businesses = await businessDb.business.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        tenantId: true,
        companyId: true,
        createdAt: true,
      },
    });

    if (tenants.length === 0) {
      throw new Error('No companies found in tenant database.');
    }

    if (businesses.length === 0) {
      throw new Error('No businesses found in business database.');
    }

    const assignments = buildBalancedAssignments(tenants, businesses);

    for (const { business, tenant } of assignments) {
      await businessDb.business.update({
        where: { id: business.id },
        data: {
          companyId: tenant.id,
          tenantId: tenant.id,
        },
      });
    }

    const summary = await businessDb.business.groupBy({
      by: ['companyId'],
      _count: { _all: true },
      orderBy: { companyId: 'asc' },
    });

    const namedSummary = summary.map((row) => ({
      companyId: row.companyId,
      companyName: tenants.find((tenant) => tenant.id === row.companyId)?.name ?? row.companyId,
      businessCount: row._count._all,
    }));

    console.log(
      JSON.stringify(
        {
          companies: tenants.length,
          businesses: businesses.length,
          distribution: namedSummary,
        },
        null,
        2,
      ),
    );
  } finally {
    await businessDb.$disconnect();
    await tenantDb.$disconnect();
  }
}

main().catch((error) => {
  console.error('[rebalance-business-companies] failed:', error);
  process.exitCode = 1;
});
