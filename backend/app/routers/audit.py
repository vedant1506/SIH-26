"""
audit.py — Audit Log Router
Provides tamper-evident audit trail for all significant platform actions.
Admin-only read access. All writes are via internal create_audit_log() helper.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.project import AuditLog, Profile

router = APIRouter(prefix="/audit", tags=["Audit"])


def create_audit_log(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    metadata: Optional[dict] = None,
) -> AuditLog:
    """Internal helper — call this from any router to record an audit event."""
    log = AuditLog(
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        entity_name=entity_name,
        old_value=old_value,
        new_value=new_value,
        extra_metadata=metadata or {},
    )
    db.add(log)
    db.commit()
    return log


@router.get("", response_model=List[dict])
async def list_audit_logs(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_roles(["admin"])),
):
    """
    Returns audit log entries. Admin only.
    Supports filtering by action type, entity, and user.
    """
    query = db.query(AuditLog).order_by(desc(AuditLog.created_at))

    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    logs = query.offset(skip).limit(limit).all()

    return [
        {
            "id": str(log.id),
            "user_id": log.user_id,
            "user_email": log.user_email,
            "user_role": log.user_role,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "entity_name": log.entity_name,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "extra_metadata": log.extra_metadata,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


@router.get("/summary")
async def get_audit_summary(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_roles(["admin"])),
):
    """Returns audit log action type counts for the admin dashboard."""
    from sqlalchemy import func
    rows = (
        db.query(AuditLog.action, func.count(AuditLog.id).label("count"))
        .group_by(AuditLog.action)
        .order_by(desc("count"))
        .all()
    )
    total = db.query(func.count(AuditLog.id)).scalar() or 0
    return {
        "total_events": total,
        "by_action": [{"action": r.action, "count": r.count} for r in rows],
    }


# Secondary router for /audit-logs route alias
audit_logs_router = APIRouter(prefix="/audit-logs", tags=["Audit"])
audit_logs_router.add_api_route("", list_audit_logs, methods=["GET"], response_model=List[dict])
audit_logs_router.add_api_route("/summary", get_audit_summary, methods=["GET"])

