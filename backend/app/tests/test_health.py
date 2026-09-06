"""
test_health.py — Health endpoint regression tests
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_health():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_health_aggregate():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "checks" in data


def test_health_database():
    res = client.get("/health/database")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ok", "error")
    if data["status"] == "ok":
        assert data["project_count"] >= 0


def test_health_ml():
    res = client.get("/health/ml")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ok", "degraded")
    assert "models" in data


def test_health_llm():
    res = client.get("/health/llm")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ok", "degraded")
    assert "cloud_apis" in data
