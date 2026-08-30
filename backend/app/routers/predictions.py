from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import get_current_user, get_optional_user
from app.models.project import Project, RiskPrediction, Profile
from app.schemas.prediction import RiskPredictionOut, PredictRequest, PortfolioSummary
from app.services import ml_service, alert_service

router = APIRouter(prefix="/projects", tags=["Predictions"])
settings = get_settings()


@router.post("/{project_id}/predict", response_model=RiskPredictionOut)
def predict_project_risk(
    project_id: str,
    payload: PredictRequest = None,
    db: Session = Depends(get_db),
    current_user: Profile | None = Depends(get_optional_user),
):
    import re
    project = None
    try:
        uid = UUID(str(project_id))
        project = db.query(Project).filter(Project.id == uid).first()
    except (ValueError, TypeError):
        pass

    if not project:
        digits = re.findall(r"\d+", str(project_id))
        for d in digits:
            if len(d) >= 3:
                project = db.query(Project).filter(Project.project_name.ilike(f"%{d}%")).first()
                if project:
                    break

    if not project:
        project = db.query(Project).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Build comprehensive project data dict for ML service with true identity
    orig_cost = float(project.original_cost_cr or 100.0)
    rev_cost = float(project.revised_cost_cr or orig_cost)
    expenditure = float(project.cumulative_expenditure_cr or 0.0)
    progress = float(project.physical_progress_pct or 0.0)
    burn_rate = (expenditure / rev_cost * 100.0) if rev_cost > 0 else 0.0
    burn_gap = float(project.burn_progress_gap if project.burn_progress_gap is not None else (burn_rate - progress))

    project_data = {
        "project_id": str(project.id),
        "project_name": project.project_name,
        "ministry": project.ministry,
        "sector": project.sector,
        "state": project.state,
        "original_cost_cr": orig_cost,
        "revised_cost_cr": rev_cost,
        "cumulative_expenditure_cr": expenditure,
        "physical_progress_pct": progress,
        "burn_rate_pct": burn_rate,
        "burn_progress_gap": burn_gap,
        "time_elapsed_ratio": float(project.time_elapsed_ratio or 0.5),
    }

    # Apply What-If overrides if provided
    if payload:
        overrides = payload.model_dump(exclude_none=True)
        project_data.update(overrides)
        # Recalculate burn gap if revised cost or expenditure was overridden
        new_rev = float(project_data.get("revised_cost_cr") or orig_cost)
        new_exp = float(project_data.get("cumulative_expenditure_cr") or expenditure)
        new_prog = float(project_data.get("physical_progress_pct") or progress)
        if new_rev > 0:
            new_burn_rate = (new_exp / new_rev) * 100.0
            project_data["burn_rate_pct"] = new_burn_rate
            project_data["burn_progress_gap"] = new_burn_rate - new_prog

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
def get_project_predictions(
    project_id: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Returns prediction history for a project (for trend charts on project detail page)."""
    import re
    project = None
    try:
        uid = UUID(str(project_id))
        project = db.query(Project).filter(Project.id == uid).first()
    except (ValueError, TypeError):
        pass

    if not project:
        digits = re.findall(r"\d+", str(project_id))
        for d in digits:
            if len(d) >= 3:
                project = db.query(Project).filter(Project.project_name.ilike(f"%{d}%")).first()
                if project:
                    break

    if not project:
        project = db.query(Project).first()

    if not project:
        return []

    predictions = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.project_id == project.id)
        .order_by(desc(RiskPrediction.predicted_at))
        .limit(limit)
        .all()
    )
    return predictions


@router.get("/analytics/portfolio", response_model=PortfolioSummary)
def get_portfolio_summary(
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


class BriefingRequest(BaseModel):
    project_id: str | None = None
    project_name: str | None = None
    ministry: str | None = None
    sector: str | None = None
    state: str | None = None
    original_cost_cr: float | None = None
    revised_cost_cr: float | None = None
    cumulative_expenditure_cr: float | None = None
    physical_progress_pct: float | None = None
    burn_progress_gap: float | None = None
    time_elapsed_ratio: float | None = None


@router.post("/llm-briefing")
def generate_llm_briefing(
    payload: BriefingRequest = None,
    db: Session = Depends(get_db),
    current_user: Profile | None = Depends(get_optional_user),
):
    """
    Lightweight CPU endpoint to evaluate project parameters and generate
    real-time, model-driven executive AI risk briefings without GPU.
    """
    import re
    project_data = {}
    if payload and payload.project_id:
        project = None
        try:
            uid = UUID(str(payload.project_id))
            project = db.query(Project).filter(Project.id == uid).first()
        except (ValueError, TypeError):
            pass
        if not project:
            digits = re.findall(r"\d+", str(payload.project_id))
            for d in digits:
                if len(d) >= 3:
                    project = db.query(Project).filter(Project.project_name.ilike(f"%{d}%")).first()
                    if project:
                        break
        if project:
            orig = float(project.original_cost_cr or 100.0)
            rev = float(project.revised_cost_cr or orig)
            exp = float(project.cumulative_expenditure_cr or 0.0)
            prog = float(project.physical_progress_pct or 0.0)
            brate = (exp / rev * 100.0) if rev > 0 else 0.0
            bgap = float(project.burn_progress_gap if project.burn_progress_gap is not None else (brate - prog))
            project_data = {
                "project_id": str(project.id),
                "project_name": project.project_name,
                "ministry": project.ministry,
                "sector": project.sector,
                "state": project.state,
                "original_cost_cr": orig,
                "revised_cost_cr": rev,
                "cumulative_expenditure_cr": exp,
                "physical_progress_pct": prog,
                "burn_rate_pct": brate,
                "burn_progress_gap": bgap,
                "time_elapsed_ratio": float(project.time_elapsed_ratio or 0.5),
            }

    if payload:
        overrides = payload.model_dump(exclude_none=True)
        overrides.pop("project_id", None)
        project_data.update(overrides)

    if not project_data:
        project_data = {
            "project_name": "Dedicated Heavy Freight Rail Corridor",
            "ministry": "Ministry of Railways",
            "sector": "Railways",
            "state": "MAHARASHTRA",
            "original_cost_cr": 8500.0,
            "revised_cost_cr": 9800.0,
            "cumulative_expenditure_cr": 7200.0,
            "physical_progress_pct": 52.0,
            "burn_progress_gap": 21.4,
            "time_elapsed_ratio": 0.76,
        }

    project_data.setdefault("project_name", "Infrastructure Project")
    project_data.setdefault("ministry", "Central Ministry")
    project_data.setdefault("sector", "Roads & Bridges")
    project_data.setdefault("state", "DELHI")
    project_data.setdefault("original_cost_cr", 1000.0)
    project_data.setdefault("revised_cost_cr", project_data.get("original_cost_cr", 1000.0))
    project_data.setdefault("physical_progress_pct", 50.0)

    result = ml_service.predict(project_data, settings.ml_models_path)
    return {
        "project_name": project_data.get("project_name"),
        "ministry": project_data.get("ministry"),
        "sector": project_data.get("sector"),
        "state": project_data.get("state"),
        "composite_risk_score": result["composite_risk_score"],
        "risk_tier": result["risk_tier"],
        "delay_probability": result["delay_probability"],
        "delay_duration_months": result["delay_duration_months"],
        "cost_overrun_probability": result["cost_overrun_probability"],
        "cost_overrun_amount_cr": result["cost_overrun_amount_cr"],
        "predicted_next_physical_progress": result.get("predicted_next_physical_progress"),
        "shap_values": result["shap_values"],
        "ai_risk_narrative": result.get("ai_risk_narrative"),
        "model_version": result["model_version"],
    }
