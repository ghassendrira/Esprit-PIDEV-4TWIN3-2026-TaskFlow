import os
import json
import uuid
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL must be set in backend/ml-service/.env')

engine = create_engine(
    DATABASE_URL,
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

def get_real_table_names() -> dict:
    """
    Discover real table names and map them to logical names
    Handles both snake_case and PascalCase conventions
    """
    all_tables = discover_tables()
    mapping = {}

    for table_name in all_tables:
        table_lower = table_name.lower()
        
        # Client table mapping
        if 'client' in table_lower and 'invoice' not in table_lower:
            if 'client' not in mapping:
                mapping['client'] = table_name
        
        # Invoice table mapping
        if 'invoice' in table_lower:
            if 'invoice' not in mapping:
                mapping['invoice'] = table_name
        
        # Expense table mapping (but NOT ExpenseCategory)
        if 'expense' in table_lower and 'category' not in table_lower:
            if 'expense' not in mapping:
                mapping['expense'] = table_name
        
        # Business table mapping (but NOT BusinessUser)
        if 'business' in table_lower and 'user' not in table_lower:
            if 'business' not in mapping:
                mapping['business'] = table_name

    # Fallback defaults if discovery fails
    if 'client' not in mapping:
        mapping['client'] = '"Client"'
    if 'invoice' not in mapping:
        mapping['invoice'] = '"Invoice"'
    if 'expense' not in mapping:
        mapping['expense'] = '"Expense"'
    if 'business' not in mapping:
        mapping['business'] = '"Business"'

    return mapping

def init_table_names():
    """Initialize table names at startup"""
    global TABLE_NAMES
    try:
        TABLE_NAMES = get_real_table_names()
        print(f"✅ Tables discovered: {TABLE_NAMES}")
    except Exception as e:
        print(f"❌ Error during table discovery: {e}")
        # Fallback to defaults
        TABLE_NAMES = {
            'client': '"Client"',
            'invoice': '"Invoice"',
            'expense': '"Expense"',
            'business': '"Business"',
        }


def get_clients(business_id: str) -> pd.DataFrame:
    """Get clients with invoice counts and totals for ML analysis"""
    init_table_names()
    
    client_table  = TABLE_NAMES.get('client', '"Client"')
    invoice_table = TABLE_NAMES.get('invoice', '"Invoice"')
    
    # Get available columns for client table
    client_cols = get_columns(client_table.strip('"'))
    
    # Detect correct column names (handle both camelCase and snake_case)
    name_col = 'name' if 'name' in client_cols else \
               'nom'  if 'nom'  in client_cols else 'email'
    
    biz_col = '"businessId"' if '"businessId"' in str(client_cols) or 'businessId' in client_cols else \
              '"business_id"' if '"business_id"' in str(client_cols) or 'business_id' in client_cols else \
              '"businessId"'
    
    del_col = '"deletedAt"' if '"deletedAt"' in str(client_cols) or 'deletedAt' in client_cols else 'NULL'
    
    # Get available columns for invoice table
    inv_cols = get_columns(invoice_table.strip('"'))
    
    # Detect correct column names for invoice
    amount_col = '"totalTTC"' if '"totalTTC"' in str(inv_cols) or 'totalTTC' in inv_cols else \
                 '"total"' if '"total"' in str(inv_cols) or 'total' in inv_cols else \
                 '0'
    
    client_fk = '"clientId"' if '"clientId"' in str(inv_cols) or 'clientId' in inv_cols else \
                '"client_id"' if '"client_id"' in str(inv_cols) or 'client_id' in inv_cols else \
                '"clientId"'
    
    inv_biz_col = '"businessId"' if '"businessId"' in str(inv_cols) or 'businessId' in inv_cols else \
                  '"business_id"' if '"business_id"' in str(inv_cols) or 'business_id' in inv_cols else \
                  '"businessId"'

    query = text(f"""
        SELECT 
            c.id,
            c.{biz_col},
            c.{name_col} AS name,
            c.email,
            c."createdAt",
            COUNT(i.id)  AS invoice_count,
            COALESCE(SUM(
                CAST(COALESCE(
                    i.{amount_col}::text, '0'
                ) AS FLOAT)
            ), 0)        AS total_monetary,
            MAX(i."createdAt") AS last_invoice_date
        FROM {client_table} c
        LEFT JOIN {invoice_table} i
               ON i.{client_fk} = c.id
              AND i."deletedAt"  IS NULL
        WHERE c.{biz_col} = :business_id
          AND ({del_col} IS NULL 
               OR c."deletedAt" IS NULL)
        GROUP BY c.id, c.{biz_col},
                 c.{name_col}, c.email, 
                 c."createdAt"
    """)

    try:
        with engine.connect() as conn:
            return pd.read_sql(
                query, conn,
                params={'business_id': business_id}
            )
    except Exception as e:
        print(f"❌ Error in get_clients: {e}")
        return pd.DataFrame()

def get_invoices(business_id: str) -> pd.DataFrame:
    """Get invoices for ML analysis"""
    init_table_names()
    
    invoice_table = TABLE_NAMES.get('invoice', '"Invoice"')
    client_table  = TABLE_NAMES.get('client', '"Client"')
    
    inv_cols = get_columns(invoice_table.strip('"'))
    
    # Detect correct column names
    amount_col = '"totalTTC"' if '"totalTTC"' in str(inv_cols) or 'totalTTC' in inv_cols else \
                 '"total"' if '"total"' in str(inv_cols) or 'total' in inv_cols else \
                 '0'
    
    biz_col = '"businessId"' if '"businessId"' in str(inv_cols) or 'businessId' in inv_cols else \
              '"business_id"' if '"business_id"' in str(inv_cols) or 'business_id' in inv_cols else \
              '"businessId"'
    
    client_fk = '"clientId"' if '"clientId"' in str(inv_cols) or 'clientId' in inv_cols else \
                '"client_id"' if '"client_id"' in str(inv_cols) or 'client_id' in inv_cols else \
                '"clientId"'

    query = text(f"""
        SELECT 
            i.id,
            i.{biz_col},
            i.{client_fk},
            i.{amount_col} AS amount,
            i.status,
            i."createdAt",
            i."dueDate",
            c.name AS client_name
        FROM {invoice_table} i
        LEFT JOIN {client_table} c
               ON c.id = i.{client_fk}
        WHERE i.{biz_col}   = :business_id
          AND i."deletedAt" IS NULL
        ORDER BY i."createdAt" ASC
    """)

    try:
        with engine.connect() as conn:
            return pd.read_sql(
                query, conn,
                params={'business_id': business_id}
            )
    except Exception as e:
        print(f"❌ Error in get_invoices: {e}")
        return pd.DataFrame()

def get_expenses(business_id: str) -> pd.DataFrame:
    """Get expenses for ML analysis"""
    init_table_names()
    
    expense_table = TABLE_NAMES.get('expense', '"Expense"')
    
    exp_cols = get_columns(expense_table.strip('"'))
    
    biz_col = '"businessId"' if '"businessId"' in str(exp_cols) or 'businessId' in exp_cols else \
              '"business_id"' if '"business_id"' in str(exp_cols) or 'business_id' in exp_cols else \
              '"businessId"'
    
    user_col = '"createdBy"' if '"createdBy"' in str(exp_cols) or 'createdBy' in exp_cols else \
               '"created_by"' if '"created_by"' in str(exp_cols) or 'created_by' in exp_cols else \
               '"createdBy"'
    
    cat_col = '"categoryId"' if '"categoryId"' in str(exp_cols) or 'categoryId' in exp_cols else \
              '"category_id"' if '"category_id"' in str(exp_cols) or 'category_id' in exp_cols else \
              '"categoryId"'

    query = text(f"""
        SELECT 
            e.id,
            e.{biz_col},
            e.{user_col},
            e.amount,
            e.date,
            e.description,
            e.status,
            e.{cat_col}
        FROM {expense_table} e
        WHERE e.{biz_col}   = :business_id
          AND e."deletedAt" IS NULL
        ORDER BY e."createdAt" ASC
    """)

    try:
        with engine.connect() as conn:
            return pd.read_sql(
                query, conn,
                params={'business_id': business_id}
            )
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

def get_model_params(business_id: str, model_type: str) -> dict:
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
