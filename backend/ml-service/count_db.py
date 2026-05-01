import os
from sqlalchemy import create_engine, text

def count_records():
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/taskflow_business')
    INVOICE_DATABASE_URL = os.getenv('INVOICE_DATABASE_URL', DATABASE_URL.replace('/taskflow_business', '/taskflow_invoice'))
    
    engine = create_engine(DATABASE_URL)
    invoice_engine = create_engine(INVOICE_DATABASE_URL)
    
    try:
        with invoice_engine.connect() as conn:
            inv_count = conn.execute(text('SELECT COUNT(*) FROM "Invoice"')).scalar()
            print(f"INVOICE_COUNT={inv_count}")
    except Exception as e:
        print(f"INVOICE_COUNT=ERROR: {e}")
        
    try:
        from database import expense_engine
        with expense_engine.connect() as conn:
            exp_count = conn.execute(text('SELECT COUNT(*) FROM "Expense"')).scalar()
            print(f"EXPENSE_COUNT={exp_count}")
    except Exception as e:
        print(f"EXPENSE_COUNT=ERROR: {e}")

if __name__ == "__main__":
    count_records()
