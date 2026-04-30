const { randomUUID } = require('crypto');
const { Client } = require('pg');

const DEFAULTS = {
  auth: 'postgresql://postgres:taskflow2026@localhost:5432/taskflow_auth',
  business: 'postgresql://postgres:taskflow2026@localhost:5432/taskflow_business',
  invoice: 'postgresql://postgres:taskflow2026@localhost:5432/taskflow_invoice',
  tenant: 'postgresql://postgres:taskflow2026@localhost:5432/taskflow_tenant',
};

const ROLE_SEQUENCE = [
  'BUSINESS_OWNER',
  'ACCOUNTANT',
  'ACCOUNTANT',
  'ACCOUNTANT',
  'ADMIN',
  'ADMIN',
  'ADMIN',
  'TEAM_MEMBER',
  'TEAM_MEMBER',
  'TEAM_MEMBER',
];

const EXTRA_ROLE = 'BUSINESS_ADMIN';
const INVOICE_STATUSES = ['PAID', 'SENT', 'OVERDUE', 'DRAFT'];
const PAYMENT_METHODS = ['BANK_TRANSFER', 'CARD', 'CASH'];
const CITY_POOL = [
  'Tunis',
  'Sfax',
  'Sousse',
  'Nabeul',
  'Monastir',
  'Bizerte',
  'Gabes',
  'Mahdia',
];

function connect(url) {
  return new Client({ connectionString: url });
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pad(value, size) {
  return String(value).padStart(size, '0');
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function buildPhone(seed) {
  const value = 20000000 + (seed % 79999999);
  return String(value).slice(0, 8);
}

function buildTaxNumber(counter) {
  return `C${pad(counter, 12)}`;
}

function buildClientName(tenantName, user, globalIndex, localIndex) {
  const tenantSlug = slugify(tenantName).replace(/-/g, ' ');
  const first = String(user.firstName || '').trim();
  const last = String(user.lastName || '').trim();
  return `${first} ${last} ${tenantSlug} client ${globalIndex}-${localIndex}`.trim();
}

function buildClientEmail(counter) {
  return `client.${pad(counter, 4)}@taskflow.local`;
}

function buildClientAddress(counter, city) {
  return `${10 + (counter % 190)} Rue ${city}, ${city}`;
}

function buildInvoiceStatus(seed) {
  return INVOICE_STATUSES[seed % INVOICE_STATUSES.length];
}

function buildPaymentMethod(seed) {
  return PAYMENT_METHODS[seed % PAYMENT_METHODS.length];
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function ensureAssignedUserIdColumn(businessDb) {
  await businessDb.query(`
    ALTER TABLE "Client"
    ADD COLUMN IF NOT EXISTS "assignedUserId" UUID;
  `);
  await businessDb.query(`
    CREATE INDEX IF NOT EXISTS "Client_assignedUserId_idx"
    ON "Client"("assignedUserId");
  `);
}

async function loadTenants(tenantDb) {
  const { rows } = await tenantDb.query(`
    SELECT id, name
    FROM "Tenant"
    WHERE "deletedAt" IS NULL
    ORDER BY name ASC
  `);
  return rows;
}

async function loadRoles(authDb) {
  const { rows } = await authDb.query(`
    SELECT id, name
    FROM "Role"
    WHERE name = ANY($1::text[])
  `, [[...new Set([...ROLE_SEQUENCE, EXTRA_ROLE])]]);

  const roleMap = new Map(rows.map((row) => [row.name, row.id]));
  for (const roleName of [...new Set([...ROLE_SEQUENCE, EXTRA_ROLE])]) {
    assert(roleMap.has(roleName), `Missing role ${roleName} in auth database`);
  }
  return roleMap;
}

async function loadMemberships(authDb) {
  const { rows } = await authDb.query(`
    SELECT
      utm.id AS "membershipId",
      utm."tenantId",
      utm."userId",
      utm."joinedAt",
      utm."createdAt",
      u."firstName",
      u."lastName",
      u.email
    FROM "UserTenantMembership" utm
    JOIN "User" u ON u.id = utm."userId"
    WHERE utm."deletedAt" IS NULL
      AND u."deletedAt" IS NULL
    ORDER BY
      utm."tenantId" ASC,
      COALESCE(utm."joinedAt", utm."createdAt") ASC,
      u."firstName" ASC,
      u."lastName" ASC,
      u.id ASC
  `);
  return rows;
}

async function loadBusinesses(businessDb) {
  const { rows } = await businessDb.query(`
    SELECT id, name, "companyId", "tenantId"
    FROM "Business"
    WHERE "deletedAt" IS NULL
    ORDER BY "companyId" ASC, name ASC, id ASC
  `);
  return rows;
}

async function normalizeRoles(authDb, tenants, memberships, roleMap) {
  const membershipsByTenant = new Map();
  for (const membership of memberships) {
    const list = membershipsByTenant.get(membership.tenantId) || [];
    list.push(membership);
    membershipsByTenant.set(membership.tenantId, list);
  }

  await authDb.query('BEGIN');
  try {
    for (const tenant of tenants) {
      const tenantMemberships = membershipsByTenant.get(tenant.id) || [];
      assert(
        tenantMemberships.length >= ROLE_SEQUENCE.length,
        `Tenant ${tenant.name} does not have enough active employees`,
      );

      for (let index = 0; index < tenantMemberships.length; index += 1) {
        const membership = tenantMemberships[index];
        const roleName = ROLE_SEQUENCE[index] || EXTRA_ROLE;
        await authDb.query(
          `
            UPDATE "UserTenantMembership"
            SET "roleId" = $1, "updatedAt" = NOW()
            WHERE id = $2
          `,
          [roleMap.get(roleName), membership.membershipId],
        );
      }
    }
    await authDb.query('COMMIT');
  } catch (error) {
    await authDb.query('ROLLBACK');
    throw error;
  }
}

function createClientSeedData(tenants, memberships, businessesByTenant) {
  const membershipsByTenant = new Map();
  for (const membership of memberships) {
    const list = membershipsByTenant.get(membership.tenantId) || [];
    list.push(membership);
    membershipsByTenant.set(membership.tenantId, list);
  }

  const clients = [];
  let clientCounter = 1;

  for (const tenant of tenants) {
    const tenantMemberships = membershipsByTenant.get(tenant.id) || [];
    const tenantBusinesses = businessesByTenant.get(tenant.id) || [];
    assert(tenantBusinesses.length >= 5, `Tenant ${tenant.name} must have at least 5 businesses`);

    tenantMemberships.forEach((user, userIndex) => {
      for (let localIndex = 1; localIndex <= 3; localIndex += 1) {
        const business = tenantBusinesses[(userIndex * 3 + localIndex - 1) % tenantBusinesses.length];
        const seed = hashString(`${tenant.id}:${user.userId}:${localIndex}:${clientCounter}`);
        const city = CITY_POOL[seed % CITY_POOL.length];

        clients.push({
          id: randomUUID(),
          tenantId: tenant.id,
          businessId: business.id,
          assignedUserId: user.userId,
          employeeName: `${user.firstName} ${user.lastName}`.trim(),
          name: buildClientName(tenant.name, user, clientCounter, localIndex),
          email: buildClientEmail(clientCounter),
          phone: buildPhone(seed),
          address: buildClientAddress(clientCounter, city),
          taxNumber: buildTaxNumber(clientCounter),
        });

        clientCounter += 1;
      }
    });
  }

  return clients;
}

async function replaceClients(businessDb, clients) {
  await businessDb.query('BEGIN');
  try {
    await businessDb.query(`DELETE FROM "ClientCommunication"`);
    await businessDb.query(`DELETE FROM "Client"`);

    for (const client of clients) {
      await businessDb.query(
        `
          INSERT INTO "Client" (
            id,
            "businessId",
            "assignedUserId",
            name,
            email,
            phone,
            address,
            "taxNumber",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `,
        [
          client.id,
          client.businessId,
          client.assignedUserId,
          client.name,
          client.email,
          client.phone,
          client.address,
          client.taxNumber,
        ],
      );
    }

    await businessDb.query('COMMIT');
  } catch (error) {
    await businessDb.query('ROLLBACK');
    throw error;
  }
}

function createInvoiceSeedData(clients) {
  const invoices = [];
  let invoiceCounter = 1;

  for (const client of clients) {
    const clientSeed = hashString(client.id);

    for (let index = 0; index < 5; index += 1) {
      const seed = clientSeed + index;
      const status = buildInvoiceStatus(seed);
      const issueDate = new Date();
      issueDate.setHours(9, 0, 0, 0);
      issueDate.setDate(issueDate.getDate() - (40 + (seed % 220) + index * 11));

      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 15 + (seed % 12));

      if (status === 'SENT' || status === 'DRAFT') {
        dueDate.setDate(dueDate.getDate() + 20);
      }

      if (status === 'OVERDUE') {
        dueDate.setTime(Date.now() - (10 + (seed % 30)) * 86400000);
      }

      const quantity = 1 + (seed % 4);
      const unitPrice = 180 + (seed % 12) * 35;
      const subtotal = round2(quantity * unitPrice);
      const taxAmount = round2(subtotal * 0.19);
      const totalAmount = round2(subtotal + taxAmount);

      const invoice = {
        id: randomUUID(),
        businessId: client.businessId,
        clientId: client.id,
        createdBy: client.assignedUserId,
        invoiceNumber: `INV-2026-${pad(invoiceCounter, 5)}`,
        status,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        totalAmount,
        taxAmount,
        pdfUrl: '',
        notes: `Invoice generated for ${client.employeeName}`,
        item: {
          id: randomUUID(),
          description: `Mission ${index + 1} - ${client.employeeName}`,
          quantity,
          unitPrice,
          amount: subtotal,
        },
        payment:
          status === 'PAID'
            ? {
                id: randomUUID(),
                amount: totalAmount,
                paymentDate: new Date(dueDate.getTime() - (2 + (seed % 5)) * 86400000),
                method: buildPaymentMethod(seed),
                reference: `PAY-${pad(invoiceCounter, 5)}`,
              }
            : null,
      };

      invoices.push(invoice);
      invoiceCounter += 1;
    }
  }

  return invoices;
}

async function replaceInvoices(invoiceDb, invoices) {
  await invoiceDb.query('BEGIN');
  try {
    await invoiceDb.query(`DELETE FROM "Payment"`);
    await invoiceDb.query(`DELETE FROM "InvoiceItem"`);
    await invoiceDb.query(`DELETE FROM "AIPrediction" WHERE "invoiceId" IS NOT NULL`);
    await invoiceDb.query(`DELETE FROM "Invoice"`);

    for (const invoice of invoices) {
      await invoiceDb.query(
        `
          INSERT INTO "Invoice" (
            id,
            "businessId",
            "clientId",
            "createdBy",
            "invoiceNumber",
            status,
            "issueDate",
            "dueDate",
            "totalAmount",
            "taxAmount",
            "pdfUrl",
            notes,
            "createdAt",
            "updatedAt",
            "reminderCount"
          )
          VALUES (
            $1, $2, $3, $4, $5, $6::"InvoiceStatus", $7, $8, $9, $10, $11, $12, NOW(), NOW(), 0
          )
        `,
        [
          invoice.id,
          invoice.businessId,
          invoice.clientId,
          invoice.createdBy,
          invoice.invoiceNumber,
          invoice.status,
          invoice.issueDate,
          invoice.dueDate,
          invoice.totalAmount,
          invoice.taxAmount,
          invoice.pdfUrl,
          invoice.notes,
        ],
      );

      await invoiceDb.query(
        `
          INSERT INTO "InvoiceItem" (
            id,
            "invoiceId",
            description,
            quantity,
            "unitPrice",
            amount,
            "createdAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [
          invoice.item.id,
          invoice.id,
          invoice.item.description,
          invoice.item.quantity,
          invoice.item.unitPrice,
          invoice.item.amount,
        ],
      );

      if (invoice.payment) {
        await invoiceDb.query(
          `
            INSERT INTO "Payment" (
              id,
              "invoiceId",
              amount,
              "paymentDate",
              method,
              reference,
              "createdAt"
            )
            VALUES ($1, $2, $3, $4, $5::"PaymentMethod", $6, NOW())
          `,
          [
            invoice.payment.id,
            invoice.id,
            invoice.payment.amount,
            invoice.payment.paymentDate,
            invoice.payment.method,
            invoice.payment.reference,
          ],
        );
      }
    }

    await invoiceDb.query('COMMIT');
  } catch (error) {
    await invoiceDb.query('ROLLBACK');
    throw error;
  }
}

async function validateState(authDb, businessDb, invoiceDb, tenants) {
  const roleCheck = await authDb.query(`
    SELECT
      utm."tenantId",
      r.name,
      COUNT(*)::int AS count
    FROM "UserTenantMembership" utm
    JOIN "Role" r ON r.id = utm."roleId"
    JOIN "User" u ON u.id = utm."userId"
    WHERE utm."deletedAt" IS NULL
      AND u."deletedAt" IS NULL
    GROUP BY utm."tenantId", r.name
  `);

  const roleMap = new Map();
  roleCheck.rows.forEach((row) => {
    const key = `${row.tenantId}:${row.name}`;
    roleMap.set(key, Number(row.count));
  });

  for (const tenant of tenants) {
    assert((roleMap.get(`${tenant.id}:ACCOUNTANT`) || 0) >= 3, `${tenant.name} is missing accountants`);
    assert((roleMap.get(`${tenant.id}:ADMIN`) || 0) >= 3, `${tenant.name} is missing admins`);
    assert((roleMap.get(`${tenant.id}:TEAM_MEMBER`) || 0) >= 3, `${tenant.name} is missing team members`);
  }

  const clientSummary = await businessDb.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(DISTINCT name)::int AS distinct_names,
      COUNT(DISTINCT "assignedUserId")::int AS distinct_users
    FROM "Client"
    WHERE "deletedAt" IS NULL
  `);
  const clientTotals = clientSummary.rows[0];
  assert(clientTotals.total === clientTotals.distinct_names, 'Client names are not unique');

  const perUserClientCounts = await businessDb.query(`
    SELECT "assignedUserId", COUNT(*)::int AS count
    FROM "Client"
    WHERE "deletedAt" IS NULL
    GROUP BY "assignedUserId"
  `);
  perUserClientCounts.rows.forEach((row) => {
    assert(Number(row.count) === 3, `User ${row.assignedUserId} does not have exactly 3 clients`);
  });

  const invoiceCounts = await invoiceDb.query(`
    SELECT "clientId", COUNT(*)::int AS count
    FROM "Invoice"
    WHERE "deletedAt" IS NULL
    GROUP BY "clientId"
  `);
  invoiceCounts.rows.forEach((row) => {
    assert(Number(row.count) >= 5, `Client ${row.clientId} has fewer than 5 invoices`);
  });

  return {
    clientTotal: Number(clientTotals.total),
    distinctUserTotal: Number(clientTotals.distinct_users),
    invoiceTotal: invoiceCounts.rows.reduce((sum, row) => sum + Number(row.count), 0),
  };
}

async function main() {
  const authDb = connect(process.env.DATABASE_URL_AUTH || DEFAULTS.auth);
  const businessDb = connect(process.env.DATABASE_URL_BUSINESS || DEFAULTS.business);
  const invoiceDb = connect(process.env.DATABASE_URL_INVOICE || DEFAULTS.invoice);
  const tenantDb = connect(process.env.DATABASE_URL_TENANT || DEFAULTS.tenant);

  await Promise.all([authDb.connect(), businessDb.connect(), invoiceDb.connect(), tenantDb.connect()]);

  try {
    await ensureAssignedUserIdColumn(businessDb);

    const [tenants, roleMap, memberships, businesses] = await Promise.all([
      loadTenants(tenantDb),
      loadRoles(authDb),
      loadMemberships(authDb),
      loadBusinesses(businessDb),
    ]);

    const businessesByTenant = new Map();
    businesses.forEach((business) => {
      const key = business.companyId || business.tenantId;
      const list = businessesByTenant.get(key) || [];
      list.push(business);
      businessesByTenant.set(key, list);
    });

    await normalizeRoles(authDb, tenants, memberships, roleMap);

    const clients = createClientSeedData(tenants, memberships, businessesByTenant);
    await replaceClients(businessDb, clients);

    const invoices = createInvoiceSeedData(clients);
    await replaceInvoices(invoiceDb, invoices);

    const summary = await validateState(authDb, businessDb, invoiceDb, tenants);

    console.log(
      JSON.stringify(
        {
          tenants: tenants.length,
          clients: summary.clientTotal,
          assignedUsers: summary.distinctUserTotal,
          invoices: summary.invoiceTotal,
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all([
      authDb.end(),
      businessDb.end(),
      invoiceDb.end(),
      tenantDb.end(),
    ]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
