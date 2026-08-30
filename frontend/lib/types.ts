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
  place?: string | null;
  category?: string | null;
  latitude: number | null;
  longitude: number | null;
  original_cost_cr: number;
  revised_cost_cr: number | null;
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
