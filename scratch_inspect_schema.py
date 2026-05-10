import psycopg2

DB_BASE = "postgresql://postgres:taskflow2026@localhost:5432"

databases = ['taskflow_business', 'taskflow_invoice', 'taskflow_expense']

for db in databases:
    try:
        conn = psycopg2.connect(f"{DB_BASE}/{db}")
        cur = conn.cursor()
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        """)
        tables = [r[0] for r in cur.fetchall()]
        print(f"\n=== DB: {db} ===")
        print(f"Tables: {tables}")
        for t in tables:
            cur.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema='public' AND table_name=%s
                ORDER BY ordinal_position
            """, (t,))
            cols = cur.fetchall()
            print(f"\n  [{t}]")
            for col in cols:
                print(f"    {col[0]} ({col[1]}) nullable={col[2]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"\n=== DB: {db} === ERROR: {e}")
