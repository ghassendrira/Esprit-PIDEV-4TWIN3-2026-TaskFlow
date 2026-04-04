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
  
  const standardRoleNames = ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'BUSINESS_OWNER', 'ACCOUNTANT', 'TEAM_MEMBER'];

  console.log('Fixing standard roles to be isStandard: true...');
  const result = await prisma.role.updateMany({
    where: {
      name: { in: standardRoleNames },
      tenantId: null,
      isStandard: false
    },
    data: { isStandard: true }
  });

  console.log(`Updated ${result.count} roles.`);
  
  console.log('\n--- VERIFYING ---');
  const roles = await prisma.role.findMany({
    where: { name: { in: standardRoleNames }, tenantId: null }
  });
  for (const role of roles) {
    console.log(`Role: ${role.name} | isStandard: ${role.isStandard}`);
  }

  await prisma.$disconnect();
})();
