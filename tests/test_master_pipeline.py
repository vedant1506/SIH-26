import os
import sys
import glob
import json
import unittest
import pandas as pd
import requests

# Root directory
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestMasterPipeline(unittest.TestCase):
    # ── 1. DATA AUDIT TESTS ────────────────────────────────────────────────────────
    def test_all_14_csvs_exist_and_load(self):
        csv_files = glob.glob(os.path.join(ROOT_DIR, "csv", "*.csv"))
        self.assertEqual(len(csv_files), 14, f"Expected 14 CSV files in /csv, found {len(csv_files)}")
        for f in csv_files:
            df = pd.read_csv(f, low_memory=False)
            self.assertGreater(len(df), 0, f"CSV file {f} is empty!")
            self.assertIn("project_name", df.columns, f"Missing 'project_name' in {f}")
            self.assertIn("state", df.columns, f"Missing 'state' in {f}")

    def test_april_2026_primary_dataset_count(self):
        april_csv = os.path.join(ROOT_DIR, "csv", "FlashReport_April_2026_All_Ongoing_Projects_Structured.csv")
        self.assertTrue(os.path.exists(april_csv), "April 2026 primary CSV not found!")
        df = pd.read_csv(april_csv, low_memory=False)
        self.assertEqual(len(df), 1981, f"April 2026 must contain exactly 1,981 projects, found {len(df)}")
        self.assertEqual(df["project_id"].dropna().astype(str).str.strip().nunique(), 1981, "Project IDs must be unique")
        self.assertEqual(df["project_name"].dropna().astype(str).str.strip().nunique(), 1981, "Project names must be unique")

    # ── 2. GEOSPATIAL VALIDATION TESTS ─────────────────────────────────────────────
    def test_geospatial_validation_report(self):
        geo_report = os.path.join(ROOT_DIR, "geo_validation_report.csv")
        self.assertTrue(os.path.exists(geo_report), "geo_validation_report.csv not found!")
        df = pd.read_csv(geo_report)
        self.assertEqual(len(df), 1981, "Geospatial report must cover all 1,981 projects")
        self.assertEqual(df["resolved_lat"].notna().sum(), 1981)
        self.assertEqual(df["resolved_lng"].notna().sum(), 1981)
        self.assertTrue(df["resolved_lat"].between(6.0, 38.0).all(), "Coordinates outside India latitude!")
        self.assertTrue(df["resolved_lng"].between(68.0, 98.0).all(), "Coordinates outside India longitude!")

    # ── 3. MACHINE LEARNING ARTIFACT TESTS ──────────────────────────────────────────
    def test_ml_models_and_adapter_exist(self):
        delay_model = os.path.join(ROOT_DIR, "ml", "models", "delay_model.pkl")
        cost_model = os.path.join(ROOT_DIR, "ml", "models", "cost_model.pkl")
        qlora_adapter = os.path.join(ROOT_DIR, "ml", "models", "qwen_qlora_adapter", "adapter_model.safetensors")
        
        self.assertTrue(os.path.exists(delay_model), "delay_model.pkl is missing!")
        self.assertTrue(os.path.exists(cost_model), "cost_model.pkl is missing!")
        self.assertTrue(os.path.exists(qlora_adapter), "qwen_qlora_adapter/adapter_model.safetensors is missing!")
        self.assertGreater(os.path.getsize(qlora_adapter), 10 * 1024 * 1024, "Adapter safetensors should be > 10MB")

    # ── 4. BACKEND API & AUTH TESTS ────────────────────────────────────────────────
    def test_backend_auth_and_portfolio_api(self):
        # Use FastAPI TestClient for in-memory, deterministic API testing
        from fastapi.testclient import TestClient
        from backend.app.main import app
        
        client = TestClient(app)
        
        # 1. Login
        login_res = client.post("/api/v1/auth/login", json={"email": "demo@prism.gov.in", "password": "PRISM2026Demo"})
        self.assertEqual(login_res.status_code, 200, f"Login failed: {login_res.text}")
        token = login_res.json().get("access_token")
        self.assertTrue(token, "Access token missing from login response")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Portfolio Summary
        port_res = client.get("/api/v1/projects/analytics/portfolio", headers=headers)
        self.assertEqual(port_res.status_code, 200, f"Portfolio summary failed: {port_res.text}")
        data = port_res.json()
        self.assertEqual(data.get("total_projects"), 1981, f"Expected 1,981 projects in portfolio summary, got {data.get('total_projects')}")
        self.assertGreater(data.get("critical_count", 0), 0)
        self.assertGreater(data.get("high_count", 0), 0)
        self.assertGreater(data.get("low_count", 0), 0)
        self.assertGreater(data.get("total_exposure_cr", 0), 0)
        
        # 3. Project listing with limit=2000
        list_res = client.get("/api/v1/projects?limit=2000", headers=headers)
        self.assertEqual(list_res.status_code, 200)
        projects = list_res.json()
        self.assertEqual(len(projects), 1981, f"Expected 1,981 projects from API, got {len(projects)}")
        
        # 4. Gujarat filter check
        guj_res = client.get("/api/v1/projects?state=Gujarat&limit=2000", headers=headers)
        self.assertEqual(guj_res.status_code, 200)
        guj_projs = guj_res.json()
        self.assertGreaterEqual(len(guj_projs), 100, f"Gujarat projects should be >= 100, got {len(guj_projs)}")

    # ── 5. SINGLE MASTER COLAB NOTEBOOK TESTS ──────────────────────────────────────
    def test_master_colab_notebook_structure(self):
        candidates = [
            os.path.join(ROOT_DIR, "PRISM_SIH_2026_MASTER_ML_PIPELINE.ipynb"),
            os.path.join(ROOT_DIR, "ml", "notebooks", "PRISM_QLoRA_Colab_FineTuning.ipynb"),
        ]
        nb_path = next((p for p in candidates if os.path.exists(p)), None)
        self.assertIsNotNone(nb_path, f"No Colab training notebook found in candidates: {candidates}")
        
        with open(nb_path, "r", encoding="utf-8") as f:
            nb = json.load(f)
        self.assertEqual(nb.get("nbformat"), 4)
        cells = nb.get("cells", [])
        self.assertGreaterEqual(len(cells), 5, f"Expected >= 5 cells in notebook, got {len(cells)}")
        
        sources_text = " ".join([" ".join(c.get("source", [])) for c in cells])
        self.assertTrue("QLoRA" in sources_text or "qlora" in sources_text.lower() or "XGBoost" in sources_text)


if __name__ == "__main__":
    unittest.main()

