from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from datetime import date, datetime
from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user, require_role, require_roles
from app.models.project import Project, RiskPrediction, Profile, Milestone, ProjectMonthlySnapshot
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, ProjectListItem
from app.schemas.prediction import PortfolioSummary

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectListItem])
async def list_projects(
    search: Optional[str] = Query(None, description="Search across project name, ministry, sector, or state"),
    ministry: Optional[str] = Query(None, description="Filter by ministry name"),
    sector: Optional[str] = Query(None, description="Filter by sector (Roads, Railways, etc.)"),
    state: Optional[str] = Query(None, description="Filter by state"),
    risk_tier: Optional[str] = Query(None, description="Filter by risk tier: low, medium, high, critical"),
    project_scale: Optional[str] = Query(None, description="Filter by scale: mega, major, other"),
    delayed: Optional[str] = Query(None, description="Filter for delayed projects (true/1/yes)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=2000),
    db: Session = Depends(get_db),

    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    Returns the project list with latest risk predictions.
    Supports search and filtering by ministry, sector, state, risk tier, project scale, and delayed status.
    Used by the Risk Matrix Table on the main dashboard.
    """
    from sqlalchemy import func

    latest_pred_subq = (
        db.query(
            RiskPrediction.project_id,
            func.max(RiskPrediction.predicted_at).label("max_pred_at"),
        )
        .group_by(RiskPrediction.project_id)
        .subquery()
    )

    query = (
        db.query(Project, RiskPrediction)
        .outerjoin(latest_pred_subq, Project.id == latest_pred_subq.c.project_id)
        .outerjoin(
            RiskPrediction,
            (RiskPrediction.project_id == latest_pred_subq.c.project_id)
            & (RiskPrediction.predicted_at == latest_pred_subq.c.max_pred_at),
        )
    )

    if search and search.strip():
        tokens = [t.strip() for t in search.strip().split() if len(t.strip()) > 1]
        if tokens:
            for t in tokens:
                term = f"%{t}%"
                query = query.filter(
                    (Project.project_name.ilike(term))
                    | (Project.ministry.ilike(term))
                    | (Project.sector.ilike(term))
                    | (Project.state.ilike(term))
                )
        else:
            term = f"%{search.strip()}%"
            query = query.filter(
                (Project.project_name.ilike(term))
                | (Project.ministry.ilike(term))
                | (Project.sector.ilike(term))
                | (Project.state.ilike(term))
            )
    if ministry:
        query = query.filter(Project.ministry.ilike(f"%{ministry}%"))
    if sector:
        query = query.filter(Project.sector.ilike(f"%{sector}%"))
    if state:
        query = query.filter(Project.state.ilike(f"%{state}%"))
    if project_scale:
        query = query.filter(Project.project_scale == project_scale)
    if risk_tier:
        query = query.filter(RiskPrediction.risk_tier == risk_tier.lower())
    if delayed and str(delayed).lower() in ("true", "1", "yes"):
        query = query.filter(RiskPrediction.delay_probability > 0.5)

    rows = query.offset(skip).limit(limit).all()

    # Build geo lookup from project_geolocations keyed by project_name (exact match)
    from sqlalchemy import text as sql_text
    geo_rows = db.execute(sql_text("""
        SELECT project_id, project_name, district, place, location_name,
               latitude, longitude, coordinate_status, coordinate_source,
               location_resolution_level, geocoding_confidence,
               state_match, district_match, validation_status, category
        FROM project_geolocations
    """)).fetchall()

    geo_lookup: dict = {}
    for gr in geo_rows:
        key = (gr[1] or "").strip().lower()  # project_name lowercase
        geo_lookup[key] = {
            "paimana_project_id": gr[0],
            "district": gr[2],
            "place": gr[3],
            "location_name": gr[4],
            "latitude": float(gr[5]) if gr[5] is not None else None,
            "longitude": float(gr[6]) if gr[6] is not None else None,
            "coordinate_status": gr[7],
            "coordinate_source": gr[8],
            "location_resolution_level": gr[9],
            "geocoding_confidence": (
                float(gr[10]) if gr[10] is not None and str(gr[10]).replace('.', '', 1).isdigit()
                else ({"high": 0.95, "medium": 0.75, "low": 0.50}.get(str(gr[10]).lower(), 0.90) if gr[10] is not None else None)
            ),
            "state_match": bool(gr[11]) if gr[11] is not None else None,
            "district_match": bool(gr[12]) if gr[12] is not None else None,
            "location_validated": gr[13] == "VALIDATED" if gr[13] else None,
            "category": gr[14],
        }

    result = []
    for p, pred in rows:
        # Derive report_month dynamically from latest prediction timestamp, strictly defaulting to April 2026
        if pred and pred.predicted_at:
            report_month = pred.predicted_at.strftime("%B %Y")
        else:
            report_month = "April 2026"

        # Look up geo data for this project
        geo = geo_lookup.get((p.project_name or "").strip().lower(), {})

        item = ProjectListItem(
            id=p.id,
            project_name=p.project_name,
            ministry=p.ministry,
            sector=p.sector,
            state=p.state,
            district=geo.get("district") or getattr(p, "district", None),
            location_name=geo.get("location_name") or getattr(p, "location_name", None),
            place=geo.get("place"),
            category=geo.get("category") or p.sector,
            latitude=geo.get("latitude") if geo.get("latitude") is not None else (float(p.latitude) if p.latitude is not None else None),
            longitude=geo.get("longitude") if geo.get("longitude") is not None else (float(p.longitude) if p.longitude is not None else None),
            original_cost_cr=p.original_cost_cr,
            revised_cost_cr=p.revised_cost_cr,
            cumulative_expenditure_cr=p.cumulative_expenditure_cr,
            burn_rate_pct=p.burn_rate_pct,
            time_elapsed_ratio=p.time_elapsed_ratio,
            physical_progress_pct=p.physical_progress_pct,
            project_scale=p.project_scale,
            burn_progress_gap=p.burn_progress_gap,
            risk_tier=pred.risk_tier if pred else None,
            composite_risk_score=pred.composite_risk_score if pred else None,
            delay_probability=pred.delay_probability if pred else None,
            cost_overrun_probability=pred.cost_overrun_probability if pred else None,
            report_month=report_month,
            paimana_project_id=geo.get("paimana_project_id"),
            coordinate_status=geo.get("coordinate_status"),
            coordinate_source=geo.get("coordinate_source"),
            location_resolution_level=geo.get("location_resolution_level"),
            geocoding_confidence=geo.get("geocoding_confidence"),
            state_match=geo.get("state_match"),
            district_match=geo.get("district_match"),
            location_validated=geo.get("location_validated"),
        )
        result.append(item)

    return result



@router.get("/analytics/portfolio", response_model=PortfolioSummary)
async def get_portfolio_summary_projects_alias(
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    Direct alias for /projects/analytics/portfolio to ensure frontend getPortfolioSummary()
    always succeeds with official April 2026 aggregated KPIs.
    """
    from app.routers.predictions import get_portfolio_summary
    return await get_portfolio_summary(db=db, current_user=current_user)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Returns full project details including milestones strictly matching the requested project."""
    import re
    from sqlalchemy import text
    project = None

    # 1. Try querying by direct UUID match
    try:
        uid = UUID(str(project_id))
        project = (
            db.query(Project)
            .options(joinedload(Project.milestones))
            .filter(Project.id == uid)
            .first()
        )
    except (ValueError, TypeError):
        pass

    # 2. Check if project_id is an OCMS / PAIMANA numeric ID in project_geolocations
    if not project:
        clean_id = str(project_id).strip()
        try:
            row = db.execute(
                text("SELECT project_name FROM project_geolocations WHERE project_id = :pid"),
                {"pid": clean_id}
            ).fetchone()
            if row and row[0]:
                project = (
                    db.query(Project)
                    .options(joinedload(Project.milestones))
                    .filter(Project.project_name == row[0])
                    .first()
                )
        except Exception:
            pass

    # 3. Search by exact or case-insensitive project name
    if not project:
        clean_id = str(project_id).strip()
        project = (
            db.query(Project)
            .options(joinedload(Project.milestones))
            .filter(Project.project_name.ilike(clean_id))
            .first()
        )

    # 4. Search by numeric substring only if specific
    if not project:
        digits = re.findall(r"\d+", str(project_id))
        for d in digits:
            if len(d) >= 4:
                project = (
                    db.query(Project)
                    .options(joinedload(Project.milestones))
                    .filter(Project.project_name.ilike(f"%{d}%"))
                    .first()
                )
                if project:
                    break

    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    return project


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_roles(["admin"])),
):
    """Create a new project. Admin only."""
    project = Project(**payload.model_dump())

    # Auto-classify project scale based on cost
    if project.original_cost_cr >= 1000:
        project.project_scale = "mega"
    elif project.original_cost_cr >= 150:
        project.project_scale = "major"
    else:
        project.project_scale = "other"

    # Compute derived risk indicators
    _compute_indicators(project)

    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_roles(["admin", "monitoring_officer"])),
):
    """Update project financial/progress fields. Admin and Monitoring Officer only."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    _compute_indicators(project)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_roles(["admin"])),
):
    """Permanently delete a project. Admin only."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()


def _compute_indicators(project: Project) -> None:
    """
    Compute derived risk indicator fields in-place on the project ORM object.
    Called on create and update to keep indicators fresh.
    """
    cost = project.revised_cost_cr or project.original_cost_cr or 1.0
    expenditure = project.cumulative_expenditure_cr or 0.0
    progress = project.physical_progress_pct or 0.0

    project.burn_rate_pct = round((expenditure / cost) * 100, 2)
    project.burn_progress_gap = round(project.burn_rate_pct - progress, 2)

    if project.original_start_date and project.scheduled_completion_date:
        total_days = (project.scheduled_completion_date - project.original_start_date).days
        if total_days > 0:
            elapsed_days = (date.today() - project.original_start_date).days
            project.time_elapsed_ratio = round(min(elapsed_days / total_days, 1.0), 4)


@router.get("/{project_id}/history")
async def get_project_history(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Returns the monthly prediction history for a project.
    Used by the Project History tab and risk trend charts.
    Each entry shows a monthly snapshot of risk, financial, and progress data.
    """
    project = None
    try:
        uid = UUID(project_id)
        project = db.query(Project).filter(Project.id == uid).first()
    except (ValueError, TypeError):
        pass

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all predictions for this project ordered by date
    predictions = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.project_id == project.id)
        .order_by(RiskPrediction.predicted_at)
        .all()
    )

    # Get monthly snapshots if any
    snapshots = (
        db.query(ProjectMonthlySnapshot)
        .filter(ProjectMonthlySnapshot.project_id == project.id)
        .order_by(ProjectMonthlySnapshot.report_month)
        .all()
    )

    history = [
        {
            "report_month": pred.predicted_at.strftime("%B %Y") if pred.predicted_at else "Unknown",
            "report_month_key": pred.predicted_at.strftime("%Y-%m") if pred.predicted_at else None,
            "predicted_at": pred.predicted_at.isoformat() if pred.predicted_at else None,
            "risk_tier": pred.risk_tier,
            "composite_risk_score": float(pred.composite_risk_score or 0),
            "delay_probability": float(pred.delay_probability or 0),
            "cost_overrun_probability": float(pred.cost_overrun_probability or 0),
            "delay_duration_months": float(pred.delay_duration_months or 0),
            "cost_overrun_amount_cr": float(pred.cost_overrun_amount_cr or 0),
            "shap_values": pred.shap_values or [],
            "model_version": pred.model_version,
        }
        for pred in predictions
    ]

    snapshot_history = [
        {
            "report_month": s.report_month,
            "original_cost_cr": float(s.original_cost_cr or 0),
            "revised_cost_cr": float(s.revised_cost_cr or 0),
            "cumulative_expenditure_cr": float(s.cumulative_expenditure_cr or 0),
            "physical_progress_pct": float(s.physical_progress_pct or 0),
            "burn_rate_pct": float(s.burn_rate_pct or 0),
            "burn_progress_gap": float(s.burn_progress_gap or 0),
            "risk_tier": s.risk_tier,
            "composite_risk_score": float(s.composite_risk_score or 0),
        }
        for s in snapshots
    ]

    return {
        "project_id": str(project.id),
        "project_name": project.project_name,
        "prediction_history": history,
        "snapshot_history": snapshot_history,
        "total_months": len(history),
    }


@router.get("/{project_id}/milestones")
async def get_project_milestones(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Returns milestone data for a project.
    Milestones include planned/actual dates and completion status.
    """
    project = None
    try:
        uid = UUID(project_id)
        project = db.query(Project).filter(Project.id == uid).first()
    except (ValueError, TypeError):
        pass

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    milestones = (
        db.query(Milestone)
        .filter(Milestone.project_id == project.id)
        .order_by(Milestone.scheduled_date)
        .all()
    )

    today = date.today()
    result = []
    for m in milestones:
        status = "COMPLETED" if m.is_completed else (
            "OVERDUE" if m.scheduled_date and m.scheduled_date < today else
            "IN_PROGRESS" if m.scheduled_date and (today - m.scheduled_date).days > -30 else
            "NOT_STARTED"
        )
        delay_days = None
        if m.scheduled_date and not m.is_completed and m.scheduled_date < today:
            delay_days = (today - m.scheduled_date).days

        result.append({
            "id": str(m.id),
            "milestone_name": m.milestone_name,
            "scheduled_date": str(m.scheduled_date) if m.scheduled_date else None,
            "actual_date": str(m.actual_date) if m.actual_date else None,
            "is_completed": m.is_completed,
            "status": status,
            "delay_days": delay_days,
        })

    return {
        "project_id": str(project.id),
        "project_name": project.project_name,
        "milestones": result,
        "total": len(result),
        "completed": sum(1 for m in result if m["is_completed"]),
        "overdue": sum(1 for m in result if m["status"] == "OVERDUE"),
    }
