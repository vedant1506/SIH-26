"""
Test Suite for 'Other PDFs' in File Analysis Hub
================================================
Verifies that any uploaded PDF (custom reports, other months, sliced documents)
is cleanly validated, accurately extracted, enriched with master metadata,
and generates canonical 19-column and risk-enriched CSVs without errors.
"""

import os
import sys
import unittest
import io
import fitz
import pandas as pd
from fastapi.testclient import TestClient

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))

from app.main import app
from app.services.temp_analysis_service import (
    validate_monthly_pdf,
    extract_ongoing_projects_from_pdf,
    generate_and_reread_canonical_csv,
    generate_risk_enriched_csv,
    run_temporary_risk_scoring,
    CANONICAL_19_COLUMNS,
    RISK_ENRICHED_COLUMNS,
    SESSION_REGISTRY,
)


class TestOtherPdfExtraction(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        source_pdf_path = os.path.join(ROOT_DIR, "FlashReport_July_2026.pdf")
        assert os.path.exists(source_pdf_path), "Base sample PDF missing"

        src = fitz.open(source_pdf_path)
        dst = fitz.open()
        dst.insert_pdf(src, from_page=53, to_page=55)  # 3 table pages (~63 projects)
        cls.sliced_pdf_bytes = dst.tobytes()
        src.close()
        dst.close()

    def test_01_validation_on_other_pdf(self):
        """Proves that other PDFs without exact MoSPI flash title pass validation."""
        is_valid, info = validate_monthly_pdf(self.sliced_pdf_bytes, "Custom_Infra_Quarterly_2026.pdf")
        self.assertTrue(is_valid, f"Validation failed: {info}")
        self.assertIn("reporting_period", info)
        self.assertGreaterEqual(info.get("num_pages", 0), 3)

    def test_02_accurate_dual_date_splitting(self):
        """Proves that combined dates (e.g. 03/2023 (01/2024)) are split into separate approval and start dates."""
        projects, metrics = extract_ongoing_projects_from_pdf(
            self.sliced_pdf_bytes,
            "August 2026",
            filename="Custom_Projects_Report.pdf",
            return_metrics=True,
        )
        self.assertGreater(len(projects), 50, "Expected at least 50 extracted projects from 3 table pages")

        # Check Project 1 (Kadapa Airport Terminal - 612786)
        p1 = projects[0]
        self.assertEqual(p1["approval_date_mm_yyyy"], "03/2023", "Approval date must be strictly 03/2023")
        self.assertEqual(p1["start_date_mm_yyyy"], "01/2024", "Start date must be strictly 01/2024")
        self.assertEqual(p1["original_target_doc_mm_yyyy"], "01/2026", "Original target DoC must be 01/2026")
        self.assertEqual(p1["revised_target_doc_mm_yyyy"], "09/2026", "Revised target DoC must be 09/2026")

    def test_03_master_catalog_auto_enrichment(self):
        """Proves that truncated names, missing ministries, sectors, and agencies are enriched from catalog."""
        projects = extract_ongoing_projects_from_pdf(
            self.sliced_pdf_bytes,
            "August 2026",
            filename="Non_Reference_Report.pdf",
        )
        p1 = projects[0]
        # In raw PDF, title is truncated at 'Building Building and'
        # With master catalog, it must have full title
        self.assertIn("Kadapa Airport", p1["project_name"])
        self.assertEqual(p1["ministry"], "Ministry of Civil Aviation")
        self.assertEqual(p1["sector"], "Aviation & Aviation Infrastructure")
        self.assertEqual(p1["agency"], "Airport Authority of India [AAI]")
        self.assertEqual(p1["state"], "Andhra Pradesh")
        self.assertEqual(p1["legacy_ocms_code"], "N04000106")

    def test_04_canonical_19_column_csv_accuracy(self):
        """Proves that CSV generation strictly adheres to canonical 19-column schema with 0 column shift."""
        projects = extract_ongoing_projects_from_pdf(
            self.sliced_pdf_bytes,
            "August 2026",
            filename="Other_Monthly_Report.pdf",
        )
        csv_text, reread = generate_and_reread_canonical_csv(projects)
        self.assertEqual(len(reread), len(projects))

        df = pd.read_csv(io.StringIO(csv_text))
        self.assertEqual(list(df.columns), CANONICAL_19_COLUMNS)
        self.assertEqual(len(df), len(projects))

        # Check Kadapa Airport row in DataFrame
        row0 = df.iloc[0]
        self.assertEqual(row0["approval_date_mm_yyyy"], "03/2023")
        self.assertEqual(row0["start_date_mm_yyyy"], "01/2024")
        self.assertEqual(row0["original_target_doc_mm_yyyy"], "01/2026")
        self.assertEqual(row0["revised_target_doc_mm_yyyy"], "09/2026")
        self.assertEqual(row0["original_cost_crore"], 265.91)
        self.assertEqual(row0["physical_progress_percent"], 80.0)

    def test_05_risk_scoring_and_enriched_csv(self):
        """Proves ML risk scoring runs on other PDFs and exports risk-enriched CSV with TreeSHAP factors."""
        projects = extract_ongoing_projects_from_pdf(
            self.sliced_pdf_bytes,
            "August 2026",
            filename="Other_Monthly_Report.pdf",
        )
        scored = run_temporary_risk_scoring(projects)
        self.assertEqual(len(scored), len(projects))
        self.assertIn("risk_analysis", scored[0])
        self.assertIn(scored[0]["risk_analysis"]["risk_tier"], ["low", "medium", "high", "critical"])

        risk_csv = generate_risk_enriched_csv(scored)
        df_risk = pd.read_csv(io.StringIO(risk_csv))
        self.assertEqual(list(df_risk.columns), RISK_ENRICHED_COLUMNS)
        self.assertIn("risk_tier", df_risk.columns)
        self.assertIn("composite_risk_score", df_risk.columns)

    def test_06_rest_api_upload_endpoint_with_other_pdf(self):
        """Proves /file-analysis/upload accepts other PDFs cleanly."""
        response = self.client.post(
            "/api/file-analysis/upload",
            files={"file": ("Custom_Infrastructure_Flash_Report_2026.pdf", self.sliced_pdf_bytes, "application/pdf")},
        )
        self.assertEqual(response.status_code, 200, f"Upload failed: {response.text}")
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertGreater(data["projects_extracted"], 50)
        self.assertGreater(data["projects_validated"], 50)
        self.assertIn("session_id", data)
        self.assertEqual(data["quality_metrics"]["diagnostic_panel"]["database_writes"], 0)

        # Test CSV download endpoint
        sid = data["session_id"]
        csv_resp = self.client.get(f"/api/file-analysis/{sid}/csv")
        self.assertEqual(csv_resp.status_code, 200)
        self.assertIn("text/csv", csv_resp.headers.get("content-type", ""))
        self.assertIn("approval_date_mm_yyyy", csv_resp.text)
        self.assertIn("Kadapa Airport", csv_resp.text)


if __name__ == "__main__":
    unittest.main()
