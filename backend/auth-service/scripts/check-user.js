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
  const email = 'nour.hasni02@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          role: true
        }
      }
    }
  });
  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
})();
