import os
import json
import uuid
from typing import Optional, Dict, Any
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

load_dotenv()

# Constants
TABLE_CLIENT = '"Client"'
TABLE_INVOICE = '"Invoice"'
TABLE_EXPENSE = '"Expense"'
COLUMN_BUSINESS_ID = '"businessId"'
COLUMN_DELETED_AT = '"deletedAt"'

# Primary DB: taskflow_business (clients)
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL must be set in backend/ml-service/.env')

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=1,
    max_overflow=2,
)

# Secondary DB: taskflow_invoice (invoices)
INVOICE_DATABASE_URL = os.getenv(
    'INVOICE_DATABASE_URL',
    DATABASE_URL.replace('/taskflow_business', '/taskflow_invoice')
)
invoice_engine = create_engine(
    INVOICE_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=1,
    max_overflow=2,
)

# Tertiary DB: taskflow_expense (expenses)
EXPENSE_DATABASE_URL = os.getenv(
    'EXPENSE_DATABASE_URL',
    DATABASE_URL.replace('/taskflow_business', '/taskflow_expense')
)
expense_engine = create_engine(
    EXPENSE_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=1,
    max_overflow=2,
)

# ✅ TABLE NAME DISCOVERY
TABLE_NAMES = {}

def get_columns(table_name: str) -> list:
    """Get all column names from a specific table"""
    query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = :table_name
    """)
    try:
        with engine.connect() as conn:
            result = conn.execute(
                query,
                {'table_name': table_name}
            )
            return [row[0] for row in result]
    except Exception as e:
        print(f"❌ Error getting columns from {table_name}: {e}")
        return []

def discover_tables() -> list:
    """Discover all tables in public schema"""
    query = text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    try:
        with engine.connect() as conn:
            result = conn.execute(query)
            return [row[0] for row in result]
    except Exception as e:
        print(f"❌ Error discovering tables: {e}")
        return []

def map_single_table(all_tables: list, keyword: str, exclude: str = None) -> str:
    """Map a single logical table name to physical name"""
    for table_name in all_tables:
        table_lower = table_name.lower()
        if keyword in table_lower:
            if exclude and exclude in table_lower:
                continue
            return table_name
    return None

def get_real_table_names() -> dict:
    """
    Discover real table names and map them to logical names
    Handles both snake_case and PascalCase conventions
    """
    all_tables = discover_tables()
    mapping = {}

    client_table = map_single_table(all_tables, 'client', 'invoice')
    if client_table:
        mapping['client'] = client_table

    invoice_table = map_single_table(all_tables, 'invoice')
    if invoice_table:
        mapping['invoice'] = invoice_table

    expense_table = map_single_table(all_tables, 'expense', 'category')
    if expense_table:
        mapping['expense'] = expense_table

    business_table = map_single_table(all_tables, 'business', 'user')
    if business_table:
        mapping['business'] = business_table

    # Fallback defaults if discovery fails
    defaults = {
        'client': '"Client"',
        'invoice': '"Invoice"',
        'expense': '"Expense"',
        'business': '"Business"',
    }
    for key, default_value in defaults.items():
        if key not in mapping:
            mapping[key] = default_value

    return mapping

def init_table_names():
    """Initialize table names at startup"""
    defaults = {
        'client': '"Client"',
        'invoice': '"Invoice"',
        'expense': '"Expense"',
        'business': '"Business"',
    }
    try:
        result = get_real_table_names()
        TABLE_NAMES.clear()
        TABLE_NAMES.update(result)
        print(f"✅ Tables discovered: {dict(TABLE_NAMES)}")
    except Exception as e:
        print(f"❌ Error during table discovery: {e}")
        TABLE_NAMES.clear()
        TABLE_NAMES.update(defaults)
def get_clients(business_id: str) -> pd.DataFrame:
    """Get clients with invoice counts and totals for ML analysis.
    Clients are in taskflow_business, invoices in taskflow_invoice — merged in Python."""
    
    # 1. Fetch clients from taskflow_business
    client_query = text("""
        SELECT 
            id,
            "businessId",
            name,
            email,
            "createdAt"
        FROM "Client"
        WHERE "businessId" = :business_id
          AND "deletedAt" IS NULL
    """)

    try:
        with engine.connect() as conn:
            clients_df = pd.read_sql(client_query, conn, params={'business_id': business_id})
    except Exception as e:
        print(f"❌ Error fetching clients: {e}")
        return pd.DataFrame()

    if clients_df.empty:
        return pd.DataFrame()

    # 2. Fetch invoices from taskflow_invoice (different DB)
    invoice_query = text("""
        SELECT 
            "clientId",
            "totalAmount",
            "createdAt" AS invoice_date
        FROM "Invoice"
        WHERE "businessId" = :business_id
          AND "deletedAt" IS NULL
    """)

    try:
        with invoice_engine.connect() as conn:
            invoices_df = pd.read_sql(invoice_query, conn, params={'business_id': business_id})
    except Exception as e:
        print(f"⚠️  Could not fetch invoices (using 0 values): {e}")
        invoices_df = pd.DataFrame(columns=['clientId', 'totalAmount', 'invoice_date'])

    # 3. Merge in Python
    if invoices_df.empty:
        clients_df['invoice_count'] = 0
        clients_df['total_monetary'] = 0.0
        clients_df['last_invoice_date'] = pd.NaT
    else:
        agg = invoices_df.groupby('clientId').agg(
            invoice_count=('totalAmount', 'count'),
            total_monetary=('totalAmount', 'sum'),
            last_invoice_date=('invoice_date', 'max'),
        ).reset_index()
        clients_df = clients_df.merge(
            agg,
            left_on='id',
            right_on='clientId',
            how='left'
        )
        clients_df['invoice_count'] = clients_df['invoice_count'].fillna(0).astype(int)
        clients_df['total_monetary'] = clients_df['total_monetary'].fillna(0.0)
        clients_df['last_invoice_date'] = pd.to_datetime(clients_df['last_invoice_date'])

    return clients_df

def get_invoices(business_id: str) -> pd.DataFrame:
    """Get invoices for ML analysis — from taskflow_invoice DB (Prisma schema)"""
    query = text("""
        SELECT 
            id,
            "businessId",
            "clientId",
            "invoiceNumber",
            "totalAmount"          AS amount,
            "totalAmount"          AS "totalTTC",
            "taxAmount",
            status,
            "issueDate"            AS "createdAt",
            "dueDate",
            "createdAt"            AS "insertedAt"
        FROM "Invoice"
        WHERE "businessId" = :business_id
          AND "deletedAt" IS NULL
        ORDER BY "issueDate" ASC
    """)

    try:
        with invoice_engine.connect() as conn:
            df = pd.read_sql(query, conn, params={'business_id': business_id})
        # Fetch client names from taskflow_business
        if not df.empty:
            client_ids = df['clientId'].dropna().unique().tolist()
            if client_ids:
                placeholders = ','.join([f"'{c}'" for c in client_ids])
                name_query = text(f'SELECT id, name FROM "Client" WHERE id IN ({placeholders})')
                with engine.connect() as conn:
                    names_df = pd.read_sql(name_query, conn)
                name_map = dict(zip(names_df['id'].astype(str), names_df['name']))
                df['client_name'] = df['clientId'].astype(str).map(name_map).fillna('Unknown')
            else:
                df['client_name'] = 'Unknown'
        return df
    except Exception as e:
        print(f"❌ Error in get_invoices: {e}")
        return pd.DataFrame()

def get_expenses(business_id: str) -> pd.DataFrame:
    """Get expenses for ML analysis — from taskflow_expense DB (Prisma schema)"""
    # Schema is known from Prisma: id, businessId, amount, date, description,
    # status, categoryId, createdBy, createdAt, updatedAt, deletedAt
    query = text("""
        SELECT 
            e.id,
            e."businessId",
            e."createdBy",
            e.amount,
            e.date,
            e.description,
            e.status,
            e."categoryId",
            e."createdAt"
        FROM "Expense" e
        WHERE e."businessId" = :business_id
          AND e."deletedAt" IS NULL
        ORDER BY e."createdAt" ASC
    """)

    try:
        with expense_engine.connect() as conn:
            df = pd.read_sql(query, conn, params={'business_id': business_id})
        # Normalize column names so anomaly.py can use 'createdBy' consistently
        if not df.empty:
            # Ensure 'createdBy' column exists (alias for anomaly logic)
            if 'createdBy' not in df.columns and 'createdby' in df.columns:
                df.rename(columns={'createdby': 'createdBy'}, inplace=True)
            if 'categoryId' not in df.columns and 'categoryid' in df.columns:
                df.rename(columns={'categoryid': 'categoryId'}, inplace=True)
        return df
    except Exception as e:
        print(f"❌ Error in get_expenses: {e}")
        return pd.DataFrame()


def save_model_params(business_id: str, model_type: str, params: dict, accuracy: float = None) -> None:
    query = text('''
        INSERT INTO "MlModelParams"
            (id, "businessId", "modelType", params, accuracy, "trainedAt", "createdAt", "updatedAt")
        VALUES
            (:id, :business_id, :model_type, :params, :accuracy, :trained_at, NOW(), NOW())
        ON CONFLICT ("businessId", "modelType") DO UPDATE SET
            params = EXCLUDED.params,
            accuracy = EXCLUDED.accuracy,
            "trainedAt" = EXCLUDED."trainedAt",
            "updatedAt" = NOW()
    ''')
    try:
        with engine.begin() as conn:
            conn.execute(query, {
                'id': str(uuid.uuid4()),
                'business_id': business_id,
                'model_type': model_type,
                'params': json.dumps(params),
                'accuracy': accuracy,
                'trained_at': pd.Timestamp.now(),
            })
    except SQLAlchemyError as exc:
        raise RuntimeError(f"Failed to save model params: {exc}") from exc

def get_model_params(business_id: str, model_type: str) -> Optional[Dict[str, Any]]:
    query = text('''
        SELECT params, accuracy, "trainedAt"
        FROM "MlModelParams"
        WHERE "businessId" = :business_id
          AND "modelType" = :model_type
        ORDER BY "trainedAt" DESC
        LIMIT 1
    ''')
    with engine.connect() as conn:
        result = conn.execute(query, {
            'business_id': business_id,
            'model_type': model_type,
        }).fetchone()

    if result is None:
        return None
    return {
        'params': json.loads(result[0]),
        'accuracy': result[1],
        'trainedAt': result[2],
    }
