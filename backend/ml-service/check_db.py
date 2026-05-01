import os
import pandas as pd
from sqlalchemy import create_engine, text

def check_db():
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/taskflow_business')
    INVOICE_DATABASE_URL = os.getenv('INVOICE_DATABASE_URL', DATABASE_URL.replace('/taskflow_business', '/taskflow_invoice'))
    
    engine = create_engine(INVOICE_DATABASE_URL)
    
    # Get all business IDs
    with engine.connect() as conn:
        businesses = pd.read_sql('SELECT DISTINCT "businessId" FROM "Invoice"', conn)
        print(f"Found businesses with invoices: {businesses['businessId'].tolist()}")
        
        for biz_id in businesses['businessId']:
            print(f"\n--- Checking business {biz_id} ---")
            query = text("""
                SELECT "createdAt" 
                FROM "Invoice" 
                WHERE "businessId" = :bid
            """)
            df = pd.read_sql(query, conn, params={'bid': biz_id})
            df['date'] = pd.to_datetime(df['createdAt'])
            df['month'] = df['date'].dt.to_period('M')
            monthly = df.groupby('month').size().reset_index(name='count')
            print(monthly)

if __name__ == "__main__":
    check_db()
