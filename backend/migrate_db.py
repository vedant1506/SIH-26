"""
DB Migration — Create new tables for TRACE SIH26103 completion.
Adds: audit_logs, documents, notifications, project_monthly_snapshots
Alters: action_items (new columns via SQLite-safe approach)
"""
import sys, os
# Run this from the backend/ directory: python migrate_db.py
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

from app.core.database import engine, Base
# Import all models so they register with Base.metadata
from app.models.project import (
    Profile, Project, RiskPrediction, Alert, Milestone, ActionItem,
    CitizenGrievance, FieldEvidence, IntegrationDispatchLog,
    AuditLog, Document, Notification, ProjectMonthlySnapshot
)
import sqlite3

def run_migration():
    print("Running DB migration...")

    # 1. Create all new tables that don't exist yet
    Base.metadata.create_all(engine)
    print("[OK] Created new tables (audit_logs, documents, notifications, project_monthly_snapshots)")

    # 2. SQLite column additions (ALTER TABLE -- SQLite doesn't support ADD COLUMN IF NOT EXISTS natively)
    db_path = os.path.join(os.path.dirname(__file__), "sql_app.db")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # action_items new columns
    action_items_cols = [r[1] for r in c.execute("PRAGMA table_info(action_items)").fetchall()]

    new_action_cols = [
        ("assigned_officer_id", "TEXT"),
        ("approval_status", "TEXT DEFAULT 'not_required'"),
        ("approved_by", "TEXT"),
        ("approved_at", "DATETIME"),
        ("approval_notes", "TEXT"),
        ("evidence_url", "TEXT"),
        ("response_notes", "TEXT"),
    ]
    for col_name, col_def in new_action_cols:
        if col_name not in action_items_cols:
            c.execute(f"ALTER TABLE action_items ADD COLUMN {col_name} {col_def}")
            print(f"  [OK] action_items.{col_name} added")
        else:
            print(f"  [-] action_items.{col_name} already exists")

    conn.commit()
    conn.close()

    # 3. Verify final table list
    import sqlite3 as _sq
    conn2 = _sq.connect(db_path)
    tables = [r[0] for r in conn2.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    conn2.close()
    print(f"\n[OK] Migration complete. Tables: {tables}")

if __name__ == "__main__":
    run_migration()
