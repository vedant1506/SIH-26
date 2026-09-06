import os
import sqlite3
import pandas as pd

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CSV_PATH = os.path.join(WORKSPACE_ROOT, "csv", "FlashReport_April_2026_All_Ongoing_Projects_Structured.csv")
DB_PATHS = [
    os.path.join(WORKSPACE_ROOT, "backend", "sql_app.db"),
    os.path.join(WORKSPACE_ROOT, "sql_app.db"),
]

def derive_public_status(delay_prob, overrun_prob, composite_score) -> str:
    if composite_score is not None:
        try:
            score = float(composite_score)
            if score >= 0.65:
                return "DELAYED"
            elif score >= 0.35:
                return "ACTIVE_MONITORING"
            else:
                return "ON_SCHEDULE"
        except (ValueError, TypeError):
            pass
    if delay_prob is not None:
        try:
            if float(delay_prob) > 0.6:
                return "DELAYED"
        except (ValueError, TypeError):
            pass
    if overrun_prob is not None:
        try:
            if float(overrun_prob) > 0.6:
                return "ACTIVE_MONITORING"
        except (ValueError, TypeError):
            pass
    return "ON_SCHEDULE"

def add_columns_if_missing(conn):
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(projects)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    
    new_columns = [
        ("project_id", "TEXT"),
        ("agency", "TEXT"),
        ("pmgid", "TEXT"),
        ("legacy_ocms_code", "TEXT"),
        ("approval_date_mm_yyyy", "TEXT"),
        ("start_date_mm_yyyy", "TEXT"),
        ("original_target_doc_mm_yyyy", "TEXT"),
        ("revised_target_doc_mm_yyyy", "TEXT"),
        ("report_month", "TEXT"),
        ("source_pdf_page", "INTEGER"),
        ("sl_no", "INTEGER"),
        ("public_status", "TEXT"),
    ]
    
    for col_name, col_type in new_columns:
        if col_name not in existing_cols:
            print(f"  Adding column {col_name} ({col_type})...")
            cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
            
    conn.commit()

def sync_database(db_path, df):
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}, skipping.")
        return
        
    print(f"\n==========================================")
    print(f"Syncing DB: {db_path}")
    print(f"==========================================")
    
    conn = sqlite3.connect(db_path)
    add_columns_if_missing(conn)
    cursor = conn.cursor()
    
    # Pre-fetch predictions for status calculation
    # Latest prediction per project
    cursor.execute("""
        SELECT rp.project_id, rp.composite_risk_score, rp.delay_probability, rp.cost_overrun_probability
        FROM risk_predictions rp
        INNER JOIN (
            SELECT project_id, MAX(predicted_at) as max_date
            FROM risk_predictions
            GROUP BY project_id
        ) latest ON rp.project_id = latest.project_id AND rp.predicted_at = latest.max_date
    """)
    predictions = {row[0]: (row[1], row[2], row[3]) for row in cursor.fetchall()}
    
    # Fetch existing projects: name -> id
    cursor.execute("SELECT id, project_name FROM projects")
    db_projects = {row[1]: row[0] for row in cursor.fetchall()}
    print(f"Existing DB projects count: {len(db_projects)}")
    
    matched_count = 0
    status_counts = {"ON_SCHEDULE": 0, "ACTIVE_MONITORING": 0, "DELAYED": 0}
    
    for _, row in df.iterrows():
        p_name = str(row["project_name"]).strip()
        proj_uuid = db_projects.get(p_name)
        if not proj_uuid:
            continue
            
        pred = predictions.get(proj_uuid)
        comp_score = pred[0] if pred else None
        delay_prob = pred[1] if pred else None
        overrun_prob = pred[2] if pred else None
        status = derive_public_status(delay_prob, overrun_prob, comp_score)
        status_counts[status] = status_counts.get(status, 0) + 1
        
        proj_id_str = str(row["project_id"]).strip()
        agency_str = str(row["agency"]).strip() if pd.notna(row["agency"]) else None
        pmgid_str = str(row["pmgid"]).strip() if pd.notna(row["pmgid"]) else None
        legacy_ocms_str = str(row["legacy_ocms_code"]).strip() if pd.notna(row["legacy_ocms_code"]) else None
        appr_date_str = str(row["approval_date_mm_yyyy"]).strip() if pd.notna(row["approval_date_mm_yyyy"]) else None
        start_date_str = str(row["start_date_mm_yyyy"]).strip() if pd.notna(row["start_date_mm_yyyy"]) else None
        orig_target_str = str(row["original_target_doc_mm_yyyy"]).strip() if pd.notna(row["original_target_doc_mm_yyyy"]) else None
        rev_target_str = str(row["revised_target_doc_mm_yyyy"]).strip() if pd.notna(row["revised_target_doc_mm_yyyy"]) else None
        report_month_str = str(row["report_month"]).strip() if pd.notna(row["report_month"]) else "April 2026"
        pdf_page = int(row["source_pdf_page"]) if pd.notna(row["source_pdf_page"]) else None
        sl_no_val = int(row["sl_no"]) if pd.notna(row["sl_no"]) else None
        
        cursor.execute("""
            UPDATE projects
            SET project_id = ?,
                agency = ?,
                pmgid = ?,
                legacy_ocms_code = ?,
                approval_date_mm_yyyy = ?,
                start_date_mm_yyyy = ?,
                original_target_doc_mm_yyyy = ?,
                revised_target_doc_mm_yyyy = ?,
                report_month = ?,
                source_pdf_page = ?,
                sl_no = ?,
                public_status = ?
            WHERE id = ?
        """, (
            proj_id_str,
            agency_str,
            pmgid_str,
            legacy_ocms_str,
            appr_date_str,
            start_date_str,
            orig_target_str,
            rev_target_str,
            report_month_str,
            pdf_page,
            sl_no_val,
            status,
            proj_uuid
        ))
        matched_count += 1
        
    conn.commit()
    print(f"Updated {matched_count} projects with authoritative April 2026 metadata.")
    print(f"Status distribution: {status_counts}")
    
    # Create indexes for blazing-fast filtering & lookups
    print("Creating indexes...")
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_public_status ON projects(public_status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_sector ON projects(sector)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_state ON projects(state)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_ministry ON projects(ministry)")
    conn.commit()
    
    # Run Phase 3 assertions
    print("Running Phase 3 assertions...")
    cursor.execute("SELECT COUNT(*) FROM projects")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT project_id) FROM projects WHERE project_id IS NOT NULL")
    unique_ids = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM projects WHERE project_id IS NULL OR project_id = ''")
    missing_ids = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM projects WHERE report_month != 'April 2026' OR report_month IS NULL")
    non_april = cursor.fetchone()[0]
    
    cursor.execute("SELECT public_status, COUNT(*) FROM projects GROUP BY public_status")
    status_summary = dict(cursor.fetchall())
    
    print(f"  [Assertion 1] Total projects: {total} (Expected: 1981)")
    print(f"  [Assertion 2] Unique project_id: {unique_ids} (Expected: 1981)")
    print(f"  [Assertion 3] Missing project_id: {missing_ids} (Expected: 0)")
    print(f"  [Assertion 4] Non-April-2026 report_month: {non_april} (Expected: 0)")
    print(f"  [Assertion 5] Status summary: {status_summary}")
    
    assert total == 1981, f"Expected 1981 projects, got {total}"
    assert unique_ids == 1981, f"Expected 1981 unique project_ids, got {unique_ids}"
    assert missing_ids == 0, f"Expected 0 missing project_ids, got {missing_ids}"
    assert non_april == 0, f"Expected 0 non-April-2026 report_month, got {non_april}"
    print("ALL ASSERTIONS PASSED FOR " + db_path)
    conn.close()

if __name__ == "__main__":
    print(f"Loading authoritative CSV from: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} records from CSV.")
    for db_path in DB_PATHS:
        sync_database(db_path, df)
    print("\nAuthoritative April 2026 sync complete!")
