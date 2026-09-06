import sys
import sqlite3
import uuid
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import DEFAULT_DB_FILE, engine, SessionLocal
from app.models.project import Base, Project, Profile, ActionItem, InterventionActionHistory, ActionComment

def run_migration():
    print(f"[*] Starting non-destructive database migration on {DEFAULT_DB_FILE}...")
    
    # 1. Connect to SQLite to check and add missing columns safely
    conn = sqlite3.connect(DEFAULT_DB_FILE)
    cur = conn.cursor()
    
    # Check projects count first to ensure zero data loss
    cur.execute("SELECT count(*) FROM projects")
    initial_project_count = cur.fetchone()[0]
    print(f"[+] Initial Project Count: {initial_project_count} (Must be 1981)")
    assert initial_project_count == 1981, f"Expected 1981 projects, got {initial_project_count}"
    
    # Check action_items existing columns
    cur.execute("PRAGMA table_info(action_items)")
    existing_cols = {r[1]: r[2] for r in cur.fetchall()}
    print(f"[*] Current action_items columns: {list(existing_cols.keys())}")
    
    new_columns = [
        ("action_number", "VARCHAR"),
        ("risk_id", "CHAR(36)"),
        ("mitigation_id", "CHAR(36)"),
        ("started_at", "DATETIME"),
        ("completed_at", "DATETIME"),
        ("verified_at", "DATETIME"),
        ("completion_percentage", "INTEGER DEFAULT 0"),
        ("root_cause", "TEXT"),
        ("recommended_action", "TEXT"),
        ("expected_outcome", "TEXT"),
        ("actual_outcome", "TEXT"),
        ("verification_notes", "TEXT"),
        ("source_type", "VARCHAR DEFAULT 'MANUAL'"),
        ("source_reference", "VARCHAR"),
        ("last_updated_by", "VARCHAR"),
    ]
    
    for col_name, col_type in new_columns:
        if col_name not in existing_cols:
            print(f"[+] Adding column {col_name} ({col_type}) to action_items...")
            cur.execute(f"ALTER TABLE action_items ADD COLUMN {col_name} {col_type}")
    
    # Create intervention_action_history table if not exists
    cur.execute("""
    CREATE TABLE IF NOT EXISTS intervention_action_history (
        id CHAR(36) PRIMARY KEY,
        action_id CHAR(36) NOT NULL,
        changed_by_id VARCHAR,
        changed_by_name VARCHAR,
        changed_by_role VARCHAR,
        previous_status VARCHAR,
        new_status VARCHAR,
        previous_assignee VARCHAR,
        new_assignee VARCHAR,
        previous_priority VARCHAR,
        new_priority VARCHAR,
        comment TEXT,
        event_type VARCHAR NOT NULL DEFAULT 'STATUS_CHANGE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (action_id) REFERENCES action_items(id) ON DELETE CASCADE
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_action_history_action_id ON intervention_action_history(action_id)")
    
    # Create action_comments table if not exists
    cur.execute("""
    CREATE TABLE IF NOT EXISTS action_comments (
        id CHAR(36) PRIMARY KEY,
        action_id CHAR(36) NOT NULL,
        user_id VARCHAR,
        user_name VARCHAR,
        user_role VARCHAR,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (action_id) REFERENCES action_items(id) ON DELETE CASCADE
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_action_comments_action_id ON action_comments(action_id)")
    
    conn.commit()
    
    # 2. Backfill action_number and link authenticated officers
    cur.execute("SELECT id, title, action_number, assigned_officer_id, assigned_to FROM action_items ORDER BY created_at ASC")
    actions = cur.fetchall()
    
    # Fetch profiles to map assigned officers
    cur.execute("SELECT id, full_name, role, designation FROM profiles")
    profiles = cur.fetchall()
    profile_map = {p[1]: p[0] for p in profiles} # name -> id
    default_officer = next((p for p in profiles if p[2] == "monitoring_officer"), profiles[0])
    
    for idx, (act_id, title, act_num, assigned_officer_id, assigned_to) in enumerate(actions, 1):
        target_num = act_num or f"ACT-2026-{idx:04d}"
        
        # Link real officer profile ID if missing
        target_officer_id = assigned_officer_id
        if not target_officer_id and assigned_to:
            for name, pid in profile_map.items():
                if name.lower() in assigned_to.lower():
                    target_officer_id = pid
                    break
            if not target_officer_id:
                # Default to Chief Project Officer Er. Vikram Patel
                target_officer_id = default_officer[0]
                if not assigned_to or "Chief Project Officer" in assigned_to:
                    assigned_to = f"{default_officer[1]} ({default_officer[3]})"
                    
        cur.execute(
            "UPDATE action_items SET action_number = ?, assigned_officer_id = ?, assigned_to = ? WHERE id = ?",
            (target_num, target_officer_id, assigned_to, act_id)
        )
        
        # Add initial history event if none exists
        cur.execute("SELECT count(*) FROM intervention_action_history WHERE action_id = ?", (act_id,))
        if cur.fetchone()[0] == 0:
            hist_id = str(uuid.uuid4())
            cur.execute("""
            INSERT INTO intervention_action_history (
                id, action_id, changed_by_name, changed_by_role, new_status, new_assignee, comment, event_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (hist_id, act_id, "System / Administrator", "admin", "INITIALIZED", assigned_to, "Intervention initialized under April 2026 Baseline Directive", "CREATE"))
            
    conn.commit()
    
    # 3. Final verification
    cur.execute("SELECT count(*) FROM projects")
    final_projects = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM action_items")
    final_actions = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM intervention_action_history")
    final_history = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM action_comments")
    final_comments = cur.fetchone()[0]
    
    print("=" * 60)
    print(f"[SUCCESS] Migration completed successfully!")
    print(f"Projects count: {final_projects} (Target: 1981)")
    print(f"Action items count: {final_actions}")
    print(f"Action history records: {final_history}")
    print(f"Action comments records: {final_comments}")
    print("=" * 60)
    
    conn.close()

if __name__ == "__main__":
    run_migration()
