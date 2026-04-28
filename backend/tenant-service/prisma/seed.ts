import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const tenantName = 'Nova Ledger AI Lab';
const tenantSlug = 'nova-ledger-ai-lab';

class SeedPrismaClient extends PrismaClient {
  constructor() {
    const url = process.env.DATABASE_URL_TENANT ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL_TENANT or DATABASE_URL is required for tenant seeding');
    }

    const adapter = new PrismaPg({ connectionString: url } as any);
    super({ adapter } as any);
  }
}

async function main() {
  const prisma = new SeedPrismaClient();
  await prisma.$connect();

  try {
    const existing = await prisma.tenant.findFirst({
      where: { name: tenantName },
      select: { id: true, name: true, slug: true },
    });

    if (existing) {
      console.log(`[tenant seed] Reusing tenant ${existing.name} (${existing.id})`);
      return;
    }

    const created = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        address: '12 Avenue de Test, Tunis',
        country: 'TN',
        phone: '+216 00 000 000',
        logoUrl: '',
        website: 'https://nova-ledger.example',
        matricule: 'NL-TEST-2026',
        branding: {
          primaryColor: '#1d4ed8',
          secondaryColor: '#0f172a',
        },
      },
      select: { id: true, name: true, slug: true },
    });

    console.log(`[tenant seed] Created tenant ${created.name} (${created.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[tenant seed] Error:', error);
  process.exitCode = 1;
});
