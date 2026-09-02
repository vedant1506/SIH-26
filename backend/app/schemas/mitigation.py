from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class ProjectSummarySchema(BaseModel):
    project_id: str
    project_name: str
    sector: str = "Infrastructure"
    risk_level: str = "MEDIUM"
    risk_score: Optional[float] = None
    cost_risk: Optional[float] = None
    schedule_risk: Optional[float] = None


class RiskDriverItem(BaseModel):
    factor: str
    impact: str
    evidence: str
    source: str = "SHAP"


class RootCauseItem(BaseModel):
    risk: str
    cause: str
    evidence: str


class MitigationActionItem(BaseModel):
    priority: int = 1
    severity: str = "MEDIUM"  # CRITICAL, HIGH, MEDIUM, LOW
    risk: str = "Schedule/Cost Risk"
    evidence: str = Field(default="", description="Project-specific empirical metric or observation justifying this action")
    action: str
    reason: str
    responsible_role: str
    timeline: str
    expected_outcome: str
    monitoring_indicator: str
    escalation_trigger: str


class MonitoringItem(BaseModel):
    indicator: str
    current_value: str
    target: str
    frequency: str
    responsible_role: str


class EscalationItem(BaseModel):
    trigger: str
    threshold: str
    escalate_to: str
    recommended_action: str


class StructuredMitigationPlan(BaseModel):
    project_summary: ProjectSummarySchema
    risk_drivers: List[RiskDriverItem] = []
    root_causes: List[RootCauseItem] = []
    mitigation_actions: List[MitigationActionItem] = []
    monitoring_plan: List[MonitoringItem] = []
    escalation_plan: List[EscalationItem] = []
    executive_recommendation: str


class ModelMetadataSchema(BaseModel):
    primary_model: str = "Qwen 2.5"
    models_used: List[str] = ["Qwen 2.5"]
    models_attempted: List[str] = ["Qwen 2.5"]
    models_successful: List[str] = ["Qwen 2.5"]
    models_failed: List[str] = []
    generation_mode: str = "Project-Specific Deep Risk Intelligence"
    status: str = "completed"
    validation_status: str = "passed"


class MitigationPlanRequest(BaseModel):
    project_id: Optional[str] = None
    force_regenerate: bool = False


class MitigationPlanResponse(BaseModel):
    success: bool = True
    plan_id: str
    generation_id: str
    project_id: str
    plan_version: int = 1
    plan_hash: str
    risk_context_hash: str
    generated_at: str
    model_metadata: ModelMetadataSchema
    plan: StructuredMitigationPlan
    mitigation_text: Optional[str] = None

    # Backward compatibility properties
    @property
    def primary_model(self) -> str:
        return self.model_metadata.primary_model

    @property
    def additional_models(self) -> List[str]:
        return [m for m in self.model_metadata.models_used if m != self.model_metadata.primary_model]

    @property
    def generation_mode(self) -> str:
        return self.model_metadata.generation_mode


class ExportPdfRequest(BaseModel):
    plan_id: Optional[str] = None
    project_id: Optional[str] = None
    plan: Optional[Dict[str, Any]] = None
    model: Optional[str] = None
    validation_models: Optional[List[str]] = []
