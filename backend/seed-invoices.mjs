/**
 * Seed realistic invoices for every business
 * - Minimum 20 invoices per business
 * - Uses real client IDs from the business
 * - Mix of statuses: OVERDUE, SENT, PAID, DRAFT, CANCELED
 * - Each invoice has 2-4 line items
 *
 * Run: node backend/seed-invoices.mjs
 */

import pg from 'pg';
import { randomUUID } from 'crypto';
const { Client } = pg;

// ─── Database connections ─────────────────────────────────────────────────
const businessDb = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,        // ← plus de valeur par défaut
  database: process.env.DB_BUSINESS || 'taskflow_business',
});

const invoiceDb = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,        // ← plus de valeur par défaut
  database: process.env.DB_INVOICE || 'taskflow_invoice',
});

// ─── Realistic data pools ────────────────────────────────────────────────────

const SERVICES = [
  { desc: 'Développement logiciel sur mesure', unitPrice: 3500, qty: 1 },
  { desc: 'Consulting stratégique mensuel', unitPrice: 2800, qty: 1 },
  { desc: 'Maintenance et support technique', unitPrice: 1200, qty: 1 },
  { desc: 'Formation professionnelle (2 jours)', unitPrice: 950, qty: 2 },
  { desc: 'Audit de sécurité informatique', unitPrice: 4200, qty: 1 },
  { desc: 'Intégration API et connecteurs', unitPrice: 1800, qty: 3 },
  { desc: 'Hébergement cloud mensuel', unitPrice: 450, qty: 12 },
  { desc: 'Conception UX/UI application mobile', unitPrice: 5500, qty: 1 },
  { desc: 'Migration base de données', unitPrice: 2200, qty: 1 },
  { desc: 'Analyse des données et rapports', unitPrice: 1600, qty: 2 },
  { desc: 'Développement module ERP', unitPrice: 6800, qty: 1 },
  { desc: 'Tests et assurance qualité', unitPrice: 1100, qty: 4 },
  { desc: 'Déploiement infrastructure cloud', unitPrice: 3200, qty: 1 },
  { desc: 'Optimisation performance système', unitPrice: 900, qty: 3 },
  { desc: 'Rédaction documentation technique', unitPrice: 600, qty: 5 },
  { desc: 'Licence logicielle annuelle', unitPrice: 7500, qty: 1 },
  { desc: 'Installation et configuration serveur', unitPrice: 1400, qty: 2 },
  { desc: 'Développement tableau de bord BI', unitPrice: 4800, qty: 1 },
  { desc: 'Implémentation solution CRM', unitPrice: 8200, qty: 1 },
  { desc: 'Services de cybersécurité', unitPrice: 3100, qty: 1 },
  { desc: 'Refonte site web corporate', unitPrice: 5200, qty: 1 },
  { desc: 'Développement application mobile', unitPrice: 12000, qty: 1 },
  { desc: 'Support utilisateur premium (mensuel)', unitPrice: 800, qty: 6 },
  { desc: 'Personnalisation et paramétrage ERP', unitPrice: 2600, qty: 1 },
  { desc: 'Sauvegarde et reprise après sinistre', unitPrice: 1700, qty: 1 },
  { desc: 'Étude de faisabilité technique', unitPrice: 2400, qty: 1 },
  { desc: 'Développement API REST/GraphQL', unitPrice: 3800, qty: 1 },
  { desc: 'Intégration système de paiement', unitPrice: 2900, qty: 1 },
  { desc: 'Automatisation des processus', unitPrice: 4100, qty: 1 },
  { desc: 'Veille technologique trimestrielle', unitPrice: 750, qty: 4 },
];

const NOTES = [
  'Paiement à 30 jours. TVA 19% incluse.',
  'Conditions : paiement à réception de facture.',
  'Merci de mentionner le numéro de facture lors du virement.',
  'Paiement par virement bancaire uniquement.',
  'Délai de paiement : 45 jours fin de mois.',
  'Facture établie suite au bon de commande BC-2025.',
  'Acompte de 30% versé. Solde restant dû.',
  'Toute facture non réglée sous 60 jours entraîne des pénalités.',
  'Prestation réalisée conformément au cahier des charges.',
  'Facture définitive — aucun escompte pour paiement anticipé.',
  'Paiement attendu avant le début de la prochaine phase.',
  'Bon de livraison n° BL-2025 joint à la présente.',
];

// ─── Status distribution per business (25 invoices) ─────────────────────────
// OVERDUE x6 → HIGH risk | SENT (due <7j) x5 → MEDIUM risk | SENT (due >7j) x4 | PAID x7 | DRAFT x3
const STATUS_PLAN = [
  ...Array(6).fill('OVERDUE'),
  ...Array(9).fill('SENT'),
  ...Array(7).fill('PAID'),
  ...Array(3).fill('DRAFT'),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateDates(status) {
  const today = new Date();

  if (status === 'OVERDUE') {
    // Issued 60-180 days ago, due 10-60 days ago
    const issueDaysAgo = rand(60, 180);
    const dueDelay = rand(15, 45); // payment terms
    const issueDate = daysFromNow(-issueDaysAgo);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + dueDelay);
    // Ensure dueDate is in the past
    if (dueDate >= today) dueDate.setDate(today.getDate() - rand(5, 20));
    return { issueDate, dueDate };
  }

  if (status === 'SENT') {
    const issueDaysAgo = rand(5, 40);
    const issueDate = daysFromNow(-issueDaysAgo);
    // Due in -5 to +30 days (mix MEDIUM and LOW risk)
    const daysUntilDue = rand(-5, 30);
    const dueDate = daysFromNow(daysUntilDue);
    return { issueDate, dueDate };
  }

  if (status === 'PAID') {
    const issueDaysAgo = rand(30, 120);
    const issueDate = daysFromNow(-issueDaysAgo);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + rand(15, 45));
    return { issueDate, dueDate };
  }

  if (status === 'DRAFT') {
    const issueDate = daysFromNow(-rand(1, 10));
    const dueDate = daysFromNow(rand(20, 60));
    return { issueDate, dueDate };
  }

  // CANCELED
  const issueDate = daysFromNow(-rand(10, 90));
  const dueDate = daysFromNow(rand(15, 45));
  return { issueDate, dueDate };
}

function generateItems(invoiceId) {
  const count = rand(2, 4);
  const shuffled = shuffle(SERVICES).slice(0, count);
  return shuffled.map((svc) => ({
    id: randomUUID(),
    invoiceId,
    description: svc.desc,
    quantity: svc.qty,
    unitPrice: svc.unitPrice,
    amount: svc.qty * svc.unitPrice,
  }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await businessDb.connect();
  await invoiceDb.connect();

  console.log('✅ Connected to databases\n');

  // 1. Fetch all active businesses
  const { rows: businesses } = await businessDb.query(
    `SELECT id, name FROM "Business" WHERE "deletedAt" IS NULL ORDER BY name`
  );
  console.log(`📋 Found ${businesses.length} businesses\n`);

  let totalInvoices = 0;
  let totalItems = 0;

  for (const business of businesses) {
    // 2. Fetch clients for this business
    const { rows: clients } = await businessDb.query(
      `SELECT id, name FROM "Client" WHERE "businessId" = $1 AND "deletedAt" IS NULL`,
      [business.id]
    );

    if (clients.length === 0) {
      console.log(`⚠️  ${business.name}: no clients found, skipping`);
      continue;
    }

    // 3. Check how many invoices already exist
    const { rows: existing } = await invoiceDb.query(
      `SELECT COUNT(*)::int as cnt FROM "Invoice" WHERE "businessId" = $1 AND "deletedAt" IS NULL`,
      [business.id]
    );
    const existingCount = existing[0].cnt;

    const needed = Math.max(0, 25 - existingCount);
    if (needed === 0) {
      console.log(`✅ ${business.name}: already has ${existingCount} invoices, skipping`);
      continue;
    }

    console.log(
      `🏢 ${business.name}: has ${existingCount} invoices, adding ${needed}...`
    );

    // 4. Build the statuses to insert
    const statuses = shuffle(STATUS_PLAN).slice(0, needed);

    // Build invoice prefix from business name (first letters)
    const prefix = business.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);

    let seq = existingCount + 1;

    for (const status of statuses) {
      const client = pick(clients);
      const { issueDate, dueDate } = generateDates(status);
      const items = generateItems('PLACEHOLDER');
      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      const taxRate = 0.19;
      const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
      const invoiceNumber = `INV-${prefix}-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
      const invoiceId = randomUUID();
      seq++;

      // Insert invoice
      await invoiceDb.query(
        `INSERT INTO "Invoice" (
          id, "businessId", "clientId", "invoiceNumber", status,
          "issueDate", "dueDate", "totalAmount", "taxAmount",
          "pdfUrl", notes, "updatedAt", "reminderCount"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          invoiceId,
          business.id,
          client.id,
          invoiceNumber,
          status,
          issueDate,
          dueDate,
          totalAmount,
          taxAmount,
          '',
          pick(NOTES),
          new Date(),
          0,
        ]
      );

      // Insert items (with real invoiceId)
      for (const item of items) {
        await invoiceDb.query(
          `INSERT INTO "InvoiceItem" (id, "invoiceId", description, quantity, "unitPrice", amount)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [randomUUID(), invoiceId, item.description, item.quantity, item.unitPrice, item.amount]
        );
      }

      totalInvoices++;
      totalItems += items.length;
    }

    // Count after
    const { rows: after } = await invoiceDb.query(
      `SELECT COUNT(*)::int as cnt FROM "Invoice" WHERE "businessId" = $1 AND "deletedAt" IS NULL`,
      [business.id]
    );
    console.log(`   → Now ${after[0].cnt} invoices for ${business.name}`);
  }

  console.log(`\n🎉 Done! Inserted ${totalInvoices} invoices with ${totalItems} line items.`);

  await businessDb.end();
  await invoiceDb.end();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
