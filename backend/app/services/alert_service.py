import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.project import Alert, RiskPrediction, Project
from app.services.email_service import send_escalation_email

logger = logging.getLogger(__name__)

RISK_TIER_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}


def check_and_create_alert(
    db: Session,
    project: Project,
    new_prediction: RiskPrediction,
) -> Optional[Alert]:
    """
    Compares the new prediction's risk tier with the previous one.
    If the risk has escalated (e.g., medium → high), creates an Alert record
    and dispatches an email notification via Resend.

    Called automatically by the /predict endpoint after every prediction.
    """
    # Get the last prediction for this project (before the new one)
    previous = (
        db.query(RiskPrediction)
        .filter(
            RiskPrediction.project_id == project.id,
            RiskPrediction.id != new_prediction.id,
        )
        .order_by(RiskPrediction.predicted_at.desc())
        .first()
    )

    previous_tier = previous.risk_tier if previous else None
    new_tier = new_prediction.risk_tier

    # No escalation — no alert needed
    if previous_tier and RISK_TIER_ORDER.get(new_tier, 0) <= RISK_TIER_ORDER.get(previous_tier, 0):
        return None

    # Build a human-readable alert message
    if previous_tier:
        message = (
            f"Project '{project.project_name}' risk has escalated from "
            f"'{previous_tier.upper()}' to '{new_tier.upper()}'. "
            f"Composite score: {new_prediction.composite_risk_score:.2f}. "
            f"Immediate review recommended."
        )
    else:
        message = (
            f"First risk prediction for '{project.project_name}': "
            f"tier '{new_tier.upper()}' (score: {new_prediction.composite_risk_score:.2f})."
        )

    alert = Alert(
        project_id=project.id,
        alert_type="risk_escalation",
        previous_tier=previous_tier,
        new_tier=new_tier,
        message=message,
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    logger.info(
        "Alert created for project %s: %s → %s",
        project.project_name, previous_tier, new_tier
    )

    # Send email notification for HIGH and CRITICAL escalations
    if new_tier in ("high", "critical"):
        send_escalation_email(project, new_prediction, previous_tier)

    return alert

