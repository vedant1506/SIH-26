from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import get_current_user
from app.models.project import Project, RiskPrediction, Profile
from app.schemas.prediction import RiskPredictionOut, PredictRequest, PortfolioSummary
from app.services import ml_service, alert_service

router = APIRouter(prefix="/projects", tags=["Predictions"])
settings = get_settings()


@router.post("/{project_id}/predict", response_model=RiskPredictionOut)
async def predict_project_risk(
    project_id: UUID,
    payload: PredictRequest = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Runs ML risk prediction for a project and stores the result.

    Optionally accepts overridden field values (for What-If simulation).
    Automatically creates an alert if risk tier has escalated.

    IMPORTANT: This endpoint is the ONLY way the frontend gets risk scores.
    Never call Supabase directly from the frontend for predictions.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Build project data dict for ML service
    project_data = {
        "project_id": str(project.id),
        "state": project.state,
        "sector": project.sector,
        "original_cost_cr": project.original_cost_cr,
        "revised_cost_cr": project.revised_cost_cr or project.original_cost_cr,
        "cumulative_expenditure_cr": project.cumulative_expenditure_cr or 0.0,
        "physical_progress_pct": project.physical_progress_pct or 0.0,
        "burn_rate_pct": project.burn_rate_pct or 0.0,
        "burn_progress_gap": project.burn_progress_gap or 0.0,
        "time_elapsed_ratio": project.time_elapsed_ratio or 0.0,
    }

    # Apply What-If overrides if provided
    if payload:
        overrides = payload.model_dump(exclude_none=True)
        project_data.update(overrides)

    # Run ML prediction
    result = ml_service.predict(project_data, settings.ml_models_path)

    # Store prediction in database
    prediction = RiskPrediction(
        project_id=project.id,
        delay_probability=result["delay_probability"],
        delay_duration_months=result["delay_duration_months"],
        cost_overrun_probability=result["cost_overrun_probability"],
        cost_overrun_amount_cr=result["cost_overrun_amount_cr"],
        composite_risk_score=result["composite_risk_score"],
        risk_tier=result["risk_tier"],
        shap_values=result["shap_values"],
        ai_risk_narrative=result.get("ai_risk_narrative"),
        model_version=result["model_version"],
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    # Check for risk escalation and create alert if needed
    alert_service.check_and_create_alert(db, project, prediction)

    return prediction


@router.get("/{project_id}/predictions", response_model=list[RiskPredictionOut])
async def get_project_predictions(
    project_id: UUID,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Returns prediction history for a project (for trend charts on project detail page)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    predictions = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.project_id == project_id)
        .order_by(desc(RiskPrediction.predicted_at))
        .limit(limit)
        .all()
    )
    return predictions


@router.get("/analytics/portfolio", response_model=PortfolioSummary)
async def get_portfolio_summary(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Aggregated KPIs for the Decision Maker Portfolio Command Center.
    Returns counts per risk tier, total financial exposure for high/critical projects.
    """
    from sqlalchemy import func

    total = db.query(Project).count()

    # Get latest prediction per project using a subquery
    latest_pred_subq = (
        db.query(
            RiskPrediction.project_id,
            func.max(RiskPrediction.predicted_at).label("max_pred_at"),
        )
        .group_by(RiskPrediction.project_id)
        .subquery()
    )

    latest_preds = (
        db.query(RiskPrediction)
        .join(
            latest_pred_subq,
            (RiskPrediction.project_id == latest_pred_subq.c.project_id)
            & (RiskPrediction.predicted_at == latest_pred_subq.c.max_pred_at),
        )
        .all()
    )

    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    exposure = 0.0
    delay_months_sum = 0.0
    delayed_count = 0

    for pred in latest_preds:
        tier = pred.risk_tier or "low"
        counts[tier] = counts.get(tier, 0) + 1

        if tier in ("high", "critical"):
            project = db.query(Project).filter(Project.id == pred.project_id).first()
            if project:
                exposure += float(project.revised_cost_cr or project.original_cost_cr or 0)

        if pred.delay_probability and pred.delay_probability > 0.5:
            delayed_count += 1
            delay_months_sum += float(pred.delay_duration_months or 0)

    avg_delay = round(delay_months_sum / delayed_count, 1) if delayed_count > 0 else 0.0

    return PortfolioSummary(
        total_projects=total,
        critical_count=counts["critical"],
        high_count=counts["high"],
        medium_count=counts["medium"],
        low_count=counts["low"],
        total_exposure_cr=round(exposure, 2),
        total_delayed_count=delayed_count,
        avg_delay_duration_months=avg_delay,
    )
