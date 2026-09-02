from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class ProjectSummarySchema(BaseModel):
    project_name: str
    project_id: str
    risk_level: str
    overall_risk_score: Optional[float] = None
    cost_risk: Optional[float] = None
    schedule_risk: Optional[float] = None


class RiskAssessmentItem(BaseModel):
    risk: str
    severity: str
    evidence: List[str] = []
    root_cause: str
    shap_factors: List[str] = []


class MitigationActionItem(BaseModel):
    priority: int = 1
    action: str
    reason: str
    responsible_role: str
    timeline: str
    expected_outcome: str
    monitoring_indicator: str
    escalation_condition: str


class MonitoringItem(BaseModel):
    indicator: str
    current_value: str
    target_value: str
    frequency: str
    responsible_role: str


class EscalationItem(BaseModel):
    trigger: str
    threshold: str
    escalate_to: str
    recommended_action: str


class StructuredMitigationPlan(BaseModel):
    project_summary: ProjectSummarySchema
    risk_assessment: List[RiskAssessmentItem] = []
    immediate_actions: List[MitigationActionItem] = []
    short_term_actions: List[MitigationActionItem] = []
    medium_term_actions: List[MitigationActionItem] = []
    monitoring_plan: List[MonitoringItem] = []
    escalation_plan: List[EscalationItem] = []
    executive_summary: str


class MitigationPlanRequest(BaseModel):
    project_id: str
    force_regenerate: bool = False


class MitigationPlanResponse(BaseModel):
    success: bool = True
    model: str = "Qwen 2.5 (Primary) + Multi-LLM Validation"
    validation_models: List[str] = []
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    plan: StructuredMitigationPlan
    mitigation_text: Optional[str] = None  # Text representation for backwards compatibility


class ExportPdfRequest(BaseModel):
    project_id: Optional[str] = None
    plan: Dict[str, Any]
    model: Optional[str] = "Qwen 2.5 (Primary) + Multi-LLM Validation"
    validation_models: Optional[List[str]] = []
