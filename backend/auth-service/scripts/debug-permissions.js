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
  
  // We need to know which user the USER is testing with.
  // Based on previous logs, it might be nour.hasni@esprit.tn or similar.
  // Let's search for users with BUSINESS_OWNER role.
  
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log('--- USERS AND THEIR PERMISSIONS ---');
  for (const user of users) {
    console.log(`User: ${user.email}`);
    for (const m of user.memberships) {
      console.log(`  Tenant: ${m.tenantId} | Role: ${m.role.name} (ID: ${m.role.id}, Standard: ${m.role.isStandard})`);
      const perms = m.role.permissions.map(rp => rp.permission.name);
      console.log(`    Permissions: ${perms.join(', ')}`);
    }
  }

  console.log('\n--- ALL ROLES ---');
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true
        }
      }
    }
  });
  for (const role of roles) {
    console.log(`Role: ${role.name} (ID: ${role.id}, Standard: ${role.isStandard}, Tenant: ${role.tenantId})`);
    const perms = role.permissions.map(rp => rp.permission.name);
    console.log(`  Permissions: ${perms.join(', ')}`);
  }

  await prisma.$disconnect();
})();
