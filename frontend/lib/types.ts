// =============================================
// Shared TypeScript interfaces — SIH26103
// Must match backend Pydantic schemas exactly
// =============================================

export type RiskTier = "critical" | "high" | "medium" | "low";

export interface SHAPValue {
  feature: string;
  value: number;
  direction: "positive" | "negative";
  label: string;
  feature_value?: number | null;
}

export interface RiskPrediction {
  id: string;
  project_id: string;
  predicted_at: string;
  delay_probability: number;
  delay_duration_months: number;
  cost_overrun_probability: number;
  cost_overrun_amount_cr: number;
  composite_risk_score: number;
  risk_tier: RiskTier;
  shap_values: SHAPValue[];
  ai_risk_narrative?: string;
  model_version: string;
}


export interface Milestone {
  id: string;
  milestone_name: string;
  scheduled_date: string | null;
  actual_date: string | null;
  is_completed: boolean;
}

export interface Project {
  id: string;
  project_name: string;
  ministry: string;
  sector: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  original_cost_cr: number;
  revised_cost_cr: number | null;
  cumulative_expenditure_cr: number | null;
  physical_progress_pct: number | null;
  original_start_date: string | null;
  scheduled_completion_date: string | null;
  revised_completion_date: string | null;
  actual_completion_date: string | null;
  project_scale: "mega" | "major" | "other" | null;
  burn_rate_pct: number | null;
  burn_progress_gap: number | null;
  time_elapsed_ratio: number | null;
  created_at: string;
  updated_at: string;
  milestones: Milestone[];
}

export interface ProjectListItem {
  id: string;
  project_name: string;
  ministry: string;
  sector: string;
  state: string;
  district?: string | null;
  location_name?: string | null;
  place?: string | null;
  category?: string | null;
  agency?: string | null;
  latitude: number | null;
  longitude: number | null;
  original_cost_cr: number;
  revised_cost_cr: number | null;
  cumulative_expenditure_cr?: number | null;
  burn_rate_pct?: number | null;
  time_elapsed_ratio?: number | null;
  physical_progress_pct: number | null;
  project_scale: "mega" | "major" | "other" | null;
  burn_progress_gap: number | null;
  risk_tier: RiskTier | null;
  composite_risk_score: number | null;
  delay_probability: number | null;
  cost_overrun_probability: number | null;
}

export interface Alert {
  id: string;
  project_id: string;
  project_name: string;
  triggered_at: string;
  alert_type: string;
  previous_tier: RiskTier | null;
  new_tier: RiskTier | null;
  message: string | null;
  is_acknowledged: boolean;
}

export interface PortfolioSummary {
  total_projects: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_exposure_cr: number;
  total_delayed_count: number;
  avg_delay_duration_months: number;
}

export interface User {
  user_id: string;
  email: string;
  role: "admin" | "decision_maker" | "monitoring_officer" | "analyst";
  full_name: string | null;
}

export interface PredictRequest {
  revised_cost_cr?: number;
  cumulative_expenditure_cr?: number;
  physical_progress_pct?: number;
  revised_completion_date?: string;
}

// ── Multi-LLM Structured AI Mitigation Plan Interfaces ──

export interface ProjectSummarySchema {
  project_name: string;
  project_id: string;
  risk_level: string;
  overall_risk_score?: number | null;
  cost_risk?: number | null;
  schedule_risk?: number | null;
}

export interface RiskAssessmentItem {
  risk: string;
  severity: string;
  evidence: string[];
  root_cause: string;
  shap_factors: string[];
}

export interface MitigationActionItem {
  priority: number;
  action: string;
  reason: string;
  responsible_role: string;
  timeline: string;
  expected_outcome: string;
  monitoring_indicator: string;
  escalation_condition: string;
}

export interface MonitoringItem {
  indicator: string;
  current_value: string;
  target_value: string;
  frequency: string;
  responsible_role: string;
}

export interface EscalationItem {
  trigger: string;
  threshold: string;
  escalate_to: string;
  recommended_action: string;
}

export interface StructuredMitigationPlan {
  project_summary: ProjectSummarySchema;
  risk_assessment: RiskAssessmentItem[];
  immediate_actions: MitigationActionItem[];
  short_term_actions: MitigationActionItem[];
  medium_term_actions: MitigationActionItem[];
  monitoring_plan: MonitoringItem[];
  escalation_plan: EscalationItem[];
  executive_summary: string;
}

export interface MitigationPlanResponse {
  success: boolean;
  model: string;
  validation_models: string[];
  generated_at: string;
  plan: StructuredMitigationPlan;
  mitigation_text?: string | null;
}
