from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# =============================================
# PROJECT SCHEMAS
# =============================================

class ProjectBase(BaseModel):
    project_name: str
    ministry: str
    sector: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    original_cost_cr: float = Field(..., gt=0, description="Original cost in Crore INR")
    revised_cost_cr: Optional[float] = None
    cumulative_expenditure_cr: Optional[float] = None
    physical_progress_pct: Optional[float] = Field(None, ge=0, le=100)
    original_start_date: Optional[date] = None
    scheduled_completion_date: Optional[date] = None
    revised_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    project_scale: Optional[str] = None

    @field_validator("project_scale")
    @classmethod
    def validate_scale(cls, v):
        if v and v not in ("mega", "major", "other"):
            raise ValueError("project_scale must be 'mega', 'major', or 'other'")
        return v


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    """Partial update — all fields optional."""
    revised_cost_cr: Optional[float] = None
    cumulative_expenditure_cr: Optional[float] = None
    physical_progress_pct: Optional[float] = None
    revised_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None


class MilestoneOut(BaseModel):
    id: UUID
    milestone_name: str
    scheduled_date: Optional[date] = None
    actual_date: Optional[date] = None
    is_completed: bool

    model_config = {"from_attributes": True}


class ProjectOut(ProjectBase):
    id: UUID
    burn_rate_pct: Optional[float] = None
    burn_progress_gap: Optional[float] = None
    time_elapsed_ratio: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    milestones: List[MilestoneOut] = []

    model_config = {"from_attributes": True}


class ProjectListItem(BaseModel):
    """Lightweight project item for list views / risk matrix table / geospatial map."""
    id: UUID
    project_name: str
    ministry: str
    sector: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    original_cost_cr: float
    revised_cost_cr: Optional[float] = None
    cumulative_expenditure_cr: Optional[float] = None
    burn_rate_pct: Optional[float] = None
    time_elapsed_ratio: Optional[float] = None
    physical_progress_pct: Optional[float] = None
    project_scale: Optional[str] = None
    burn_progress_gap: Optional[float] = None
    # Latest risk prediction (if available)
    risk_tier: Optional[str] = None
    composite_risk_score: Optional[float] = None
    delay_probability: Optional[float] = None
    cost_overrun_probability: Optional[float] = None

    model_config = {"from_attributes": True}
