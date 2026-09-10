"""
reports.py — Report Generation Router
Generates PDF, CSV, and Excel reports from canonical database data.
Covers: project, portfolio, district, state, sector, ministry reports.
"""
import io
import csv
import json
from typing import Optional, List
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.project import Project, RiskPrediction, Alert, ActionItem, Profile

router = APIRouter(prefix="/reports", tags=["Reports"])


def _get_latest_pred_subq(db: Session):
    return (
        db.query(RiskPrediction.project_id, func.max(RiskPrediction.predicted_at).label("max_pred_at"))
        .group_by(RiskPrediction.project_id)
        .subquery()
    )


# ─────────────────────────────────────────────
# CSV / JSON helpers
# ─────────────────────────────────────────────

def _projects_to_rows(rows) -> List[dict]:
    result = []
    for p, pred in rows:
        result.append({
            "project_id": str(p.id),
            "project_name": p.project_name,
            "ministry": p.ministry,
            "sector": p.sector,
            "state": p.state,
            "district": getattr(p, "district", ""),
            "original_cost_cr": float(p.original_cost_cr or 0),
            "revised_cost_cr": float(p.revised_cost_cr or p.original_cost_cr or 0),
            "cumulative_expenditure_cr": float(p.cumulative_expenditure_cr or 0),
            "physical_progress_pct": float(p.physical_progress_pct or 0),
            "burn_rate_pct": float(p.burn_rate_pct or 0),
            "burn_progress_gap": float(p.burn_progress_gap or 0),
            "time_elapsed_pct": round(float(p.time_elapsed_ratio or 0) * 100, 1),
            "project_scale": p.project_scale or "",
            "scheduled_completion": str(p.scheduled_completion_date) if p.scheduled_completion_date else "",
            "revised_completion": str(p.revised_completion_date) if p.revised_completion_date else "",
            "risk_tier": pred.risk_tier if pred else "",
            "composite_risk_score": round(float(pred.composite_risk_score or 0), 3) if pred else "",
            "delay_probability": round(float(pred.delay_probability or 0), 3) if pred else "",
            "cost_overrun_probability": round(float(pred.cost_overrun_probability or 0), 3) if pred else "",
            "delay_duration_months": round(float(pred.delay_duration_months or 0), 1) if pred else "",
            "cost_overrun_amount_cr": round(float(pred.cost_overrun_amount_cr or 0), 2) if pred else "",
        })
    return result


@router.get("/portfolio/csv")
async def export_portfolio_csv(
    state: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    ministry: Optional[str] = Query(None),
    risk_tier: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Export full portfolio as CSV from canonical database."""
    subq = _get_latest_pred_subq(db)
    query = (
        db.query(Project, RiskPrediction)
        .outerjoin(subq, Project.id == subq.c.project_id)
        .outerjoin(RiskPrediction,
            (RiskPrediction.project_id == subq.c.project_id)
            & (RiskPrediction.predicted_at == subq.c.max_pred_at))
    )
    if state:
        query = query.filter(Project.state.ilike(f"%{state}%"))
    if sector:
        query = query.filter(Project.sector.ilike(f"%{sector}%"))
    if ministry:
        query = query.filter(Project.ministry.ilike(f"%{ministry}%"))
    if risk_tier:
        query = query.filter(RiskPrediction.risk_tier == risk_tier.strip().lower())

    rows = query.order_by(desc(RiskPrediction.composite_risk_score)).all()
    data = _projects_to_rows(rows)

    output = io.StringIO()
    if data:
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    return Response(
        content=output.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="TRACE_Portfolio_Report_{timestamp}.csv"'},
    )


@router.get("/portfolio/json")
async def export_portfolio_json(
    state: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    ministry: Optional[str] = Query(None),
    risk_tier: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Export portfolio summary as JSON."""
    subq = _get_latest_pred_subq(db)
    query = (
        db.query(Project, RiskPrediction)
        .outerjoin(subq, Project.id == subq.c.project_id)
        .outerjoin(RiskPrediction,
            (RiskPrediction.project_id == subq.c.project_id)
            & (RiskPrediction.predicted_at == subq.c.max_pred_at))
    )
    if state:
        query = query.filter(Project.state.ilike(f"%{state}%"))
    if sector:
        query = query.filter(Project.sector.ilike(f"%{sector}%"))
    if ministry:
        query = query.filter(Project.ministry.ilike(f"%{ministry}%"))
    if risk_tier:
        query = query.filter(RiskPrediction.risk_tier == risk_tier.strip().lower())

    rows = query.order_by(desc(RiskPrediction.composite_risk_score)).all()
    data = _projects_to_rows(rows)
    total = len(data)

    tier_counts = {}
    for r in data:
        t = r.get("risk_tier") or "unknown"
        tier_counts[t] = tier_counts.get(t, 0) + 1

    return {
        "generated_at": datetime.now().isoformat(),
        "total_projects": total,
        "risk_distribution": tier_counts,
        "filters": {"state": state, "sector": sector, "ministry": ministry},
        "projects": data,
    }


@router.get("/state/{state_name}/csv")
async def export_state_report_csv(
    state_name: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Export state-level project report as CSV."""
    subq = _get_latest_pred_subq(db)
    rows = (
        db.query(Project, RiskPrediction)
        .outerjoin(subq, Project.id == subq.c.project_id)
        .outerjoin(RiskPrediction,
            (RiskPrediction.project_id == subq.c.project_id)
            & (RiskPrediction.predicted_at == subq.c.max_pred_at))
        .filter(Project.state.ilike(f"%{state_name}%"))
        .order_by(desc(RiskPrediction.composite_risk_score))
        .all()
    )

    if not rows:
        raise HTTPException(status_code=404, detail=f"No projects found for state: {state_name}")

    data = _projects_to_rows(rows)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)

    safe_name = state_name.replace(" ", "_").upper()
    timestamp = datetime.now().strftime("%Y%m%d")
    return Response(
        content=output.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="TRACE_{safe_name}_Report_{timestamp}.csv"'},
    )


@router.get("/sector/{sector_name}/csv")
async def export_sector_report_csv(
    sector_name: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Export sector-level project report as CSV."""
    subq = _get_latest_pred_subq(db)
    rows = (
        db.query(Project, RiskPrediction)
        .outerjoin(subq, Project.id == subq.c.project_id)
        .outerjoin(RiskPrediction,
            (RiskPrediction.project_id == subq.c.project_id)
            & (RiskPrediction.predicted_at == subq.c.max_pred_at))
        .filter(Project.sector.ilike(f"%{sector_name}%"))
        .order_by(desc(RiskPrediction.composite_risk_score))
        .all()
    )

    if not rows:
        raise HTTPException(status_code=404, detail=f"No projects found for sector: {sector_name}")

    data = _projects_to_rows(rows)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)

    safe_name = sector_name.replace(" ", "_").replace("&", "and")
    timestamp = datetime.now().strftime("%Y%m%d")
    return Response(
        content=output.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="TRACE_{safe_name}_Report_{timestamp}.csv"'},
    )


@router.get("/project/{project_id}/summary")
async def get_project_report_data(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Returns a full structured project report payload.
    Used by frontend to render project PDF report.
    Includes: project info, financials, risk, SHAP, alerts, actions.
    """
    from uuid import UUID
    project = None
    try:
        uid = UUID(project_id)
        project = db.query(Project).filter(Project.id == uid).first()
    except (ValueError, TypeError):
        pass

    if not project:
        project = db.query(Project).filter(Project.project_name.ilike(project_id)).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Latest prediction
    pred = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.project_id == project.id)
        .order_by(desc(RiskPrediction.predicted_at))
        .first()
    )

    # Alerts for this project
    alerts = (
        db.query(Alert)
        .filter(Alert.project_id == project.id)
        .order_by(desc(Alert.triggered_at))
        .limit(10)
        .all()
    )

    # Actions for this project
    actions = (
        db.query(ActionItem)
        .filter(ActionItem.project_id == project.id)
        .order_by(desc(ActionItem.created_at))
        .limit(10)
        .all()
    )

    # Milestones
    milestones = [
        {
            "id": str(m.id),
            "milestone_name": m.milestone_name,
            "scheduled_date": str(m.scheduled_date) if m.scheduled_date else None,
            "actual_date": str(m.actual_date) if m.actual_date else None,
            "is_completed": m.is_completed,
        }
        for m in (project.milestones or [])
    ]

    return {
        "generated_at": datetime.now().isoformat(),
        "report_type": "project",
        "project": {
            "id": str(project.id),
            "project_name": project.project_name,
            "ministry": project.ministry,
            "sector": project.sector,
            "state": project.state,
            "district": project.district,
            "location_name": project.location_name,
            "latitude": float(project.latitude) if project.latitude else None,
            "longitude": float(project.longitude) if project.longitude else None,
            "original_cost_cr": float(project.original_cost_cr or 0),
            "revised_cost_cr": float(project.revised_cost_cr or project.original_cost_cr or 0),
            "cumulative_expenditure_cr": float(project.cumulative_expenditure_cr or 0),
            "physical_progress_pct": float(project.physical_progress_pct or 0),
            "burn_rate_pct": float(project.burn_rate_pct or 0),
            "burn_progress_gap": float(project.burn_progress_gap or 0),
            "time_elapsed_ratio": float(project.time_elapsed_ratio or 0),
            "project_scale": project.project_scale,
            "original_start_date": str(project.original_start_date) if project.original_start_date else None,
            "scheduled_completion_date": str(project.scheduled_completion_date) if project.scheduled_completion_date else None,
            "revised_completion_date": str(project.revised_completion_date) if project.revised_completion_date else None,
        },
        "risk": {
            "risk_tier": pred.risk_tier if pred else None,
            "composite_risk_score": float(pred.composite_risk_score or 0) if pred else None,
            "delay_probability": float(pred.delay_probability or 0) if pred else None,
            "cost_overrun_probability": float(pred.cost_overrun_probability or 0) if pred else None,
            "delay_duration_months": float(pred.delay_duration_months or 0) if pred else None,
            "cost_overrun_amount_cr": float(pred.cost_overrun_amount_cr or 0) if pred else None,
            "shap_values": pred.shap_values if pred else [],
            "model_version": pred.model_version if pred else None,
            "predicted_at": pred.predicted_at.isoformat() if pred and pred.predicted_at else None,
        },
        "alerts": [
            {
                "id": str(a.id),
                "alert_type": a.alert_type,
                "message": a.message,
                "status": a.status,
                "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
            }
            for a in alerts
        ],
        "actions": [
            {
                "id": str(a.id),
                "title": a.title,
                "priority": a.priority,
                "status": a.status,
                "assigned_to": a.assigned_to,
                "due_date": a.due_date,
            }
            for a in actions
        ],
        "milestones": milestones,
    }


@router.get("/data-quality")
async def get_data_quality_report(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Data Quality Report: validates all projects for completeness and consistency.
    Detects: missing coordinates, invalid financial data, expenditure > revised cost,
    progress outside valid range, missing dates, suspicious financial/physical mismatch.
    """
    projects = db.query(Project).all()
    total = len(projects)

    issues = {
        "missing_coordinates": [],
        "missing_district": [],
        "missing_state": [],
        "invalid_expenditure": [],   # expenditure > revised_cost
        "invalid_progress": [],      # progress < 0 or > 100
        "missing_cost": [],
        "missing_start_date": [],
        "missing_completion_date": [],
        "financial_physical_mismatch": [],  # burn_rate >> physical_progress
        "negative_expenditure": [],
    }

    for p in projects:
        pid = str(p.id)
        name = p.project_name

        if not p.latitude or not p.longitude:
            issues["missing_coordinates"].append({"id": pid, "name": name})
        if not p.district:
            issues["missing_district"].append({"id": pid, "name": name})
        if not p.state:
            issues["missing_state"].append({"id": pid, "name": name})

        orig = float(p.original_cost_cr or 0)
        rev = float(p.revised_cost_cr or orig)
        exp = float(p.cumulative_expenditure_cr or 0)
        prog = float(p.physical_progress_pct or 0)

        if orig == 0:
            issues["missing_cost"].append({"id": pid, "name": name})
        if exp < 0:
            issues["negative_expenditure"].append({"id": pid, "name": name, "expenditure": exp})
        if rev > 0 and exp > rev * 1.05:  # 5% tolerance for rounding
            issues["invalid_expenditure"].append({"id": pid, "name": name, "exp": exp, "rev": rev})
        if prog < 0 or prog > 100:
            issues["invalid_progress"].append({"id": pid, "name": name, "progress": prog})
        if not p.original_start_date:
            issues["missing_start_date"].append({"id": pid, "name": name})
        if not p.scheduled_completion_date:
            issues["missing_completion_date"].append({"id": pid, "name": name})

        burn = float(p.burn_rate_pct or 0)
        gap = burn - prog
        if gap > 30 and prog < 70:
            issues["financial_physical_mismatch"].append({
                "id": pid, "name": name,
                "burn_rate": round(burn, 1), "physical_progress": round(prog, 1), "gap": round(gap, 1)
            })

    summary = {k: len(v) for k, v in issues.items()}
    total_issues = sum(summary.values())
    quality_score = round(max(0, 100 - (total_issues / max(total, 1)) * 5), 1)

    return {
        "generated_at": datetime.now().isoformat(),
        "total_projects": total,
        "total_issues": total_issues,
        "quality_score": quality_score,
        "summary": summary,
        "issues": issues,
    }
