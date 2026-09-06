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
  predicted_delay_months?: number | null;
  delay_duration_months?: number | null;
  risk_trend?: string | null;
  report_month?: string | null;
}

export type AlertStatus = "NEW" | "ACKNOWLEDGED" | "UNDER_REVIEW" | "ACTION_ASSIGNED" | "RESOLVED";

export interface Alert {
  id: string;
  project_id: string;
  project_name: string;
  triggered_at: string;
  alert_type: string;
  previous_tier: RiskTier | null;
  new_tier: RiskTier | null;
  message: string | null;
  status?: AlertStatus;
  is_acknowledged: boolean;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
}

export type ActionPriority = "critical" | "high" | "medium" | "low";
export type ActionStatus = "pending" | "assigned" | "in_progress" | "completed" | "verified" | "cancelled";

export interface ActionItem {
  id: string;
  action_number?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  project_ministry?: string | null;
  project_sector?: string | null;
  project_state?: string | null;
  project_cost_cr?: number | null;
  project_progress_pct?: number | null;
  alert_id?: string | null;
  risk_id?: string | null;
  mitigation_id?: string | null;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  assigned_officer_id?: string | null;
  due_date?: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  started_at?: string | null;
  completed_at?: string | null;
  verified_at?: string | null;
  completion_percentage?: number;
  root_cause?: string | null;
  recommended_action?: string | null;
  expected_outcome?: string | null;
  actual_outcome?: string | null;
  verification_notes?: string | null;
  source_type?: string | null;
  source_reference?: string | null;
  last_updated_by?: string | null;
  deadline_status?: "OVERDUE" | "DUE_TODAY" | "DUE_SOON" | "ON_TRACK";
  approval_status?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  evidence_url?: string | null;
  response_notes?: string | null;
  risk_score?: number | null;
  risk_tier?: string | null;
  shap_factors?: Array<{ feature: string; value: number; direction: string; label: string; feature_value?: number }> | null;
  comments_count?: number;
  history_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ActionSummary {
  total: number;
  pending: number;
  assigned: number;
  in_progress: number;
  completed: number;
  verified: number;
  overdue: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ActionComment {
  id: string;
  action_id: string;
  user_id?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  message: string;
  created_at?: string;
}

export interface ActionHistoryItem {
  id: string;
  action_id: string;
  changed_by_id?: string | null;
  changed_by_name?: string | null;
  changed_by_role?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
  previous_assignee?: string | null;
  new_assignee?: string | null;
  previous_priority?: string | null;
  new_priority?: string | null;
  comment?: string | null;
  event_type: string;
  created_at?: string;
}

export interface OfficerProfile {
  id: string;
  full_name?: string | null;
  email: string;
  role: string;
  designation?: string | null;
  department_or_ministry?: string | null;
  active_actions_count: number;
}

export interface OfficerRecommendation {
  officer: OfficerProfile;
  match_reason: string;
  relevance_score: number;
}

export interface ActionAiRecommendation {
  title: string;
  root_cause: string;
  recommended_action: string;
  expected_outcome: string;
  suggested_priority: string;
  suggested_officer_id?: string | null;
  suggested_officer_name?: string | null;
  shap_factors: Array<Record<string, any>>;
  disclaimer?: string;
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
  sector: string;
  risk_level: string;
  risk_score?: number | null;
  cost_risk?: number | null;
  schedule_risk?: number | null;
}

export interface RiskDriverItem {
  factor: string;
  impact: string;
  evidence: string;
  source: string;
}

export interface RootCauseItem {
  risk: string;
  cause: string;
  evidence: string;
}

export interface MitigationActionItem {
  priority: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  risk: string;
  evidence?: string;
  action: string;
  reason: string;
  responsible_role: string;
  timeline: string;
  expected_outcome: string;
  monitoring_indicator: string;
  escalation_trigger: string;
}

export interface MonitoringItem {
  indicator: string;
  current_value: string;
  target: string;
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
  risk_drivers: RiskDriverItem[];
  root_causes: RootCauseItem[];
  mitigation_actions: MitigationActionItem[];
  monitoring_plan: MonitoringItem[];
  escalation_plan: EscalationItem[];
  executive_recommendation: string;
}

export interface ModelMetadata {
  primary_model: string;
  validator_model?: string;
  models_used: string[];
  models_attempted: string[];
  models_successful: string[];
  models_failed: string[];
  generation_mode: string;
  status: string;
  validation_status: string;
  project_specificity_score?: number;
  semantic_similarity_score?: number;
  generation_attempt?: number;
}

export interface MitigationPlanResponse {
  success: boolean;
  plan_id: string;
  generation_id: string;
  project_id: string;
  plan_version: number;
  plan_hash: string;
  risk_context_hash?: string;
  generated_at: string;
  model_metadata: ModelMetadata;
  plan: StructuredMitigationPlan;
  mitigation_text?: string | null;

  // Convenience accessors
  primary_model?: string;
  additional_models?: string[];
  generation_mode?: string;
}

export interface AvailableLlmModel {
  id: string;
  name: string;
  provider: string;
  is_available: boolean;
  is_local: boolean;
  description: string;
}

export interface MitigationPlanRequest {
  project_id?: string;
  force_regenerate?: boolean;
  model_preference?: string;
  api_key?: string;
}

// =============================================
// CITIZEN TRANSPARENCY & GRIEVANCE TYPES
// =============================================

export interface PublicProjectListItem {
  id: string;
  project_id?: string | null;
  project_name: string;
  ministry: string;
  sector: string;
  agency?: string | null;
  state: string;
  district?: string | null;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  original_cost_cr: number;
  revised_cost_cr?: number | null;
  cumulative_expenditure_cr?: number | null;
  physical_progress_pct?: number | null;
  scheduled_completion_date?: string | null;
  revised_completion_date?: string | null;
  approval_date_mm_yyyy?: string | null;
  start_date_mm_yyyy?: string | null;
  original_target_doc_mm_yyyy?: string | null;
  revised_target_doc_mm_yyyy?: string | null;
  pmgid?: string | null;
  legacy_ocms_code?: string | null;
  report_month?: string | null;
  source_pdf_page?: number | null;
  sl_no?: number | null;
  public_status: "ON_SCHEDULE" | "ACTIVE_MONITORING" | "DELAYED";
  grievances_count: number;
}

export interface PublicMilestone {
  milestone_name: string;
  scheduled_date?: string | null;
  is_completed: boolean;
}

export interface PublicProjectDetail extends PublicProjectListItem {
  burn_rate_pct?: number | null;
  burn_progress_gap?: number | null;
  time_elapsed_ratio?: number | null;
  milestones: PublicMilestone[];
}

export interface PaginationInfo {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PublicProjectsResponse {
  data: PublicProjectListItem[];
  pagination: PaginationInfo;
  counts_by_status: {
    ALL?: number;
    ON_SCHEDULE?: number;
    ACTIVE_MONITORING?: number;
    DELAYED?: number;
    [key: string]: number | undefined;
  };
}

export interface PublicFilterOptions {
  states: string[];
  sectors: string[];
  ministries: string[];
  agencies: string[];
  counts_by_status: {
    ALL?: number;
    ON_SCHEDULE?: number;
    ACTIVE_MONITORING?: number;
    DELAYED?: number;
    [key: string]: number | undefined;
  };
  total: number;
}

export interface CitizenGrievanceCreate {
  project_id: string;
  citizen_name: string;
  citizen_phone?: string;
  citizen_email?: string;
  category: string;
  description: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface CitizenGrievanceOut {
  id: string;
  project_id: string;
  project_name?: string | null;
  reference_id: string;
  citizen_name: string;
  citizen_phone?: string | null;
  citizen_email?: string | null;
  category: string;
  description: string;
  pincode?: string | null;
  status: string;
  action_taken?: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// FRAUD & CARTEL FORENSICS TYPES
// =============================================

export interface PhantomProject {
  project_id: string;
  project_name: string;
  state: string;
  district?: string | null;
  sector: string;
  ministry: string;
  contractor: string;
  original_cost_cr: number;
  revised_cost_cr: number;
  cumulative_expenditure_cr: number;
  physical_progress_pct: number;
  burn_rate_pct: number;
  burn_progress_gap: number;
  anomaly_type: string;
  severity: "CRITICAL" | "HIGH";
  flag_reason: string;
  recommended_action: string;
}

export interface BillingSpike {
  project_id: string;
  project_name: string;
  state: string;
  sector: string;
  contractor: string;
  expenditure_cr: number;
  physical_progress_pct: number;
  burn_rate_pct: number;
  spike_ratio: number;
  anomaly_type: string;
  flag_reason: string;
  recommended_action: string;
}

export interface RceEscalation {
  project_id: string;
  project_name: string;
  state: string;
  sector: string;
  contractor: string;
  original_cost_cr: number;
  revised_cost_cr: number;
  cost_overrun_cr: number;
  escalation_pct: number;
  flag_reason: string;
  recommended_action: string;
}

export interface ContractorCartelItem {
  contractor_name: string;
  active_projects_count: number;
  active_states: string[];
  sectors: string[];
  total_portfolio_cr: number;
  total_escalation_cr: number;
  average_escalation_pct: number;
  severe_delays_count: number;
  cartel_risk_score: number;
  risk_tier: "CRITICAL" | "HIGH" | "MODERATE";
  forensic_indicators: string[];
}

export interface FraudAnalyticsResponse {
  summary: {
    suspect_outlay_cr: number;
    phantom_projects_count: number;
    billing_spikes_count: number;
    rce_escalations_count: number;
    flagged_contractors_count: number;
    total_audited_projects: number;
  };
  phantom_projects: PhantomProject[];
  billing_spikes: BillingSpike[];
  rce_escalations: RceEscalation[];
  contractor_cartel_index: ContractorCartelItem[];
}

// =============================================
// FIELD EVIDENCE TYPES
// =============================================

export interface FieldEvidenceCreate {
  project_id: string;
  inspector_name: string;
  inspector_designation?: string;
  stage_name: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  physical_progress_observed_pct?: number;
  notes?: string;
}

export interface FieldEvidenceOut {
  id: string;
  project_id: string;
  project_name?: string | null;
  state?: string | null;
  district?: string | null;
  inspector_name: string;
  inspector_designation?: string | null;
  stage_name: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  project_latitude?: number | null;
  project_longitude?: number | null;
  distance_to_project_km?: number | null;
  is_verified: boolean;
  physical_progress_observed_pct?: number | null;
  notes?: string | null;
  created_at: string;
}

// =============================================
// GOVERNMENT INTEGRATIONS TYPES
// =============================================

export interface IntegrationsStatusResponse {
  overall_health: string;
  last_health_check: string;
  total_dispatches_recorded: number;
  services: {
    gatishakti: {
      name: string;
      provider: string;
      status: string;
      protocol: string;
      latency_ms: number;
      active_spatial_layers: number;
      layer_names: string[];
      last_sync: string;
    };
    digilocker: {
      name: string;
      provider: string;
      status: string;
      cert_authority: string;
      encryption: string;
      verified_documents_stored: number;
      accepted_doc_types: string[];
      last_handshake: string;
    };
    sms_gateway: {
      name: string;
      provider: string;
      status: string;
      protocol: string;
      delivery_success_rate: number;
      dlt_registration_status: string;
      sender_id: string;
      daily_quota_remaining: number;
      last_dispatch: string;
    };
    smtp_gateway: {
      name: string;
      provider: string;
      status: string;
      spf_status: string;
      dkim_status: string;
      tls_version: string;
      official_domain: string;
      last_dispatch: string;
    };
  };
}

export interface IntegrationLogOut {
  id: string;
  service: string;
  event_type: string;
  project_id?: string | null;
  project_name?: string | null;
  recipient?: string | null;
  payload_summary?: string | null;
  status: string;
  response_code: number;
  created_at: string;
}

// ──────────────────────────────────────────────────
// New Types for Phase 2 additions
// ──────────────────────────────────────────────────

export interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  severity: "critical" | "high" | "medium" | "info";
  entity_type?: string | null;
  entity_id?: string | null;
  entity_name?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  project_name?: string | null;
  doc_type: string;
  title: string;
  description?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  report_month?: string | null;
  uploaded_by_id?: string | null;
  uploaded_by_name?: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_name?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  extra_metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface MilestoneDetail {
  id: string;
  milestone_name: string;
  scheduled_date: string | null;
  actual_date: string | null;
  is_completed: boolean;
  status: "COMPLETED" | "OVERDUE" | "IN_PROGRESS" | "NOT_STARTED";
  delay_days?: number | null;
}

export interface ProjectMilestonesResponse {
  project_id: string;
  project_name: string;
  milestones: MilestoneDetail[];
  total: number;
  completed: number;
  overdue: number;
}

export interface ProjectHistoryEntry {
  report_month: string;
  report_month_key?: string | null;
  predicted_at?: string | null;
  risk_tier: string;
  composite_risk_score: number;
  delay_probability: number;
  cost_overrun_probability: number;
  delay_duration_months: number;
  cost_overrun_amount_cr: number;
}

export interface ProjectHistoryResponse {
  project_id: string;
  project_name: string;
  prediction_history: ProjectHistoryEntry[];
  snapshot_history: Record<string, unknown>[];
  total_months: number;
}

export interface DataQualityIssue {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface DataQualityReport {
  generated_at: string;
  total_projects: number;
  total_issues: number;
  quality_score: number;
  summary: Record<string, number>;
  issues: Record<string, DataQualityIssue[]>;
}
