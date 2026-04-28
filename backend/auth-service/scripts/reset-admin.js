require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

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
  const newPassword = 'Admin1234!';
  const saltRounds = 10;
  const hash = await bcrypt.hash(newPassword, saltRounds);

  const user = await prisma.user.update({
    where: { email },
    data: {
      passwordHash: hash,
      loginAttempts: 0,
      blockedUntil: null,
      isActive: true,
      registrationStatus: 'ACTIVE'
    },
  });
  
  console.log(`Password reset for ${email} to "Admin1234!"`);
  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
})();
