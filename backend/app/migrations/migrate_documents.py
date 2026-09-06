"""
migrate_documents.py — Safe, non-destructive migration for Document Intelligence.
Adds extended metadata, processing status, versioning, audit logging,
and extraction columns to the 'documents' table in SQLite/Postgres.
Preserves all existing data and relationships.
"""
import os
import sqlite3
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DB_FILE = BACKEND_DIR / "sql_app.db"


def run_migration(db_path: str = str(DB_FILE)):
    if not os.path.exists(db_path):
        logger.warning(f"Database file {db_path} not found. Skipping migration.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Check existing columns in documents table
        cursor.execute("PRAGMA table_info(documents);")
        existing_cols = {row[1]: row[2] for row in cursor.fetchall()}
        print(f"Existing columns in 'documents': {list(existing_cols.keys())}")

        # 2. Define new columns to add if not present
        new_columns = [
            ("original_file_name", "VARCHAR"),
            ("file_path", "VARCHAR"),
            ("storage_url", "VARCHAR"),
            ("file_hash", "VARCHAR(64)"),
            ("document_date", "VARCHAR"),
            ("version_number", "INTEGER DEFAULT 1"),
            ("parent_document_id", "CHAR(36)"),
            ("status", "VARCHAR DEFAULT 'ACTIVE'"),
            ("processing_status", "VARCHAR DEFAULT 'UPLOADED'"),
            ("extraction_status", "VARCHAR DEFAULT 'NONE'"),
            ("extracted_text", "TEXT"),
            ("extracted_metadata", "JSON"),
            ("ai_summary", "TEXT"),
            ("ai_tags", "JSON"),
            ("source", "VARCHAR DEFAULT 'UPLOAD'"),
            ("confidentiality_level", "VARCHAR DEFAULT 'INTERNAL'"),
            ("is_active", "BOOLEAN DEFAULT 1"),
        ]

        for col_name, col_def in new_columns:
            if col_name not in existing_cols:
                sql = f"ALTER TABLE documents ADD COLUMN {col_name} {col_def};"
                cursor.execute(sql)
                print(f"[OK] Added column '{col_name}' to 'documents'")

        # 3. Create indexes on documents table
        indexes = [
            ("idx_docs_project_id", "CREATE INDEX IF NOT EXISTS idx_docs_project_id ON documents(project_id);"),
            ("idx_docs_doc_type", "CREATE INDEX IF NOT EXISTS idx_docs_doc_type ON documents(doc_type);"),
            ("idx_docs_file_hash", "CREATE INDEX IF NOT EXISTS idx_docs_file_hash ON documents(file_hash);"),
            ("idx_docs_processing_status", "CREATE INDEX IF NOT EXISTS idx_docs_processing_status ON documents(processing_status);"),
            ("idx_docs_report_month", "CREATE INDEX IF NOT EXISTS idx_docs_report_month ON documents(report_month);"),
            ("idx_docs_version", "CREATE INDEX IF NOT EXISTS idx_docs_version ON documents(version_number);"),
        ]

        for idx_name, idx_sql in indexes:
            cursor.execute(idx_sql)

        # 4. Create document_audit_logs table if not exists
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS document_audit_logs (
            id CHAR(36) PRIMARY KEY,
            document_id CHAR(36),
            project_id CHAR(36),
            user_id VARCHAR,
            user_name VARCHAR,
            user_email VARCHAR,
            role VARCHAR,
            action VARCHAR NOT NULL,
            details JSON,
            ip_address VARCHAR,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_doc_id ON document_audit_logs(document_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_project_id ON document_audit_logs(project_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_created_at ON document_audit_logs(created_at);")
        print("[OK] 'document_audit_logs' table ready.")

        conn.commit()
        print("[OK] Document Intelligence database migration complete!")

    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise e
    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
