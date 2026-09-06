from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class SHAPValue(BaseModel):
    """A single SHAP feature explanation."""
    feature: str                    # e.g., "burn_progress_gap"
    value: float                    # SHAP value magnitude
    direction: str                  # "positive" (increases risk) or "negative" (reduces risk)
    label: str                      # Human-readable explanation, e.g., "Budget spent 35% faster than physical progress"
    feature_value: Optional[float] = None  # Actual feature value for this project


class RiskPredictionOut(BaseModel):
    """Full prediction response returned by POST /projects/{id}/predict"""
    id: UUID
    project_id: UUID
    predicted_at: datetime

    # Delay model
    delay_probability: float = Field(..., ge=0, le=1)
    delay_duration_months: float

    # Cost overrun model
    cost_overrun_probability: float = Field(..., ge=0, le=1)
    cost_overrun_amount_cr: float

    # Composite risk
    composite_risk_score: float = Field(..., ge=0, le=1)
    risk_tier: str                  # low, medium, high, critical

    # SHAP explanations (top N drivers)
    shap_values: List[SHAPValue]
    ai_risk_narrative: Optional[str] = None

    model_version: str

    model_config = {"from_attributes": True}



class PredictRequest(BaseModel):
    """Optional: override feature values for What-If simulation."""
    revised_cost_cr: Optional[float] = None
    cumulative_expenditure_cr: Optional[float] = None
    physical_progress_pct: Optional[float] = None
    revised_completion_date: Optional[str] = None  # ISO date string


class PortfolioSummary(BaseModel):
    """Aggregated KPIs for the Decision Maker command center."""
    total_projects: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    total_exposure_cr: float        # Sum of revised costs for High+Critical projects
    total_delayed_count: int
    avg_delay_duration_months: float


class AlertOut(BaseModel):
    """Alert response schema."""
    id: UUID
    project_id: UUID
    project_name: str
    triggered_at: datetime
    alert_type: str
    previous_tier: Optional[str] = None
    new_tier: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = "NEW"
    is_acknowledged: bool
    acknowledged_by: Optional[UUID] = None
    acknowledged_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AlertStatusUpdate(BaseModel):
    """Schema for updating alert lifecycle status."""
    status: str   # NEW | ACKNOWLEDGED | UNDER_REVIEW | ACTION_ASSIGNED | RESOLVED


class ActionItemCreate(BaseModel):
    """Payload to create a new action item."""
    project_id: Optional[UUID] = None
    alert_id: Optional[UUID] = None
    risk_id: Optional[UUID] = None
    mitigation_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_officer_id: Optional[UUID] = None
    due_date: Optional[str] = None
    priority: Optional[str] = "medium"    # critical | high | medium | low
    status: Optional[str] = "pending"     # pending | assigned | in_progress | completed
    approval_status: Optional[str] = "not_required"
    root_cause: Optional[str] = None
    recommended_action: Optional[str] = None
    expected_outcome: Optional[str] = None
    source_type: Optional[str] = "MANUAL" # MANUAL | EARLY_WARNING | RISK_ENGINE | LLM_RECOMMENDATION | SYSTEM
    source_reference: Optional[str] = None


class ActionItemUpdate(BaseModel):
    """Payload to update an existing action item."""
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_officer_id: Optional[UUID] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    approval_status: Optional[str] = None
    completion_percentage: Optional[int] = None
    root_cause: Optional[str] = None
    recommended_action: Optional[str] = None
    expected_outcome: Optional[str] = None
    actual_outcome: Optional[str] = None
    verification_notes: Optional[str] = None
    evidence_url: Optional[str] = None
    response_notes: Optional[str] = None


class ActionApprovalRequest(BaseModel):
    """Payload for approving or rejecting an action item."""
    notes: Optional[str] = None


class ActionAssignRequest(BaseModel):
    """Payload for assigning an officer to an intervention action."""
    officer_id: UUID
    officer_name: Optional[str] = None
    notes: Optional[str] = None


class ActionTransitionRequest(BaseModel):
    """Payload for executing a strict lifecycle transition."""
    new_status: str
    comment: Optional[str] = None
    completion_percentage: Optional[int] = None


class ActionCompleteRequest(BaseModel):
    """Payload for submitting completion information."""
    completion_notes: str
    actual_outcome: Optional[str] = None
    evidence_url: Optional[str] = None


class ActionVerifyRequest(BaseModel):
    """Payload for verifying and closing or rejecting an action item."""
    is_approved: bool
    verification_notes: str


class ActionCommentCreate(BaseModel):
    """Payload for adding a stakeholder comment to an action."""
    message: str


class ActionCommentOut(BaseModel):
    """Comment record response schema."""
    id: UUID
    action_id: UUID
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    message: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ActionHistoryOut(BaseModel):
    """Audit history event response schema."""
    id: UUID
    action_id: UUID
    changed_by_id: Optional[str] = None
    changed_by_name: Optional[str] = None
    changed_by_role: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    previous_assignee: Optional[str] = None
    new_assignee: Optional[str] = None
    previous_priority: Optional[str] = None
    new_priority: Optional[str] = None
    comment: Optional[str] = None
    event_type: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class OfficerProfileOut(BaseModel):
    """Profile of an authentic officer available for intervention assignment."""
    id: UUID
    full_name: Optional[str] = None
    email: str
    role: str
    designation: Optional[str] = None
    department_or_ministry: Optional[str] = None
    active_actions_count: int = 0

    model_config = {"from_attributes": True}


class OfficerRecommendationOut(BaseModel):
    """Smart assignment recommendation result."""
    officer: OfficerProfileOut
    match_reason: str
    relevance_score: float


class ActionSummaryOut(BaseModel):
    """Database-calculated aggregated summary metrics."""
    total: int
    pending: int
    assigned: int
    in_progress: int
    completed: int
    verified: int
    overdue: int
    critical: int
    high: int
    medium: int
    low: int


class ActionItemOut(BaseModel):
    """Action item comprehensive response schema."""
    id: UUID
    action_number: Optional[str] = None
    project_id: Optional[UUID] = None
    project_name: Optional[str] = None
    project_ministry: Optional[str] = None
    project_sector: Optional[str] = None
    project_state: Optional[str] = None
    project_cost_cr: Optional[float] = None
    project_progress_pct: Optional[float] = None
    alert_id: Optional[UUID] = None
    risk_id: Optional[UUID] = None
    mitigation_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_officer_id: Optional[UUID] = None
    due_date: Optional[str] = None
    priority: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    completion_percentage: int = 0
    root_cause: Optional[str] = None
    recommended_action: Optional[str] = None
    expected_outcome: Optional[str] = None
    actual_outcome: Optional[str] = None
    verification_notes: Optional[str] = None
    source_type: Optional[str] = "MANUAL"
    source_reference: Optional[str] = None
    last_updated_by: Optional[str] = None
    deadline_status: str = "ON_TRACK" # OVERDUE | DUE_TODAY | DUE_SOON | ON_TRACK
    approval_status: Optional[str] = "not_required"
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    evidence_url: Optional[str] = None
    response_notes: Optional[str] = None
    risk_score: Optional[float] = None
    risk_tier: Optional[str] = None
    shap_factors: Optional[List[Dict[str, Any]]] = None
    comments_count: int = 0
    history_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ActionAiRecommendationRequest(BaseModel):
    """Payload to generate AI recommendation for an intervention."""
    project_id: UUID
    alert_id: Optional[UUID] = None
    risk_context: Optional[str] = None


class ActionAiRecommendationOut(BaseModel):
    """Structured AI intervention recommendation output."""
    title: str
    root_cause: str
    recommended_action: str
    expected_outcome: str
    suggested_priority: str
    suggested_officer_id: Optional[UUID] = None
    suggested_officer_name: Optional[str] = None
    shap_factors: List[Dict[str, Any]] = []
    disclaimer: str = "AI Recommendation — Official Decision & Human Approval Required"


