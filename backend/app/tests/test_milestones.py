"""
test_milestones.py — Project milestones and tracking tests
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.core.database import SessionLocal
from app.models.project import Profile, Project, Milestone
import uuid

client = TestClient(app)


def get_auth_token():
    db = SessionLocal()
    profile = db.query(Profile).filter(Profile.role == "admin").first()
    uid = str(profile.id) if profile else str(uuid.uuid4())
    email = profile.email if profile else "admin@trace.gov.in"
    db.close()
    token = create_access_token(data={"sub": uid, "role": "admin", "email": email})
    return f"Bearer {token}"


def test_project_milestones_endpoint():
    db = SessionLocal()
    # Find a project that has milestones
    row = db.query(Milestone).first()
    assert row is not None, "Milestones must be seeded in database"
    project_id = str(row.project_id)
    db.close()

    token = get_auth_token()
    res = client.get(f"/api/v1/projects/{project_id}/milestones", headers={"Authorization": token})
    assert res.status_code == 200, res.text
    data = res.json()

    assert "project_id" in data
    assert "project_name" in data
    assert "milestones" in data
    assert "total" in data
    assert "completed" in data
    assert "overdue" in data

    assert data["total"] > 0
    milestones = data["milestones"]
    first = milestones[0]
    assert "milestone_name" in first
    assert "is_completed" in first
    assert "status" in first
    assert first["status"] in ("COMPLETED", "OVERDUE", "IN_PROGRESS", "NOT_STARTED")


def test_nonexistent_project_milestones():
    token = get_auth_token()
    fake_id = str(uuid.uuid4())
    res = client.get(f"/api/v1/projects/{fake_id}/milestones", headers={"Authorization": token})
    assert res.status_code == 404


def test_project_history_endpoint():
    db = SessionLocal()
    project = db.query(Project).first()
    assert project is not None
    project_id = str(project.id)
    db.close()

    token = get_auth_token()
    res = client.get(f"/api/v1/projects/{project_id}/history", headers={"Authorization": token})
    assert res.status_code == 200, res.text
    data = res.json()

    assert "project_id" in data
    assert "prediction_history" in data
    assert "total_months" in data
    assert isinstance(data["prediction_history"], list)
