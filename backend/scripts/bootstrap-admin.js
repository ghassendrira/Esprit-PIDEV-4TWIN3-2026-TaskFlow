require('dotenv').config();

const bcrypt = require('bcrypt');
const { PrismaClient, PlatformRole } = require('@prisma/client');

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Missing BOOTSTRAP_ADMIN_EMAIL or BOOTSTRAP_ADMIN_PASSWORD in backend/.env');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('Admin already exists:', existing.email);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: {
        email,
        firstName: 'Platform',
        lastName: 'Admin',
        passwordHash,
        platformRole: PlatformRole.PLATFORM_ADMIN,
        mustChangePassword: false,
      },
    });

    console.log('Created platform admin:', admin.email);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
