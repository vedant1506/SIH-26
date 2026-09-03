import sys
from pathlib import Path
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import declarative_base, sessionmaker

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_settings

settings = get_settings()

# CRITICAL: Uses Port 6543 (Supavisor Transaction Pooler)
# SQLite default uses absolute path to ensure backend & root scripts use the same DB file
DEFAULT_DB_FILE = BACKEND_DIR / "sql_app.db"
db_url = settings.database_url or f"sqlite:///{DEFAULT_DB_FILE.as_posix()}"

if db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False, "timeout": 30})
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("ATTACH DATABASE ':memory:' AS public")
        cursor.close()
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,      # Verify connection is alive before using it
        pool_size=5,             # Keep a small pool — Supabase free tier limits
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,       # Recycle connections every 30 minutes
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
