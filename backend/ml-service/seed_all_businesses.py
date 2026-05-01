import os
import uuid
import random
from datetime import datetime, timedelta
from sqlalchemy import text
from database import engine, invoice_engine, discover_tables

def seed_all_businesses_2024_2026():
    print("🚀 Starting massive data seeding for ALL businesses...")
    
    # Discover the business table
    tables = discover_tables()
    business_table = None
    for t in tables:
        if t.lower() in ['business', 'company', 'tenant']:
            business_table = f'"{t}"'
            break
            
    if not business_table:
        print("⚠️ Could not find Business table. Assuming '\"Business\"'.")
        business_table = '"Business"'
        
    # Get all business IDs
    try:
        with engine.connect() as conn:
            business_ids = [str(r[0]) for r in conn.execute(text(f"SELECT id FROM {business_table}")).fetchall()]
    except Exception as e:
        print(f"❌ Failed to fetch businesses: {e}")
        return

    print(f"Found {len(business_ids)} businesses. Seeding data for each...")

    for business_id in business_ids:
        seed_for_business(business_id)
        
    print("🎉 MASSIVE DATA SEEDING COMPLETE FOR ALL BUSINESSES!")

def seed_for_business(business_id):
    print(f"--- Seeding for Business {business_id} ---")
    user_id = str(uuid.uuid4())
    
    # 1. Setup Client for invoices
    with invoice_engine.connect() as conn:
        result = conn.execute(text('SELECT "clientId" FROM "Invoice" WHERE "businessId" = :bid LIMIT 1'), {'bid': business_id}).fetchone()
        client_id = result[0] if result else str(uuid.uuid4())
    
    # 2. Setup Category for expenses
    with engine.connect() as conn:
        try:
            res_user = conn.execute(text('SELECT id FROM "User" LIMIT 1')).fetchone()
            if res_user:
                user_id = str(res_user[0])
        except Exception:
            pass

        try:
            res_cat = conn.execute(text('SELECT id FROM "ExpenseCategory" WHERE "businessId" = :bid LIMIT 1'), {'bid': business_id}).fetchone()
            if res_cat:
                category_id = str(res_cat[0])
            else:
                category_id = str(uuid.uuid4())
                conn.execute(text("""
                    INSERT INTO "ExpenseCategory" (id, "businessId", name, description, "createdAt", "updatedAt")
                    VALUES (:id, :bid, 'Frais Généraux (Auto-Généré)', 'Dépenses courantes', NOW(), NOW())
                """), {'id': category_id, 'bid': business_id})
                conn.commit()
        except Exception as e:
            category_id = str(uuid.uuid4())

    start_date = datetime(2024, 1, 1)
    end_date = datetime(2026, 4, 30) # Jan 2024 to Apr 2026 as requested
    current_date = start_date
    
    invoices = []
    expenses = []
    
    # Random base revenue between 5,000 and 20,000 to add variety between businesses
    base_revenue = random.uniform(5000.0, 20000.0)
    base_expense = base_revenue * random.uniform(0.3, 0.6)

    while current_date <= end_date:
        growth_factor = 1.0 + random.uniform(0.01, 0.05)
        base_revenue *= growth_factor
        base_expense *= (growth_factor * random.uniform(0.9, 1.1))
        
        month = current_date.month
        seasonality = 1.0
        if month in [10, 11, 12]:
            seasonality = random.uniform(1.1, 1.4)
        elif month in [7, 8]:
            seasonality = random.uniform(0.7, 0.9)
            
        monthly_revenue = base_revenue * seasonality
        monthly_expense = base_expense * seasonality
        
        # At least 7 invoices per month as requested
        num_invoices = random.randint(7, 15)
        for i in range(num_invoices):
            amount = (monthly_revenue / num_invoices) * random.uniform(0.7, 1.3)
            
            day = random.randint(1, 28)
            created_at = current_date.replace(day=day, hour=random.randint(8,18), minute=random.randint(0,59))
            due_date = created_at + timedelta(days=30)
            
            now = datetime.now()
            status = 'PAID'
            if created_at > now:
                status = 'DRAFT' if random.random() > 0.5 else 'SENT'
            elif (now - created_at).days < 30:
                status = random.choice(['SENT', 'PAID'])
            elif (now - created_at).days > 30 and (now - created_at).days < 60:
                status = 'OVERDUE' if random.random() > 0.7 else 'PAID'

            invoices.append({
                'id': str(uuid.uuid4()),
                'businessId': business_id,
                'clientId': client_id,
                'createdBy': None,
                'invoiceNumber': f"INV-{business_id[:4]}-{created_at.year}{created_at.month:02d}-{i+1}",
                'status': status,
                'issueDate': created_at,
                'dueDate': due_date,
                'totalAmount': round(amount, 2),
                'taxAmount': round(amount * 0.19, 2),
                'pdfUrl': 'auto_generated.pdf',
                'notes': 'Generated by AI seeding script (2024-2026).',
                'reminderCount': 0,
                'createdAt': created_at,
                'updatedAt': created_at,
                'deletedAt': None
            })
            
        # At least 7 expenses per month as requested
        num_expenses = random.randint(7, 15)
        for i in range(num_expenses):
            amount = (monthly_expense / num_expenses) * random.uniform(0.5, 1.5)
            
            day = random.randint(1, 28)
            expense_date = current_date.replace(day=day)
            
            expenses.append({
                'id': str(uuid.uuid4()),
                'businessId': business_id,
                'amount': round(amount, 2),
                'date': expense_date,
                'description': f"Dépense auto-générée ({expense_date.strftime('%B %Y')})",
                'receiptUrl': None,
                'status': 'APPROVED' if expense_date < datetime.now() else 'PENDING',
                'rejectionReason': None,
                'categoryId': category_id,
                'createdBy': user_id,
                'createdAt': expense_date,
                'updatedAt': expense_date,
                'deletedAt': None
            })

        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)

    print(f"  -> Generated {len(invoices)} invoices and {len(expenses)} expenses for business {business_id}.")

    # Delete existing old auto-generated data to prevent massive DB explosion if run multiple times
    delete_query = text("""
        DELETE FROM "Invoice" 
        WHERE "businessId" = :bid AND notes = 'Generated by AI seeding script (2024-2026).'
    """)
    with invoice_engine.begin() as conn:
        conn.execute(delete_query, {'bid': business_id})

    insert_inv_query = text("""
        INSERT INTO "Invoice" (
            id, "businessId", "clientId", "createdBy", "invoiceNumber", 
            status, "issueDate", "dueDate", "totalAmount", "taxAmount", 
            "pdfUrl", notes, "reminderCount", "createdAt", "updatedAt", "deletedAt"
        ) VALUES (
            :id, :businessId, :clientId, :createdBy, :invoiceNumber, 
            :status, :issueDate, :dueDate, :totalAmount, :taxAmount, 
            :pdfUrl, :notes, :reminderCount, :createdAt, :updatedAt, :deletedAt
        )
    """)
    
    with invoice_engine.begin() as conn:
        for inv in invoices:
            conn.execute(insert_inv_query, inv)

    try:
        # Cleanup old auto expenses
        with engine.begin() as conn:
            conn.execute(text("""
                DELETE FROM "Expense" 
                WHERE "businessId" = :bid AND description LIKE 'Dépense auto-générée%'
            """), {'bid': business_id})
    except Exception:
        pass

    insert_exp_query = text("""
        INSERT INTO "Expense" (
            id, "businessId", amount, date, description, "receiptUrl", status, 
            "rejectionReason", "categoryId", "createdBy", "createdAt", "updatedAt", "deletedAt"
        ) VALUES (
            :id, :businessId, :amount, :date, :description, :receiptUrl, :status, 
            :rejectionReason, :categoryId, :createdBy, :createdAt, :updatedAt, :deletedAt
        )
    """)
    
    try:
        with engine.begin() as conn:
            for exp in expenses:
                conn.execute(insert_exp_query, exp)
        print(f"  ✅ DB Update complete for business {business_id}.")
    except Exception as e:
        print(f"  ⚠️ Could not insert expenses: {e}")

if __name__ == "__main__":
    seed_all_businesses_2024_2026()
