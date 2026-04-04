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
  
  console.log('--- STARTING ROLE MIGRATION: OWNER -> BUSINESS_OWNER ---');

  // 1. Find the BUSINESS_OWNER role
  const businessOwnerRole = await prisma.role.findFirst({
    where: { name: 'BUSINESS_OWNER', isStandard: true, tenantId: null }
  });

  if (!businessOwnerRole) {
    console.error('BUSINESS_OWNER role not found. Please restart auth-service first to seed it.');
    process.exit(1);
  }

  // 2. Find all OWNER roles (standard and non-standard)
  const ownerRoles = await prisma.role.findMany({
    where: { name: 'OWNER' }
  });

  for (const ownerRole of ownerRoles) {
    console.log(`Migrating users from role OWNER (${ownerRole.id}) to BUSINESS_OWNER (${businessOwnerRole.id})`);
    
    // Update memberships
    const updateResult = await prisma.userTenantMembership.updateMany({
      where: { roleId: ownerRole.id },
      data: { roleId: businessOwnerRole.id }
    });
    console.log(`  Updated ${updateResult.count} memberships.`);

    // Delete role permissions for the OWNER role
    await prisma.rolePermission.deleteMany({
      where: { roleId: ownerRole.id }
    });

    // Delete the OWNER role itself
    await prisma.role.delete({
      where: { id: ownerRole.id }
    });
    console.log(`  Deleted OWNER role ${ownerRole.id}.`);
  }

  console.log('--- MIGRATION COMPLETE ---');
  await prisma.$disconnect();
})();
