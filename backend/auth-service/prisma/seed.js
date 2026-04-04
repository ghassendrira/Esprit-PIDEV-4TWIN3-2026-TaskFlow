"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const crypto_1 = __importDefault(require("crypto"));
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    throw new Error('DATABASE_URL is required for prisma seed');
}
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: dbUrl,
    pool: { maxConnections: 2 },
});
const prisma = new client_1.PrismaClient({ adapter });
async function upsertRole(name) {
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
async function upsertUser(params) {
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
    const passwordHash = await bcrypt_1.default.hash(params.password, saltRounds);
    return prisma.user.upsert({
        where: { email: params.email },
        update: {
            firstName: params.firstName,
            lastName: params.lastName,
            passwordHash,
            isActive: params.isActive,
            registrationStatus: params.registrationStatus,
            mustChangePassword: false,
            welcomeEmailSent: true,
        },
        create: {
            id: crypto_1.default.randomUUID(),
            firstName: params.firstName,
            lastName: params.lastName,
            email: params.email,
            passwordHash,
            isActive: params.isActive,
            registrationStatus: params.registrationStatus,
            mustChangePassword: false,
            welcomeEmailSent: true,
        },
        select: { id: true, email: true },
    });
}
async function ensureMembership(params) {
    const existing = await prisma.userTenantMembership.findFirst({
        where: { userId: params.userId, roleId: params.roleId, tenantId: params.tenantId },
    });
    if (existing)
        return existing;
    return prisma.userTenantMembership.create({
        data: {
            id: crypto_1.default.randomUUID(),
            userId: params.userId,
            roleId: params.roleId,
            tenantId: params.tenantId,
        },
    });
}
async function ensureTenantId(name) {
    const base = (process.env.TENANT_SERVICE_URL ?? 'http://localhost:3002').replace(/\/+$/, '');
    const safeName = name.trim() || 'Tenant';
    try {
        const r = await fetch(`${base}/tenants/by-name/${encodeURIComponent(safeName)}`);
        if (r.ok) {
            const t = await r.json();
            if (t?.id)
                return String(t.id);
        }
    }
    catch {
    }
    try {
        const r = await fetch(`${base}/tenants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: safeName, country: 'TN', branding: {} }),
        });
        if (r.ok) {
            const t = await r.json();
            if (t?.id)
                return String(t.id);
        }
    }
    catch {
    }
    return crypto_1.default.randomUUID();
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
    const superRole = await upsertRole('SUPER_ADMIN');
    const ownerRole = await upsertRole('BUSINESS_OWNER');
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
    const tenantIdForAdmin = await ensureTenantId('TaskFlow Admin');
    const tenantIdForDemo = await ensureTenantId('Demo Company');
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
//# sourceMappingURL=seed.js.map