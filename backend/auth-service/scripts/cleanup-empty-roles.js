require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
  }

  const adapter = new PrismaPg({
    connectionString: dbUrl,
    pool: { maxConnections: 1 },
  });
  const prisma = new PrismaClient({ adapter });

  const keepNames = new Set([
    'BUSINESS_OWNER',
    'OWNER',
    'ADMIN',
    'SUPER_ADMIN',
    'ACCOUNTANT',
  ]);

  try {
    const roles = await prisma.role.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        isStandard: true,
        memberships: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    const deletable = roles.filter((r) => {
      const hasUsers = (r.memberships?.length ?? 0) > 0;
      const isProtectedName = keepNames.has(String(r.name || '').toUpperCase());
      if (hasUsers) return false;
      if (isProtectedName) return false;
      if (r.isStandard) return false;
      return true;
    });

    if (!deletable.length) {
      console.log('No empty custom roles to soft-delete.');
      await prisma.$disconnect();
      process.exit(0);
    }

    const ids = deletable.map((r) => r.id);
    const res = await prisma.role.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    console.log(
      JSON.stringify(
        {
          scanned: roles.length,
          softDeleted: res.count,
          keptRoleNames: Array.from(keepNames),
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error('cleanup-empty-roles failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
