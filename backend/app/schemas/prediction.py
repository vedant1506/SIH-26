from typing import Optional, List
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
    is_acknowledged: bool

    model_config = {"from_attributes": True}
