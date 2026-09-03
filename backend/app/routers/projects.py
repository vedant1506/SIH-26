from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from datetime import date, datetime
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.project import Project, RiskPrediction, Profile
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, ProjectListItem

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

    current_user: Profile = Depends(get_current_user),
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

    result = []
    for p, pred in rows:
        item = ProjectListItem(
            id=p.id,
            project_name=p.project_name,
            ministry=p.ministry,
            sector=p.sector,
            state=p.state,
            district=getattr(p, "district", None),
            location_name=getattr(p, "location_name", None),
            latitude=float(p.latitude) if p.latitude is not None else None,
            longitude=float(p.longitude) if p.longitude is not None else None,
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
        )
        result.append(item)

    return result


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
    current_user: Profile = Depends(get_current_user),
):
    """Create a new project. Admin only (demo: open to all)."""
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
    current_user: Profile = Depends(get_current_user),
):
    """Update project financial/progress fields."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    _compute_indicators(project)
    db.commit()
    db.refresh(project)
    return project


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
