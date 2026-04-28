require('dotenv/config');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is missing (check backend/auth-service/.env)');
}

// You can override these without editing the file:
// PowerShell:
//   $env:FIX_USER_EMAIL="nour.hasni@esprit.tn"
//   $env:FIX_USER_PASSWORD="YourPassword"
const EMAIL = (process.env.FIX_USER_EMAIL ?? 'nour.hasni@esprit.tn')
  .trim()
  .toLowerCase();
const PASSWORD = process.env.FIX_USER_PASSWORD ?? 'Nourhasni2002*';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: DATABASE_URL,
    pool: { maxConnections: 2 },
  }),
});

async function main() {
  // Ensure columns exist (some DBs were missing them).
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenHash" TEXT',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP(3)',
  );

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
  const hash = await bcrypt.hash(PASSWORD, saltRounds);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      passwordHash: hash,
      isActive: true,
      registrationStatus: 'ACTIVE',
      mustChangePassword: false,
      welcomeEmailSent: true,
    },
    create: {
      firstName: 'Nour',
      lastName: 'Hasni',
      email: EMAIL,
      passwordHash: hash,
      isActive: true,
      registrationStatus: 'ACTIVE',
      mustChangePassword: false,
      welcomeEmailSent: true,
    },
    // avoid selecting any potentially missing columns
    select: { id: true, email: true, isActive: true, registrationStatus: true },
  });

  console.log('OK user ready:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });

