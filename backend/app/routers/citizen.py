import math
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, or_

from app.core.database import get_db
from app.models.project import Project, CitizenGrievance, RiskPrediction, Milestone

router = APIRouter(prefix="/public", tags=["Public Citizen Portal"])


# ─────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────

class PublicProjectListItem(BaseModel):
    id: str
    project_id: Optional[str] = None
    project_name: str
    ministry: str
    sector: str
    agency: Optional[str] = None
    state: str
    district: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    original_cost_cr: float
    revised_cost_cr: Optional[float] = None
    cumulative_expenditure_cr: Optional[float] = None
    physical_progress_pct: Optional[float] = None
    scheduled_completion_date: Optional[str] = None
    revised_completion_date: Optional[str] = None
    approval_date_mm_yyyy: Optional[str] = None
    start_date_mm_yyyy: Optional[str] = None
    original_target_doc_mm_yyyy: Optional[str] = None
    revised_target_doc_mm_yyyy: Optional[str] = None
    pmgid: Optional[str] = None
    legacy_ocms_code: Optional[str] = None
    report_month: Optional[str] = "April 2026"
    source_pdf_page: Optional[int] = None
    sl_no: Optional[int] = None
    public_status: str  # "ON_SCHEDULE" | "ACTIVE_MONITORING" | "DELAYED"
    grievances_count: int = 0


class PublicMilestone(BaseModel):
    milestone_name: str
    scheduled_date: Optional[str] = None
    is_completed: bool


class PublicProjectDetail(PublicProjectListItem):
    burn_rate_pct: Optional[float] = None
    burn_progress_gap: Optional[float] = None
    time_elapsed_ratio: Optional[float] = None
    milestones: List[PublicMilestone] = []


class PaginationInfo(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PublicProjectsResponse(BaseModel):
    data: List[PublicProjectListItem]
    pagination: PaginationInfo
    counts_by_status: Dict[str, int] = {}


class FilterOptionsResponse(BaseModel):
    states: List[str]
    sectors: List[str]
    ministries: List[str]
    agencies: List[str]
    counts_by_status: Dict[str, int]
    total: int


class CitizenGrievanceCreate(BaseModel):
    project_id: str
    citizen_name: str = Field(..., min_length=2, max_length=120)
    citizen_phone: Optional[str] = Field(None, max_length=20)
    citizen_email: Optional[str] = Field(None, max_length=120)
    category: str = Field(..., description="Work Delay | Substandard Quality | Pollution/Hazard | Traffic Disruption | Corruption/Irregularity | Other")
    description: str = Field(..., min_length=10, max_length=2000)
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CitizenGrievanceOut(BaseModel):
    id: str
    project_id: str
    project_name: Optional[str] = None
    reference_id: str
    citizen_name: str
    citizen_phone: Optional[str] = None
    citizen_email: Optional[str] = None
    category: str
    description: str
    pincode: Optional[str] = None
    status: str
    action_taken: Optional[str] = None
    created_at: str
    updated_at: str


# ─────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────

def derive_public_status(p: Project, pred: Optional[RiskPrediction] = None) -> str:
    """Sanitizes sensitive internal ML indicators into a transparent citizen-friendly status."""
    if p.public_status:
        return p.public_status
    tier = (pred.risk_tier or "").lower() if pred else ""
    gap = float(p.burn_progress_gap or 0) if p.burn_progress_gap else 0.0
    prog = float(p.physical_progress_pct or 0) if p.physical_progress_pct else 0.0

    if tier in ["critical", "high"] or gap > 25.0:
        return "DELAYED"
    elif tier == "medium" or (prog > 0 and prog < 50 and gap > 10.0):
        return "ACTIVE_MONITORING"
    else:
        return "ON_SCHEDULE"


def map_project_to_list_item(proj: Project, grievance_count: int = 0) -> PublicProjectListItem:
    return PublicProjectListItem(
        id=str(proj.id),
        project_id=proj.project_id,
        project_name=proj.project_name,
        ministry=proj.ministry,
        sector=proj.sector,
        agency=proj.agency,
        state=proj.state,
        district=proj.district,
        location_name=proj.location_name,
        latitude=float(proj.latitude) if proj.latitude is not None else None,
        longitude=float(proj.longitude) if proj.longitude is not None else None,
        original_cost_cr=float(proj.original_cost_cr or 0),
        revised_cost_cr=float(proj.revised_cost_cr) if proj.revised_cost_cr is not None else None,
        cumulative_expenditure_cr=float(proj.cumulative_expenditure_cr) if proj.cumulative_expenditure_cr is not None else None,
        physical_progress_pct=float(proj.physical_progress_pct) if proj.physical_progress_pct is not None else None,
        scheduled_completion_date=str(proj.scheduled_completion_date) if proj.scheduled_completion_date else None,
        revised_completion_date=str(proj.revised_completion_date) if proj.revised_completion_date else None,
        approval_date_mm_yyyy=proj.approval_date_mm_yyyy,
        start_date_mm_yyyy=proj.start_date_mm_yyyy,
        original_target_doc_mm_yyyy=proj.original_target_doc_mm_yyyy,
        revised_target_doc_mm_yyyy=proj.revised_target_doc_mm_yyyy,
        pmgid=proj.pmgid,
        legacy_ocms_code=proj.legacy_ocms_code,
        report_month=proj.report_month or "April 2026",
        source_pdf_page=proj.source_pdf_page,
        sl_no=proj.sl_no,
        public_status=proj.public_status or "ON_SCHEDULE",
        grievances_count=grievance_count,
    )


# ─────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────

@router.get("/filter-options", response_model=FilterOptionsResponse)
def get_public_filter_options(db: Session = Depends(get_db)):
    """Returns distinct filter dropdown values and total counts across the authoritative April 2026 dataset."""
    states = [r[0] for r in db.query(Project.state).distinct().order_by(Project.state).all() if r[0]]
    sectors = [r[0] for r in db.query(Project.sector).distinct().order_by(Project.sector).all() if r[0]]
    ministries = [r[0] for r in db.query(Project.ministry).distinct().order_by(Project.ministry).all() if r[0]]
    agencies = [r[0] for r in db.query(Project.agency).distinct().order_by(Project.agency).all() if r[0]]

    status_counts_rows = db.query(Project.public_status, func.count(Project.id)).group_by(Project.public_status).all()
    counts_by_status = {r[0]: r[1] for r in status_counts_rows if r[0]}
    for s in ["ON_SCHEDULE", "ACTIVE_MONITORING", "DELAYED"]:
        counts_by_status.setdefault(s, 0)
    
    total = db.query(func.count(Project.id)).scalar() or 0
    counts_by_status["ALL"] = total

    return FilterOptionsResponse(
        states=states,
        sectors=sectors,
        ministries=ministries,
        agencies=agencies,
        counts_by_status=counts_by_status,
        total=total,
    )


@router.get("/projects", response_model=PublicProjectsResponse)
def list_public_projects(
    search: Optional[str] = Query(None, description="Search across name, ministry, sector, state, district, agency, project_id, pmgid, ocms"),
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district"),
    sector: Optional[str] = Query(None, description="Filter by sector"),
    ministry: Optional[str] = Query(None, description="Filter by ministry"),
    agency: Optional[str] = Query(None, description="Filter by agency"),
    status: Optional[str] = Query(None, description="Filter by status: ON_SCHEDULE | ACTIVE_MONITORING | DELAYED"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=2000),
    skip: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=2000),
    sort: str = Query("revised_cost_cr", description="Sort field: revised_cost_cr | physical_progress_pct | project_name | project_id | revised_target_doc_mm_yyyy"),
    order: str = Query("desc", description="Sort direction: asc | desc"),
    db: Session = Depends(get_db),
):
    """
    Public unauthenticated endpoint for citizens to discover infrastructure projects from the authoritative April 2026 dataset.
    Returns server-paginated project registry with total count, pagination metadata, and status distribution.
    """
    # Backwards compatibility for skip/limit
    if limit is not None and page_size == 24:
        page_size = limit
    if skip is not None and page == 1 and skip > 0:
        page = (skip // page_size) + 1

    query = db.query(Project)

    # Multi-term full-text search
    if search and search.strip():
        terms = search.strip().split()
        for t in terms:
            term = f"%{t}%"
            query = query.filter(
                or_(
                    Project.project_name.ilike(term),
                    Project.project_id.ilike(term),
                    Project.pmgid.ilike(term),
                    Project.legacy_ocms_code.ilike(term),
                    Project.agency.ilike(term),
                    Project.ministry.ilike(term),
                    Project.sector.ilike(term),
                    Project.state.ilike(term),
                    Project.district.ilike(term),
                )
            )

    # Categorical filters
    if state and state.strip():
        query = query.filter(Project.state.ilike(f"%{state.strip()}%"))

    if district and district.strip():
        query = query.filter(Project.district.ilike(f"%{district.strip()}%"))

    if sector and sector.strip():
        query = query.filter(Project.sector.ilike(f"%{sector.strip()}%"))

    if ministry and ministry.strip():
        query = query.filter(Project.ministry.ilike(f"%{ministry.strip()}%"))

    if agency and agency.strip():
        query = query.filter(Project.agency.ilike(f"%{agency.strip()}%"))

    # Compute status breakdown for the current search/category filters (prior to applying status filter itself)
    counts_query = query
    status_counts_rows = counts_query.with_entities(Project.public_status, func.count(Project.id)).group_by(Project.public_status).all()
    counts_by_status = {r[0]: r[1] for r in status_counts_rows if r[0]}
    for s in ["ON_SCHEDULE", "ACTIVE_MONITORING", "DELAYED"]:
        counts_by_status.setdefault(s, 0)
    counts_by_status["ALL"] = sum(counts_by_status.get(s, 0) for s in ["ON_SCHEDULE", "ACTIVE_MONITORING", "DELAYED"])

    # Apply status filter if provided
    if status and status.strip() and status.upper() != "ALL":
        query = query.filter(Project.public_status == status.strip().upper())

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    if page > total_pages and total > 0:
        page = total_pages

    # Sorting
    is_desc = order.lower() == "desc"
    if sort in ("physical_progress_pct", "progress"):
        sort_col = Project.physical_progress_pct
        query = query.order_by(sort_col.desc() if is_desc else sort_col.asc())
    elif sort in ("project_name", "name"):
        sort_col = Project.project_name
        query = query.order_by(sort_col.desc() if is_desc else sort_col.asc())
    elif sort in ("project_id", "id"):
        sort_col = Project.project_id
        query = query.order_by(sort_col.desc() if is_desc else sort_col.asc())
    elif sort in ("revised_target_doc_mm_yyyy", "target_date"):
        sort_col = Project.revised_target_doc_mm_yyyy
        query = query.order_by(sort_col.desc() if is_desc else sort_col.asc())
    else:  # default revised_cost_cr / cost
        sort_col = func.coalesce(Project.revised_cost_cr, Project.original_cost_cr)
        query = query.order_by(sort_col.desc() if is_desc else sort_col.asc())

    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    # Pre-fetch grievance counts for page items
    project_uuids = [r.id for r in rows]
    grievance_counts = {}
    if project_uuids:
        counts = (
            db.query(CitizenGrievance.project_id, func.count(CitizenGrievance.id))
            .filter(CitizenGrievance.project_id.in_(project_uuids))
            .group_by(CitizenGrievance.project_id)
            .all()
        )
        grievance_counts = {str(pid): cnt for pid, cnt in counts}

    items = [map_project_to_list_item(proj, grievance_counts.get(str(proj.id), 0)) for proj in rows]

    return PublicProjectsResponse(
        data=items,
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        ),
        counts_by_status=counts_by_status,
    )


@router.get("/projects/{identifier}", response_model=PublicProjectDetail)
def get_public_project_detail(identifier: str, db: Session = Depends(get_db)):
    """
    Detailed public transparency view of a specific project.
    Accepts either numeric project_id (e.g. 612786) or database UUID.
    """
    ident = identifier.strip()
    # 1. Try project_id lookup
    proj = db.query(Project).filter(Project.project_id == ident).first()
    
    # 2. Try UUID lookup
    if not proj:
        try:
            val = uuid.UUID(ident)
            proj = db.query(Project).filter(Project.id == val).first()
        except (ValueError, TypeError):
            pass

    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{identifier}' not found in authoritative registry")

    milestones_db = db.query(Milestone).filter(Milestone.project_id == proj.id).all()
    milestones = [
        PublicMilestone(
            milestone_name=m.milestone_name,
            scheduled_date=str(m.scheduled_date) if m.scheduled_date else None,
            is_completed=bool(m.is_completed),
        )
        for m in milestones_db
    ]

    grv_count = (
        db.query(func.count(CitizenGrievance.id))
        .filter(CitizenGrievance.project_id == proj.id)
        .scalar()
        or 0
    )

    return PublicProjectDetail(
        id=str(proj.id),
        project_id=proj.project_id,
        project_name=proj.project_name,
        ministry=proj.ministry,
        sector=proj.sector,
        agency=proj.agency,
        state=proj.state,
        district=proj.district,
        location_name=proj.location_name,
        latitude=float(proj.latitude) if proj.latitude is not None else None,
        longitude=float(proj.longitude) if proj.longitude is not None else None,
        original_cost_cr=float(proj.original_cost_cr or 0),
        revised_cost_cr=float(proj.revised_cost_cr) if proj.revised_cost_cr is not None else None,
        cumulative_expenditure_cr=float(proj.cumulative_expenditure_cr) if proj.cumulative_expenditure_cr is not None else None,
        physical_progress_pct=float(proj.physical_progress_pct) if proj.physical_progress_pct is not None else None,
        burn_rate_pct=float(proj.burn_rate_pct) if proj.burn_rate_pct is not None else None,
        burn_progress_gap=float(proj.burn_progress_gap) if proj.burn_progress_gap is not None else None,
        time_elapsed_ratio=float(proj.time_elapsed_ratio) if proj.time_elapsed_ratio is not None else None,
        scheduled_completion_date=str(proj.scheduled_completion_date) if proj.scheduled_completion_date else None,
        revised_completion_date=str(proj.revised_completion_date) if proj.revised_completion_date else None,
        approval_date_mm_yyyy=proj.approval_date_mm_yyyy,
        start_date_mm_yyyy=proj.start_date_mm_yyyy,
        original_target_doc_mm_yyyy=proj.original_target_doc_mm_yyyy,
        revised_target_doc_mm_yyyy=proj.revised_target_doc_mm_yyyy,
        pmgid=proj.pmgid,
        legacy_ocms_code=proj.legacy_ocms_code,
        report_month=proj.report_month or "April 2026",
        source_pdf_page=proj.source_pdf_page,
        sl_no=proj.sl_no,
        public_status=proj.public_status or "ON_SCHEDULE",
        grievances_count=grv_count,
        milestones=milestones,
    )


@router.post("/grievances", response_model=CitizenGrievanceOut, status_code=status.HTTP_201_CREATED)
def submit_citizen_grievance(payload: CitizenGrievanceCreate, db: Session = Depends(get_db)):
    """
    Submit a citizen feedback or grievance report for any public infrastructure project.
    Generates a unique tracking reference code (e.g. GRV-2026-XXXXX).
    Supports either project UUID or project_id in payload.project_id.
    """
    proj = db.query(Project).filter(Project.project_id == payload.project_id).first()
    if not proj:
        try:
            val = uuid.UUID(payload.project_id)
            proj = db.query(Project).filter(Project.id == val).first()
        except (ValueError, TypeError):
            pass

    if not proj:
        raise HTTPException(status_code=404, detail="Selected project does not exist")

    total_grvs = db.query(func.count(CitizenGrievance.id)).scalar() or 0
    ref_id = f"GRV-2026-{10001 + total_grvs}"

    while db.query(CitizenGrievance).filter(CitizenGrievance.reference_id == ref_id).first():
        total_grvs += 1
        ref_id = f"GRV-2026-{10001 + total_grvs}"

    grv = CitizenGrievance(
        id=uuid.uuid4(),
        project_id=proj.id,
        reference_id=ref_id,
        citizen_name=payload.citizen_name.strip(),
        citizen_phone=payload.citizen_phone.strip() if payload.citizen_phone else None,
        citizen_email=payload.citizen_email.strip() if payload.citizen_email else None,
        category=payload.category,
        description=payload.description.strip(),
        pincode=payload.pincode.strip() if payload.pincode else None,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="SUBMITTED",
        action_taken=None,
    )
    db.add(grv)
    db.commit()
    db.refresh(grv)

    return CitizenGrievanceOut(
        id=str(grv.id),
        project_id=str(grv.project_id),
        project_name=proj.project_name,
        reference_id=grv.reference_id,
        citizen_name=grv.citizen_name,
        citizen_phone=grv.citizen_phone,
        citizen_email=grv.citizen_email,
        category=grv.category,
        description=grv.description,
        pincode=grv.pincode,
        status=grv.status,
        action_taken=grv.action_taken,
        created_at=grv.created_at.isoformat() if grv.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=grv.updated_at.isoformat() if grv.updated_at else datetime.now(timezone.utc).isoformat(),
    )


@router.get("/grievances/{reference_id}", response_model=CitizenGrievanceOut)
def track_citizen_grievance(reference_id: str, db: Session = Depends(get_db)):
    """Track the status and resolution notes of a citizen grievance using the reference ID."""
    ref_clean = reference_id.strip().upper()
    grv = db.query(CitizenGrievance).filter(func.upper(CitizenGrievance.reference_id) == ref_clean).first()
    if not grv:
        raise HTTPException(status_code=404, detail=f"Grievance reference '{reference_id}' not found")

    proj = db.query(Project).filter(Project.id == grv.project_id).first()
    project_name = proj.project_name if proj else "Unknown Project"

    return CitizenGrievanceOut(
        id=str(grv.id),
        project_id=str(grv.project_id),
        project_name=project_name,
        reference_id=grv.reference_id,
        citizen_name=grv.citizen_name,
        citizen_phone=grv.citizen_phone,
        citizen_email=grv.citizen_email,
        category=grv.category,
        description=grv.description,
        pincode=grv.pincode,
        status=grv.status,
        action_taken=grv.action_taken,
        created_at=grv.created_at.isoformat() if grv.created_at else "",
        updated_at=grv.updated_at.isoformat() if grv.updated_at else "",
    )
