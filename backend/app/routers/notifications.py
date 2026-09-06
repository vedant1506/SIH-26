"""
notifications.py — Persistent In-App Notification Router
Covers: risk escalation, action assignments, approval workflow events,
milestone alerts, import completions.
"""
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Notification, Profile

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def create_notification(
    db: Session,
    notification_type: str,
    title: str,
    message: str,
    severity: str = "info",
    user_id: Optional[str] = None,
    target_role: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    entity_name: Optional[str] = None,
) -> Notification:
    """
    Internal helper — call from any router to create a persistent notification.
    If user_id is None and target_role is set, the notification is shown to all users with that role.
    If both are None, it's a broadcast notification.
    """
    notif = Notification(
        user_id=user_id,
        target_role=target_role,
        notification_type=notification_type,
        title=title,
        message=message,
        severity=severity,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        entity_name=entity_name,
    )
    db.add(notif)
    db.commit()
    return notif


@router.get("", response_model=List[dict])
async def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Returns notifications for the current user.
    Includes: notifications targeted at their user_id, their role, or broadcast notifications.
    """
    user_id = str(current_user.id)
    user_role = current_user.role

    query = (
        db.query(Notification)
        .filter(
            (Notification.user_id == user_id)
            | (Notification.target_role == user_role)
            | (Notification.user_id.is_(None) & Notification.target_role.is_(None))
        )
        .order_by(desc(Notification.created_at))
    )

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = query.limit(limit).all()

    return [
        {
            "id": str(n.id),
            "notification_type": n.notification_type,
            "title": n.title,
            "message": n.message,
            "severity": n.severity,
            "entity_type": n.entity_type,
            "entity_id": n.entity_id,
            "entity_name": n.entity_name,
            "is_read": n.is_read,
            "read_at": n.read_at.isoformat() if n.read_at else None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]


@router.get("/unread-count")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Returns unread notification count for the current user (used by TopBar bell icon)."""
    user_id = str(current_user.id)
    user_role = current_user.role

    count = (
        db.query(Notification)
        .filter(
            (Notification.user_id == user_id)
            | (Notification.target_role == user_role)
            | (Notification.user_id.is_(None) & Notification.target_role.is_(None))
        )
        .filter(Notification.is_read == False)
        .count()
    )
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Mark a single notification as read."""
    from uuid import UUID
    try:
        uid = UUID(notification_id)
        notif = db.query(Notification).filter(Notification.id == uid).first()
    except (ValueError, TypeError):
        notif = None

    if not notif:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok", "id": notification_id}


@router.post("/read-all")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Mark all notifications for current user as read."""
    user_id = str(current_user.id)
    user_role = current_user.role
    now = datetime.now(timezone.utc)

    notifications = (
        db.query(Notification)
        .filter(
            (Notification.user_id == user_id)
            | (Notification.target_role == user_role)
            | (Notification.user_id.is_(None) & Notification.target_role.is_(None))
        )
        .filter(Notification.is_read == False)
        .all()
    )

    for n in notifications:
        n.is_read = True
        n.read_at = now

    db.commit()
    return {"status": "ok", "marked_count": len(notifications)}
