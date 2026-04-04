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

  for (const roleName of standardRoleNames) {
    console.log(`Processing role: ${roleName}`);
    
    // Find the "real" standard role (the one we want to keep)
    const officialRole = await prisma.role.findFirst({
      where: { name: roleName, isStandard: true, tenantId: null }
    });

    if (!officialRole) {
      console.log(`  Official role for ${roleName} not found, skipping.`);
      continue;
    }

    // Find all "old" roles with the same name that are NOT the official one
    const oldRoles = await prisma.role.findMany({
      where: { 
        name: roleName,
        id: { not: officialRole.id },
        tenantId: null // Only target those without tenantId (the ones that were supposed to be standard)
      }
    });

    for (const oldRole of oldRoles) {
      console.log(`  Migrating users from old role ${oldRole.id} (Standard: ${oldRole.isStandard}) to official role ${officialRole.id}`);
      
      // Update memberships
      const updateResult = await prisma.userTenantMembership.updateMany({
        where: { roleId: oldRole.id },
        data: { roleId: officialRole.id }
      });
      console.log(`    Updated ${updateResult.count} memberships.`);

      // Delete the old role
      // We need to delete rolePermissions first if they exist
      await prisma.rolePermission.deleteMany({
        where: { roleId: oldRole.id }
      });
      
      await prisma.role.delete({
        where: { id: oldRole.id }
      });
      console.log(`    Deleted old role ${oldRole.id}.`);
    }
  }

  console.log('Migration complete!');
  await prisma.$disconnect();
})();
