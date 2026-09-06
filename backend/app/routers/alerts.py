from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session, joinedload
# pyrefly: ignore [missing-import]
from sqlalchemy import desc, case
# pyrefly: ignore [missing-import]
from app.core.database import get_db
# pyrefly: ignore [missing-import]
from app.core.security import get_current_user, get_optional_user, require_role, require_roles
# pyrefly: ignore [missing-import]
from app.models.project import Alert, Project, Profile
# pyrefly: ignore [missing-import]
from app.schemas.prediction import AlertOut, AlertStatusUpdate

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertOut])
async def list_alerts(
    unacknowledged_only: bool = False,
    status: Optional[str] = Query(None, description="Filter by status: NEW, ACKNOWLEDGED, UNDER_REVIEW, ACTION_ASSIGNED, RESOLVED"),
    limit: Optional[int] = Query(None, description="Max alerts to return. If omitted, returns all alerts."),
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    Returns all alerts ordered by priority tier and most recent first.
    Used by the Early Warning Feed and Alert Operations Center.
    """
    tier_weight = case(
        (Alert.new_tier == "critical", 3),
        (Alert.new_tier == "high", 2),
        (Alert.new_tier == "medium", 1),
        else_=0
    )
    query = (
        db.query(
            Alert.id,
            Alert.project_id,
            Project.project_name,
            Alert.triggered_at,
            Alert.alert_type,
            Alert.previous_tier,
            Alert.new_tier,
            Alert.message,
            Alert.status,
            Alert.is_acknowledged,
            Alert.acknowledged_by,
            Alert.acknowledged_at,
        )
        .outerjoin(Project, Alert.project_id == Project.id)
        .order_by(desc(tier_weight), desc(Alert.triggered_at))
    )

    if unacknowledged_only:
        query = query.filter(Alert.is_acknowledged == False)  # noqa: E712

    if status and not hasattr(status, "default"):
        s_val = str(status).strip().upper()
        if s_val and s_val != "ALL":
            query = query.filter(Alert.status == s_val)

    if limit is not None and not hasattr(limit, "default"):
        try:
            lim_val = int(limit)
            if lim_val > 0:
                query = query.limit(lim_val)
        except (ValueError, TypeError):
            pass

    rows = query.all()

    result = []
    for r in rows:
        resolved_status = r.status or ("ACKNOWLEDGED" if r.is_acknowledged else "NEW")
        result.append(AlertOut(
            id=r.id,
            project_id=r.project_id,
            project_name=r.project_name or "Unknown Project",
            triggered_at=r.triggered_at,
            alert_type=r.alert_type,
            previous_tier=r.previous_tier,
            new_tier=r.new_tier,
            message=r.message,
            status=resolved_status,
            is_acknowledged=bool(r.is_acknowledged),
            acknowledged_by=r.acknowledged_by,
            acknowledged_at=r.acknowledged_at,
        ))

    return result


@router.post("/acknowledge-all")
async def acknowledge_all_alerts(
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """Mark all unacknowledged alerts as acknowledged."""
    import uuid

    user_uuid = None
    if current_user and getattr(current_user, "id", None):
        try:
            user_uuid = uuid.UUID(str(current_user.id))
        except (ValueError, TypeError, AttributeError):
            user_uuid = None

    now = datetime.now(timezone.utc)
    updated_count = db.query(Alert).filter(Alert.is_acknowledged == False).update({
        Alert.is_acknowledged: True,
        Alert.status: "ACKNOWLEDGED",
        Alert.acknowledged_by: user_uuid,
        Alert.acknowledged_at: now,
    }, synchronize_session="fetch")
    db.commit()
    return {"status": "ok", "acknowledged_count": updated_count}


@router.post("/{alert_id}/acknowledge", response_model=AlertOut)
async def acknowledge_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """Mark an alert as acknowledged."""
    import uuid

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.is_acknowledged:
        raise HTTPException(status_code=400, detail="Alert already acknowledged")

    user_uuid = None
    if current_user and getattr(current_user, "id", None):
        try:
            user_uuid = uuid.UUID(str(current_user.id))
        except (ValueError, TypeError, AttributeError):
            user_uuid = None

    now = datetime.now(timezone.utc)
    alert.is_acknowledged = True
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = user_uuid
    alert.acknowledged_at = now
    db.commit()
    db.refresh(alert)

    project = db.query(Project).filter(Project.id == alert.project_id).first()
    return AlertOut(
        id=alert.id,
        project_id=alert.project_id,
        project_name=project.project_name if project else "Unknown Project",
        triggered_at=alert.triggered_at,
        alert_type=alert.alert_type,
        previous_tier=alert.previous_tier,
        new_tier=alert.new_tier,
        message=alert.message,
        status=alert.status,
        is_acknowledged=alert.is_acknowledged,
        acknowledged_by=alert.acknowledged_by,
        acknowledged_at=alert.acknowledged_at,
    )


@router.patch("/{alert_id}/status", response_model=AlertOut)
async def update_alert_status(
    alert_id: UUID,
    payload: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    Update the lifecycle status of an alert.
    Valid statuses: NEW, ACKNOWLEDGED, UNDER_REVIEW, ACTION_ASSIGNED, RESOLVED.
    """
    valid_statuses = {"NEW", "ACKNOWLEDGED", "UNDER_REVIEW", "ACTION_ASSIGNED", "RESOLVED"}
    new_status = payload.status.upper().strip()
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(sorted(valid_statuses))}"
        )

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    import uuid
    user_uuid = None
    if current_user and getattr(current_user, "id", None):
        try:
            user_uuid = uuid.UUID(str(current_user.id))
        except (ValueError, TypeError, AttributeError):
            user_uuid = None

    now = datetime.now(timezone.utc)
    alert.status = new_status
    if new_status != "NEW":
        alert.is_acknowledged = True
        if not alert.acknowledged_at:
            alert.acknowledged_at = now
        if not alert.acknowledged_by and user_uuid:
            alert.acknowledged_by = user_uuid

    db.commit()
    db.refresh(alert)

    project = db.query(Project).filter(Project.id == alert.project_id).first()
    return AlertOut(
        id=alert.id,
        project_id=alert.project_id,
        project_name=project.project_name if project else "Unknown Project",
        triggered_at=alert.triggered_at,
        alert_type=alert.alert_type,
        previous_tier=alert.previous_tier,
        new_tier=alert.new_tier,
        message=alert.message,
        status=alert.status,
        is_acknowledged=alert.is_acknowledged,
        acknowledged_by=alert.acknowledged_by,
        acknowledged_at=alert.acknowledged_at,
    )

