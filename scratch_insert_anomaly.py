import psycopg2
from datetime import datetime, timedelta
import uuid

DB_BASE = "postgresql://postgres:taskflow2026@localhost:5432"

# Connect to the 3 databases
conn_biz = psycopg2.connect(f"{DB_BASE}/taskflow_business")
conn_inv = psycopg2.connect(f"{DB_BASE}/taskflow_invoice")
conn_exp = psycopg2.connect(f"{DB_BASE}/taskflow_expense")
cur_biz = conn_biz.cursor()
cur_inv = conn_inv.cursor()
cur_exp = conn_exp.cursor()

# ── 1. Business ──────────────────────────────────────────────────────────────
cur_biz.execute('SELECT id FROM "Business" LIMIT 1')
biz = cur_biz.fetchone()
if not biz:
    print("❌ No business found in taskflow_business")
    exit(1)
business_id = str(biz[0])
print(f"✅ Using business_id: {business_id}")

# ── 2. Client ────────────────────────────────────────────────────────────────
cur_biz.execute('SELECT id FROM "Client" WHERE "businessId" = %s LIMIT 1', (business_id,))
cli = cur_biz.fetchone()
if not cli:
    client_id = str(uuid.uuid4())
    cur_biz.execute(
        'INSERT INTO "Client" (id, "businessId", name, email, "createdAt", "updatedAt") '
        'VALUES (%s, %s, %s, %s, NOW(), NOW())',
        (client_id, business_id, 'Test Anomaly Client', 'anomaly@test.com')
    )
    conn_biz.commit()
    print(f"✅ Created client: {client_id}")
else:
    client_id = str(cli[0])
    print(f"✅ Using client_id: {client_id}")

# ── 3. Normal invoices (15 invoices spread over 15 days) ─────────────────────
now = datetime.now()
INVOICE_NUMBER_PREFIX = "TEST-ANO"

for i in range(15):
    inv_id = str(uuid.uuid4())
    issue_date = now - timedelta(days=i + 2)
    due_date   = issue_date + timedelta(days=30)
    cur_inv.execute(
        'INSERT INTO "Invoice" '
        '(id, "businessId", "clientId", "invoiceNumber", status, "issueDate", "dueDate", '
        '"totalAmount", "taxAmount", "pdfUrl", notes, "createdAt", "updatedAt") '
        'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())',
        (inv_id, business_id, client_id,
         f"{INVOICE_NUMBER_PREFIX}-{i+1:03d}",
         'PAID', issue_date, due_date,
         round(100.0 + i * 12.5, 2),   # normal amounts: 100, 112.5, 125 ...
         round((100.0 + i * 12.5) * 0.19, 2),
         '', '')
    )
print("✅ 15 normal invoices inserted")

# ── 4. Duplicate invoices anomaly (same client, same amount, same date) ───────
dup_amount = 555.55
dup_tax    = round(dup_amount * 0.19, 2)
for k in range(2):
    inv_id = str(uuid.uuid4())
    cur_inv.execute(
        'INSERT INTO "Invoice" '
        '(id, "businessId", "clientId", "invoiceNumber", status, "issueDate", "dueDate", '
        '"totalAmount", "taxAmount", "pdfUrl", notes, "createdAt", "updatedAt") '
        'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())',
        (inv_id, business_id, client_id,
         f"DUP-ANO-{k+1:03d}",
         'SENT', now, now + timedelta(days=30),
         dup_amount, dup_tax, '', '')
    )
print("✅ 2 duplicate invoices inserted (anomaly HIGH)")

# ── 5. Outlier invoice (IsolationForest bait) ─────────────────────────────────
outlier_id = str(uuid.uuid4())
cur_inv.execute(
    'INSERT INTO "Invoice" '
    '(id, "businessId", "clientId", "invoiceNumber", status, "issueDate", "dueDate", '
    '"totalAmount", "taxAmount", "pdfUrl", notes, "createdAt", "updatedAt") '
    'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())',
    (outlier_id, business_id, client_id,
     'OUTLIER-ANO-001',
     'SENT', now, now + timedelta(days=30),
     99999.99, round(99999.99 * 0.19, 2), '', '')
)
print("✅ 1 outlier invoice inserted (anomaly MEDIUM via IsolationForest)")

conn_inv.commit()

# ── 6. ExpenseCategory (required FK) ────────────────────────────────────────
# Check if a category exists for this business
cur_exp.execute(
    'SELECT id FROM "ExpenseCategory" WHERE ("businessId" = %s OR "businessId" IS NULL) '
    'AND "deletedAt" IS NULL LIMIT 1',
    (business_id,)
)
cat = cur_exp.fetchone()
if not cat:
    cat_id = str(uuid.uuid4())
    cur_exp.execute(
        'INSERT INTO "ExpenseCategory" (id, "businessId", name, description, "createdAt", "updatedAt") '
        'VALUES (%s, %s, %s, %s, NOW(), NOW())',
        (cat_id, business_id, 'Fournitures', 'Fournitures de bureau')
    )
    conn_exp.commit()
    print(f"✅ Created expense category: {cat_id}")
else:
    cat_id = str(cat[0])
    print(f"✅ Using expense category_id: {cat_id}")

# Use business ownerId as the createdBy for expenses
cur_biz.execute('SELECT "ownerId" FROM "Business" WHERE id = %s', (business_id,))
owner = cur_biz.fetchone()
if owner and owner[0]:
    user_id = str(owner[0])
else:
    # Fallback: use any UUID that satisfies the NOT NULL constraint
    # (just needs to be a valid UUID — no FK to User table in taskflow_expense)
    user_id = str(uuid.uuid4())
print(f"✅ Using user_id for expenses: {user_id}")

# ── 7. Normal expenses ────────────────────────────────────────────────────────
for i in range(5):
    exp_id = str(uuid.uuid4())
    cur_exp.execute(
        'INSERT INTO "Expense" '
        '(id, "businessId", amount, date, description, status, "categoryId", "createdBy", "createdAt", "updatedAt") '
        'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())',
        (exp_id, business_id, 50.0 + i * 10,
         now - timedelta(days=i + 1),
         f'Achat fournitures #{i+1}', 'APPROVED', cat_id, user_id)
    )
print("✅ 5 normal expenses inserted")

# ── 8. Duplicate expense anomaly ─────────────────────────────────────────────
for k in range(2):
    exp_id = str(uuid.uuid4())
    cur_exp.execute(
        'INSERT INTO "Expense" '
        '(id, "businessId", amount, date, description, status, "categoryId", "createdBy", "createdAt", "updatedAt") '
        'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())',
        (exp_id, business_id, 123.45, now,
         f'Dépense dupliquée #{k+1}', 'PENDING', cat_id, user_id)
    )
print("✅ 2 duplicate expenses inserted (anomaly HIGH)")

conn_biz.commit()
conn_exp.commit()

cur_biz.close()
cur_inv.close()
cur_exp.close()
conn_biz.close()
conn_inv.close()
conn_exp.close()

print("\n🎉 All data inserted successfully! The anomaly detection module will now have real data to work with.")
