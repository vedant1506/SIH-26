from typing import List
from uuid import UUID
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import desc
# pyrefly: ignore [missing-import]
from app.core.database import get_db
# pyrefly: ignore [missing-import]
from app.core.security import get_current_user, require_role
# pyrefly: ignore [missing-import]
from app.models.project import Alert, Project, Profile
# pyrefly: ignore [missing-import]
from app.schemas.prediction import AlertOut

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertOut])
async def list_alerts(
    unacknowledged_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Returns all alerts ordered by most recent first.
    Used by the Early Warning Feed on the dashboard.
    """
    query = db.query(Alert).order_by(desc(Alert.triggered_at))

    if unacknowledged_only:
        query = query.filter(Alert.is_acknowledged == False)  # noqa: E712

    alerts = query.limit(limit).all()

    result = []
    for alert in alerts:
        project = db.query(Project).filter(Project.id == alert.project_id).first()
        result.append(AlertOut(
            id=alert.id,
            project_id=alert.project_id,
            project_name=project.project_name if project else "Unknown Project",
            triggered_at=alert.triggered_at,
            alert_type=alert.alert_type,
            previous_tier=alert.previous_tier,
            new_tier=alert.new_tier,
            message=alert.message,
            is_acknowledged=alert.is_acknowledged,
        ))

    return result


@router.post("/{alert_id}/acknowledge", response_model=AlertOut)
async def acknowledge_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Mark an alert as acknowledged. Monitoring Officer+ only."""
    from datetime import datetime, timezone
    import uuid

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.is_acknowledged:
        raise HTTPException(status_code=400, detail="Alert already acknowledged")

    user_uuid = None
    try:
        user_uuid = uuid.UUID(str(current_user.id))
    except (ValueError, TypeError, AttributeError):
        user_uuid = None

    alert.is_acknowledged = True
    alert.acknowledged_by = user_uuid
    alert.acknowledged_at = datetime.now(timezone.utc)
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
        is_acknowledged=alert.is_acknowledged,
    )
