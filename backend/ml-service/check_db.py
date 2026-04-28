import os
import time
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def check_db(url, name):
    print(f"\n--- Checking {name} ---")
    try:
        engine = create_engine(url, pool_pre_ping=True, pool_size=1, max_overflow=0)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = [row[0] for row in result]
            print(f"Tables in {name}: {', '.join(tables) if tables else 'None'}")
    except Exception as e:
        print(f"Error connecting to {name}: {e}")
    finally:
        engine.dispose()
        time.sleep(0.5)  # Délai entre les connexions

# Check from current .env
check_db(os.getenv('DATABASE_URL'), "Current DATABASE_URL")
time.sleep(1)

# Check auth specifically
check_db("postgresql://postgres:taskflow2026@localhost:5432/auth", "auth database")
time.sleep(1)

# Check Taskflow_DB specifically
check_db("postgresql://postgres:taskflow2026@localhost:5432/Taskflow_DB", "Taskflow_DB database")
