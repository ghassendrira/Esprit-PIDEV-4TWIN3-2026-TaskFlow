import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';

// Prisma 7 + adapter-pg: PrismaClient must be instantiated with adapter/options.
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL is required for prisma seed');
}

const adapter = new PrismaPg({
  connectionString: dbUrl,
  pool: { maxConnections: 2 },
} as any);

const prisma = new PrismaClient({ adapter } as any);

async function upsertRole(name: string) {
  let role = await prisma.role.findFirst({
    where: { name, tenantId: null },
  });

  if (!role) {
    role = await prisma.role.create({
      data: { name, isStandard: true, tenantId: null },
    });
  }
  return role;
}

async function upsertUser(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  registrationStatus: 'PENDING' | 'ACTIVE' | 'REJECTED';
  isActive: boolean;
}) {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
  const passwordHash = await bcrypt.hash(params.password, saltRounds);

  // email is unique in schema, so upsert is safe.
  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      firstName: params.firstName,
      lastName: params.lastName,
      passwordHash,
      isActive: params.isActive,
      registrationStatus: params.registrationStatus,
      // Keep it simple for dev: if you reseed, login should work immediately.
      mustChangePassword: false,
      welcomeEmailSent: true,
    },
    create: {
      id: crypto.randomUUID(),
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      passwordHash,
      isActive: params.isActive,
      registrationStatus: params.registrationStatus,
      mustChangePassword: false,
      welcomeEmailSent: true,
    },
    // Avoid selecting columns that might not exist in the current DB schema
    // (example: resetTokenHash/resetTokenExpires).
    select: { id: true, email: true },
  });
}

async function ensureMembership(params: {
  userId: string;
  roleId: string;
  tenantId: string;
}) {
  const existing = await prisma.userTenantMembership.findFirst({
    where: { userId: params.userId, roleId: params.roleId, tenantId: params.tenantId },
  });
  if (existing) return existing;

  return prisma.userTenantMembership.create({
    data: {
      id: crypto.randomUUID(),
      userId: params.userId,
      roleId: params.roleId,
      tenantId: params.tenantId,
    },
  });
}

async function main() {
  const seedUserEmail = (process.env.SEED_USER_EMAIL ?? 'demo@taskflow.local').trim().toLowerCase();
  const seedUserPassword = process.env.SEED_USER_PASSWORD ?? 'Demo1234!';
  const seedAdminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@taskflow.local').trim().toLowerCase();
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
  if (!Number.isFinite(saltRounds) || saltRounds <= 0) {
    throw new Error('Invalid BCRYPT_SALT_ROUNDS');
  }

  // Roles
  const superRole = await upsertRole('SUPER_ADMIN');
  const ownerRole = await upsertRole('BUSINESS_OWNER');

  // Users
  const adminUser = await upsertUser({
    email: seedAdminEmail,
    password: seedAdminPassword,
    firstName: 'Admin',
    lastName: 'TaskFlow',
    registrationStatus: 'ACTIVE',
    isActive: true,
  });

  const demoUser = await upsertUser({
    email: seedUserEmail,
    password: seedUserPassword,
    firstName: 'Demo',
    lastName: 'User',
    registrationStatus: 'ACTIVE',
    isActive: true,
  });

  // Tenant IDs are just UUID strings in this schema (no Tenant relation).
  const tenantIdForAdmin = crypto.randomUUID();
  const tenantIdForDemo = crypto.randomUUID();

  await ensureMembership({
    userId: adminUser.id,
    roleId: superRole.id,
    tenantId: tenantIdForAdmin,
  });

  await ensureMembership({
    userId: demoUser.id,
    roleId: ownerRole.id,
    tenantId: tenantIdForDemo,
  });

  console.log('[prisma seed] Done');
  const afterCount = await prisma.user.count();
  const afterDemo = await prisma.user.findUnique({
    where: { email: seedUserEmail },
    select: { email: true, registrationStatus: true, isActive: true },
  });
  console.log('[prisma seed] users_count_after', afterCount);
  console.log('[prisma seed] demo_after', afterDemo);
  console.log('[prisma seed] demo login email:', seedUserEmail);
  console.log('[prisma seed] admin login email:', seedAdminEmail);
}

main()
  .catch((e) => {
    console.error('[prisma seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

