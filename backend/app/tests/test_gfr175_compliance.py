import pytest
from app.services.gfr175_service import screen_project_gfr175
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.core.database import SessionLocal
from app.models.project import Profile
import uuid

client = TestClient(app)

def get_auth_token():
    db = SessionLocal()
    profile = db.query(Profile).filter(Profile.role == "monitoring_officer").first()
    if profile:
        uid = str(profile.id)
        uemail = profile.email
    else:
        uid = str(uuid.uuid4())
        uemail = "officer@trace.gov.in"
    db.close()
    token = create_access_token(data={"sub": uid, "role": "monitoring_officer", "email": uemail})
    return f"Bearer {token}"


def test_clean_project_screening():
    """
    Test a clean project with balanced expenditure and physical progress.
    Expected:
      - Status: GREEN ("No Integrity Indicators Detected")
      - Indicators: [] (empty list)
      - Existing risk tier is preserved unchanged
      - Advisory notice present
    """
    clean_result = screen_project_gfr175(
        project_id="clean-proj-001",
        project_name="Standard Highway Bypass Phase II",
        contractor_name="Larsen & Toubro Heavy Civil",
        original_cost_cr=500.0,
        revised_cost_cr=510.0,
        cumulative_expenditure_cr=125.0,
        physical_progress_pct=25.0,
        burn_rate_pct=24.5,
        burn_progress_gap=-0.5,
        source_pdf_page=42,
        report_month="April 2026",
        sl_no=15,
        contractor_multi_state_count=1,
        existing_risk_tier="LOW",
        existing_risk_score=0.15,
    )

    assert clean_result["gfr175_screening_status"] == "No Integrity Indicators Detected"
    assert clean_result["status_color"] == "GREEN"
    assert len(clean_result["indicators"]) == 0
    assert clean_result["risk_tier"] == "LOW"
    assert clean_result["risk_score"] == 0.15
    assert clean_result["advisory_only"] is True
    assert "legal violation" in clean_result["advisory_notice"]
    assert "disqualification" in clean_result["advisory_notice"]
    assert clean_result["evidence"]["source_page"] == 42
    assert clean_result["evidence"]["source_document"] == "FlashReport_April_2026.pdf"


def test_anomaly_project_screening():
    """
    Test an anomaly project with milestone billing surge / progress disconnect.
    Expected:
      - Status: YELLOW ("Compliance Review Required")
      - Indicators: contains empirical signals like "Billing anomaly" or "Progress-expenditure disconnect"
      - Existing risk tier remains separate (e.g. MEDIUM)
    """
    anomaly_result = screen_project_gfr175(
        project_id="anomaly-proj-002",
        project_name="Regional Airport Terminal Expansion",
        contractor_name="Apex Airport Infrastructures",
        original_cost_cr=350.0,
        revised_cost_cr=420.0,
        cumulative_expenditure_cr=140.0,
        physical_progress_pct=15.0,
        burn_rate_pct=33.3,
        burn_progress_gap=18.3,
        source_pdf_page=75,
        report_month="April 2026",
        sl_no=22,
        contractor_multi_state_count=2,
        existing_risk_tier="MEDIUM",
        existing_risk_score=0.55,
    )

    # With burn 33.3% and prog 15% (spike_ratio = 2.22x), triggers billing anomaly
    assert anomaly_result["gfr175_screening_status"] == "Compliance Review Required"
    assert anomaly_result["status_color"] == "YELLOW"
    assert len(anomaly_result["indicators"]) > 0
    assert any("Billing anomaly" in ind for ind in anomaly_result["indicators"])
    assert anomaly_result["risk_tier"] == "MEDIUM"
    assert anomaly_result["risk_score"] == 0.55
    assert anomaly_result["advisory_only"] is True


def test_severe_anomaly_project_screening():
    """
    Test a severe anomaly project with massive phantom capital outflow and severe decoupling.
    Expected:
      - Status: RED ("Potential Integrity Concern")
      - Indicators: contains "Unusual expenditure pattern"
      - Existing risk tier remains separate (e.g. HIGH or CRITICAL)
    """
    severe_result = screen_project_gfr175(
        project_id="severe-proj-003",
        project_name="Deepwater Port Container Berth Expansion",
        contractor_name="Coastal Heavy Civil Consortium",
        original_cost_cr=1200.0,
        revised_cost_cr=2100.0,
        cumulative_expenditure_cr=850.0,
        physical_progress_pct=12.0,
        burn_rate_pct=40.5,
        burn_progress_gap=28.5,
        source_pdf_page=118,
        report_month="April 2026",
        sl_no=8,
        contractor_multi_state_count=3,
        existing_risk_tier="CRITICAL",
        existing_risk_score=0.92,
    )

    # burn_rate_pct >= 35.0 and prog <= 15.0 and spent >= 20.0 triggers severe trigger
    assert severe_result["gfr175_screening_status"] == "Potential Integrity Concern"
    assert severe_result["status_color"] == "RED"
    assert len(severe_result["indicators"]) >= 1
    assert any("Unusual expenditure pattern" in ind for ind in severe_result["indicators"])
    assert severe_result["risk_tier"] == "CRITICAL"
    assert severe_result["risk_score"] == 0.92
    assert severe_result["advisory_only"] is True


def test_structured_result_schema():
    """
    Validates that the output dictionary exactly fulfills the required schema:
    {
      contractor_id,
      risk_score,
      risk_tier,
      gfr175_screening_status,
      indicators,
      evidence,
      explanation,
      generated_at,
      advisory_only: true
    }
    """
    res = screen_project_gfr175(
        project_id="test-proj-schema",
        project_name="Test Project",
        contractor_name="Test Contractor Ltd",
        original_cost_cr=200.0,
        revised_cost_cr=200.0,
        cumulative_expenditure_cr=50.0,
        physical_progress_pct=25.0,
        burn_rate_pct=25.0,
        burn_progress_gap=0.0,
        source_pdf_page=88,
        report_month="April 2026",
    )

    required_keys = [
        "contractor_id",
        "risk_score",
        "risk_tier",
        "gfr175_screening_status",
        "indicators",
        "evidence",
        "explanation",
        "generated_at",
        "advisory_only",
    ]
    for key in required_keys:
        assert key in res, f"Missing required key: {key}"

    assert res["advisory_only"] is True
    assert isinstance(res["indicators"], list)
    assert isinstance(res["evidence"], dict)
    assert "source_document" in res["evidence"]
    assert "source_page" in res["evidence"]


def test_statutory_non_disqualification_language():
    """
    Verifies that the advisory notice and explanation do NOT make final legal,
    administrative, or procurement disqualification claims.
    """
    res = screen_project_gfr175(
        project_id="severe-test",
        project_name="High Variance Facility",
        contractor_name="HCC - NCC Joint Venture",
        original_cost_cr=100.0,
        revised_cost_cr=300.0,
        cumulative_expenditure_cr=90.0,
        physical_progress_pct=10.0,
        burn_rate_pct=30.0,
        burn_progress_gap=20.0,
    )

    # Ensure advisory notice emphasizes non-adjudicative status
    notice = res["advisory_notice"].lower()
    assert "advisory" in notice
    assert "final determination remains with authorized officials" in notice
    assert "does not establish a legal violation" in notice
    assert "disqualification" in notice


def test_api_project_gfr175_endpoint():
    """
    Tests GET /api/v1/analytics/fraud-detection/gfr175/{project_id}
    """
    token = get_auth_token()
    # Test with synthetic or first available project
    res = client.get("/api/v1/analytics/fraud-detection/gfr175/test-project-any", headers={"Authorization": token})
    assert res.status_code == 200, res.text
    data = res.json()
    assert "gfr175_screening_status" in data
    assert "status_color" in data
    assert "indicators" in data
    assert "evidence" in data
    assert data["advisory_only"] is True
