"""
test_rbac.py — RBAC enforcement and action approval workflow tests
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.core.database import SessionLocal
from app.models.project import Profile, Project, ActionItem, AuditLog
import uuid

client = TestClient(app)


def get_token_for_role(role: str, user_id: str = None, email: str = None):
    db = SessionLocal()
    # Find or mock user profile
    profile = db.query(Profile).filter(Profile.role == role).first()
    if profile:
        uid = str(profile.id)
        uemail = profile.email
    else:
        uid = user_id or str(uuid.uuid4())
        uemail = email or f"{role}@trace.gov.in"
    db.close()
    
    token = create_access_token(data={"sub": uid, "role": role, "email": uemail})
    return f"Bearer {token}"


def test_public_endpoints_accessible():
    res = client.get("/")
    assert res.status_code == 200
    res = client.get("/health")
    assert res.status_code == 200


def test_viewer_cannot_create_action():
    token = get_token_for_role("viewer")
    payload = {
        "title": "Unauthorized action by viewer",
        "description": "Should fail",
        "priority": "low"
    }
    res = client.post("/api/v1/actions", json=payload, headers={"Authorization": token})
    # Must be 403 Forbidden because viewer is not in ['admin', 'decision_maker', 'monitoring_officer']
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"


def test_action_lifecycle_and_approval():
    admin_token = get_token_for_role("admin")
    officer_token = get_token_for_role("monitoring_officer")
    decision_token = get_token_for_role("decision_maker")

    # 1. Create action as monitoring officer
    payload = {
        "title": "Test Infrastructure Inspection",
        "description": "Routine site inspection for pending bridge foundation",
        "priority": "high",
        "status": "in_progress"
    }
    res = client.post("/api/v1/actions", json=payload, headers={"Authorization": officer_token})
    assert res.status_code == 200, res.text
    action = res.json()
    action_id = action["id"]
    assert action["title"] == payload["title"]
    assert action["approval_status"] == "not_required"

    # 2. Officer submits for approval
    res = client.post(
        f"/api/v1/actions/{action_id}/submit-approval",
        json={"notes": "Inspection completed successfully, foundation verified."},
        headers={"Authorization": officer_token}
    )
    assert res.status_code == 200, res.text
    submitted = res.json()
    assert submitted["status"] == "awaiting_approval"
    assert submitted["approval_status"] == "pending"
    assert submitted["response_notes"] == "Inspection completed successfully, foundation verified."

    # 3. Decision maker approves the action
    res = client.post(
        f"/api/v1/actions/{action_id}/approve",
        json={"notes": "Approved. Excellent report."},
        headers={"Authorization": decision_token}
    )
    assert res.status_code == 200, res.text
    approved = res.json()
    assert approved["status"] == "completed"
    assert approved["approval_status"] == "approved"
    assert approved["approval_notes"] == "Approved. Excellent report."
    assert approved["approved_by"] is not None
    assert approved["approved_at"] is not None

    # 4. Clean up test action
    del_res = client.delete(f"/api/v1/actions/{action_id}", headers={"Authorization": admin_token})
    assert del_res.status_code == 200


def test_audit_log_access_restricted_to_admin():
    viewer_token = get_token_for_role("viewer")
    admin_token = get_token_for_role("admin")

    # Viewer should be blocked from viewing audit logs
    res = client.get("/api/v1/audit-logs", headers={"Authorization": viewer_token})
    assert res.status_code == 403

    # Admin should be allowed
    res = client.get("/api/v1/audit-logs", headers={"Authorization": admin_token})
    assert res.status_code == 200
    assert isinstance(res.json(), list)
