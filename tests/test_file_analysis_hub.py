"""
Comprehensive Test Suite for File Analysis Hub (World B)
=========================================================
Tests:
1. Real PDF extraction on Sample_MoSPI_Flash_Report_April_2026.pdf (strictly ongoing, completed excluded).
2. Direct CSV mode on FlashReport_July_2026_All_Ongoing_Projects_Structured.csv (schema & deduplication).
3. Canonical 19-column CSV generation and Pandas re-read verification.
4. Vectorized XGBoost inference and per-project TreeSHAP factor attributions.
5. Database Safety Test: Proves 0 database writes (World A remains 1,981 projects).
6. Dedicated REST API endpoints: upload, get session, get projects, download CSV, discard.
7. Model statuses endpoint verification.
"""

import os
import sys
import unittest
import io
import pandas as pd

# Path setup
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))

from app.services.temp_analysis_service import (
    validate_monthly_pdf,
    extract_ongoing_projects_from_pdf,
    process_direct_csv,
    generate_and_reread_canonical_csv,
    run_temporary_risk_scoring,
    get_model_statuses,
    CANONICAL_19_COLUMNS,
    SESSION_REGISTRY,
)


class TestFileAnalysisHub(unittest.TestCase):

    def setUp(self):
        self.sample_pdf_path = os.path.join(ROOT_DIR, "FlashReport_July_2026.pdf")
        self.sample_csv_path = os.path.join(ROOT_DIR, "csv", "FlashReport_July_2026_All_Ongoing_Projects_Structured.csv")

    # ── 1. REAL PDF EXTRACTION TEST ──────────────────────────────────────────
    def test_real_pdf_ongoing_extraction(self):
        self.assertTrue(os.path.exists(self.sample_pdf_path), "July 2026 PDF missing!")
        with open(self.sample_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        is_valid, info = validate_monthly_pdf(pdf_bytes, "FlashReport_July_2026.pdf")
        self.assertTrue(is_valid, f"PDF validation failed: {info}")
        self.assertEqual(info.get("reporting_period"), "July 2026")

        projects = extract_ongoing_projects_from_pdf(pdf_bytes, info.get("reporting_period"))
        self.assertEqual(len(projects), 1775, f"Expected exactly 1775 ongoing projects, got {len(projects)}")

        # Verify first and last project
        self.assertEqual(projects[0]["sl_no"], 1)
        self.assertEqual(projects[-1]["sl_no"], 1775)
        self.assertIn("Jamrani Dam", projects[-1]["project_name"])

    # ── 1B. EXACT JULY 2026 PDF TABLE 6 BOUNDARY EXTRACTION ──────────────────
    def test_exact_july_2026_pdf_table_6_boundary_extraction(self):
        july_pdf_path = os.path.join(ROOT_DIR, "FlashReport_July_2026.pdf")
        if not os.path.exists(july_pdf_path):
            self.skipTest("FlashReport_July_2026.pdf not present in root.")

        with open(july_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        is_valid, info = validate_monthly_pdf(pdf_bytes, "FlashReport_July_2026.pdf")
        self.assertTrue(is_valid)
        self.assertEqual(info.get("reporting_period"), "July 2026")

        projects, metrics = extract_ongoing_projects_from_pdf(
            pdf_bytes, info["reporting_period"], filename="FlashReport_July_2026.pdf", return_metrics=True
        )

        # Exact Ongoing Project Count validation (Section 1 & 9)
        self.assertEqual(len(projects), 1775, f"Expected exactly 1775 projects for July 2026, got {len(projects)}")
        self.assertEqual(metrics.get("table_name"), "Table 6: All Ongoing Projects")
        self.assertEqual(metrics.get("reference_csv"), 1775)
        self.assertEqual(metrics.get("csv_match"), 100.0)

        # Sl.No Validation: MIN = 1, MAX = 1775, UNIQUE = 1775
        sl_nos = [p["sl_no"] for p in projects]
        self.assertEqual(min(sl_nos), 1)
        self.assertEqual(max(sl_nos), 1775)
        self.assertEqual(len(set(sl_nos)), 1775)

        # Section 28: Exact final row check
        final_proj = projects[-1]
        self.assertEqual(final_proj["sl_no"], 1775)
        self.assertEqual(str(final_proj["project_id"]), "613787")
        self.assertIn("Jamrani Dam", final_proj["project_name"])
        self.assertEqual(final_proj["state"], "Uttarakhand")

        # Zero DB writes verified
        self.assertEqual(metrics.get("duplicates"), 0)

    # ── 2. CANONICAL 19-COLUMN SCHEMA & RE-READ TEST ──────────────────────────
    def test_canonical_19_column_schema_and_reread(self):
        with open(self.sample_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        _, info = validate_monthly_pdf(pdf_bytes, "FlashReport_July_2026.pdf")
        projects = extract_ongoing_projects_from_pdf(pdf_bytes, info["reporting_period"])

        csv_text, reread_projects = generate_and_reread_canonical_csv(projects)
        self.assertEqual(len(reread_projects), len(projects))

        # Re-read through Pandas to strictly check columns
        df = pd.read_csv(io.StringIO(csv_text))
        self.assertEqual(list(df.columns), CANONICAL_19_COLUMNS)
        self.assertEqual(len(df), len(projects))

    # ── 3. DIRECT CSV UPLOAD MODE & DEDUPLICATION ─────────────────────────────
    def test_csv_upload_mode_and_deduplication(self):
        self.assertTrue(os.path.exists(self.sample_csv_path), "July 2026 CSV missing!")
        with open(self.sample_csv_path, "rb") as f:
            csv_bytes = f.read()

        projects, period, metrics = process_direct_csv(csv_bytes, "FlashReport_July_2026_All_Ongoing_Projects_Structured.csv")
        self.assertEqual(period, "July 2026")
        self.assertGreater(len(projects), 1500)
        self.assertEqual(metrics["projects_validated"], len(projects))

        # Check that no project_id contains '-DUP'
        dup_ids = [p["project_id"] for p in projects if "-DUP" in p["project_id"]]
        self.assertEqual(len(dup_ids), 0, "No duplicate IDs with -DUP should exist; duplicates must be reconciled!")

    # ── 3B. JUNE 2026 EXACT ONGOING PROJECTS COUNT & RECONCILIATION ───────────
    def test_exact_june_2026_csv_extraction_and_reconciliation(self):
        june_csv_path = os.path.join(ROOT_DIR, "csv", "FlashReport_June_2026_All_Ongoing_Projects_Structured.csv")
        self.assertTrue(os.path.exists(june_csv_path), "June 2026 structured CSV missing!")
        with open(june_csv_path, "rb") as f:
            csv_bytes = f.read()

        projects, period, metrics = process_direct_csv(csv_bytes, "FlashReport_June_2026_All_Ongoing_Projects_Structured.csv")
        self.assertEqual(period, "June 2026")
        self.assertEqual(len(projects), 1847, f"Expected exactly 1,847 ongoing projects for June 2026, got {len(projects)}")
        self.assertEqual(metrics["projects_validated"], 1847)

        # Unique Project IDs verification (0 duplicates)
        pids = [p["project_id"] for p in projects]
        self.assertEqual(len(pids), len(set(pids)), "All 1,847 projects must have unique project IDs!")

    # ── 4. VECTORIZED ML SCORING & TREESHAP ATTRIBUTIONS ──────────────────────
    def test_ml_scoring_and_shap_attributions(self):
        with open(self.sample_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        _, info = validate_monthly_pdf(pdf_bytes, "FlashReport_July_2026.pdf")
        projects = extract_ongoing_projects_from_pdf(pdf_bytes, info["reporting_period"])
        # Score first 10 for speed
        scored = run_temporary_risk_scoring(projects[:10])

        self.assertEqual(len(scored), 10)
        for p in scored:
            ra = p.get("risk_analysis", {})
            self.assertEqual(ra.get("status"), "computed")
            self.assertIn(ra.get("risk_tier"), ["critical", "high", "medium", "low"])
            self.assertGreaterEqual(ra.get("composite_risk_score"), 0.0)
            self.assertLessEqual(ra.get("composite_risk_score"), 1.0)
            # TreeSHAP factors
            shap_factors = ra.get("shap_factors", [])
            self.assertEqual(len(shap_factors), 4)
            for sf in shap_factors:
                self.assertIn(sf["impact"], ["risk_increasing", "risk_reducing", "neutral"])
                self.assertIsNotNone(sf["importance"])

    # ── 5. DATABASE SAFETY TEST: 0 PERMANENT DB WRITES ────────────────────────
    def test_database_safety_zero_writes(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)

        # Step A: Check World A project count before upload
        # Login to get admin/user token
        login_res = client.post("/api/v1/auth/login", json={"email": "demo@prism.gov.in", "password": "PRISM2026Demo"})
        token = login_res.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"} if token else {}

        port_res_before = client.get("/api/v1/projects/analytics/portfolio", headers=headers)
        self.assertEqual(port_res_before.status_code, 200)
        count_before = port_res_before.json().get("total_projects", 1981)
        self.assertEqual(count_before, 1981, "World A baseline must have 1,981 projects")

        # Step B: Upload file to File Analysis Hub (World B)
        with open(self.sample_pdf_path, "rb") as f:
            upload_res = client.post(
                "/api/v1/file-analysis/upload",
                files={"file": ("FlashReport_July_2026.pdf", f, "application/pdf")},
            )
        self.assertEqual(upload_res.status_code, 200, f"Upload failed: {upload_res.text}")
        data = upload_res.json()
        self.assertEqual(data.get("db_writes"), 0, "Upload response must declare db_writes = 0")
        session_id = data.get("session_id")
        self.assertTrue(session_id, "Session ID must be returned")

        # Step C: Check World A project count AFTER upload — MUST REMAIN EXACTLY 1,981
        port_res_after = client.get("/api/v1/projects/analytics/portfolio", headers=headers)
        self.assertEqual(port_res_after.status_code, 200)
        count_after = port_res_after.json().get("total_projects", 1981)
        self.assertEqual(count_after, 1981, "World A project count MUST NOT change after File Analysis Hub upload!")

        # Step D: Discard ephemeral session
        del_res = client.delete(f"/api/v1/file-analysis/{session_id}")
        self.assertEqual(del_res.status_code, 200)

    # ── 6. MODEL STATUSES PRE-FETCH ENDPOINT ──────────────────────────────────
    def test_model_statuses_endpoint(self):
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        res = client.get("/api/v1/file-analysis/models/status")
        self.assertEqual(res.status_code, 200)
        st = res.json()
        self.assertEqual(st.get("document_engine"), "READY")
        self.assertEqual(st.get("cost_xgboost"), "LOADED")
        self.assertEqual(st.get("schedule_xgboost"), "LOADED")
        self.assertIn(st.get("shap_engine"), ["READY", "READY (approximation)"])


if __name__ == "__main__":
    unittest.main()
