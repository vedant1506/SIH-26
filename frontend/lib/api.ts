// =============================================
// API Client — SIH26103
// ALL API calls go through this file.
// Never call Supabase directly from pages.
// =============================================

import { getToken } from "./auth";
import type {
  Project, ProjectListItem, RiskPrediction, Alert, ActionItem,
  ActionSummary, ActionComment, ActionHistoryItem, OfficerProfile, OfficerRecommendation, ActionAiRecommendation,
  PortfolioSummary, User, PredictRequest,
  StructuredMitigationPlan, MitigationPlanResponse, AvailableLlmModel,
  PublicProjectListItem, PublicProjectDetail, CitizenGrievanceCreate, CitizenGrievanceOut,
  PublicProjectsResponse, PublicFilterOptions,
  FraudAnalyticsResponse, FieldEvidenceCreate, FieldEvidenceOut,
  IntegrationsStatusResponse, IntegrationLogOut
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API = `${BASE_URL}/api/v1`;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { cache: "no-store", ...options, headers });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────
export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail);
  }
  return res.json();
}

export async function getMe(): Promise<User> {
  return request<User>("/auth/me");
}

// ── Projects ──────────────────────────────────
export interface ProjectFilters {
  search?: string;
  ministry?: string;
  sector?: string;
  state?: string;
  risk_tier?: string;
  project_scale?: string;
  delayed?: string | boolean;
  skip?: number;
  limit?: number;
}

export async function listProjects(filters: ProjectFilters = {}): Promise<ProjectListItem[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  params.set("_t", String(Date.now()));
  return request<ProjectListItem[]>(`/projects?${params}`);
}

export const getProjects = listProjects;

export async function getProject(id: string): Promise<Project> {
  return request<Project>(`/projects/${id}`);
}

// ── Predictions ───────────────────────────────
export async function predictProject(
  projectId: string,
  payload?: PredictRequest
): Promise<RiskPrediction> {
  return request<RiskPrediction>(`/projects/${projectId}/predict`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

export async function getProjectPredictions(
  projectId: string,
  limit = 10
): Promise<RiskPrediction[]> {
  return request<RiskPrediction[]>(`/projects/${projectId}/predictions?limit=${limit}`);
}

export async function generateMitigation(projectId: string): Promise<{ mitigation_text: string; model: string; plan?: StructuredMitigationPlan }> {
  return request<{ mitigation_text: string; model: string; plan?: StructuredMitigationPlan }>(`/projects/${projectId}/mitigation`, {
    method: "POST",
  });
}

export async function generateMitigationPlan(
  projectId: string,
  forceRegenerate = false,
  modelPreference = "auto",
  apiKey?: string
): Promise<MitigationPlanResponse> {
  return request<MitigationPlanResponse>(`/projects/${projectId}/mitigation-plan/generate`, {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      force_regenerate: forceRegenerate,
      model_preference: modelPreference,
      api_key: apiKey,
    }),
  });
}

export async function getAvailableLlmModels(): Promise<AvailableLlmModel[]> {
  return request<AvailableLlmModel[]>("/projects/mitigation-models").catch(() => []);
}

export async function getStoredMitigationPlan(projectId: string, planId: string): Promise<MitigationPlanResponse> {
  return request<MitigationPlanResponse>(`/projects/${projectId}/mitigation-plan/${planId}`);
}

export async function downloadMitigationPdf(
  projectId: string,
  planId?: string,
  plan?: StructuredMitigationPlan,
  modelName?: string
): Promise<Blob> {
  const token = typeof window !== "undefined" ? localStorage.getItem("prism_token") : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const res = await fetch(`${baseUrl}/projects/${projectId}/mitigation-plan/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ project_id: projectId, plan_id: planId, plan, model: modelName }),
  });
  if (!res.ok) throw new Error("Failed to generate server PDF");
  return res.blob();
}

export async function getPortfolioSummary(filters: ProjectFilters = {}): Promise<PortfolioSummary> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  return request<PortfolioSummary>(`/projects/analytics/portfolio?${params}`);
}

// ── Alerts ────────────────────────────────────
export async function listAlerts(
  unacknowledgedOnly = false,
  limit?: number,
  status?: string
): Promise<Alert[]> {
  const params = new URLSearchParams();
  if (unacknowledgedOnly) params.set("unacknowledged_only", "true");
  if (limit !== undefined && limit !== null && limit > 0) params.set("limit", String(limit));
  if (status && status !== "ALL") params.set("status", status);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<Alert[]>(`/alerts${qs}`);
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  return request<void>(`/alerts/${alertId}/acknowledge`, { method: "POST" });
}

export async function updateAlertStatus(alertId: string, status: string): Promise<Alert> {
  return request<Alert>(`/alerts/${alertId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function acknowledgeAllAlerts(): Promise<{ status: string; acknowledged_count: number }> {
  return request<{ status: string; acknowledged_count: number }>(`/alerts/acknowledge-all`, { method: "POST" });
}

// ── Action Items & Interventions ───────────────
export async function getActionSummary(): Promise<ActionSummary> {
  return request<ActionSummary>("/actions/summary");
}

export async function listActions(params?: {
  project_id?: string;
  status?: string;
  priority?: string;
  assigned_officer_id?: string;
  search?: string;
  overdue?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ActionItem[]> {
  const qs = new URLSearchParams();
  if (params?.project_id) qs.set("project_id", params.project_id);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.priority && params.priority !== "all") qs.set("priority", params.priority);
  if (params?.assigned_officer_id) qs.set("assigned_officer_id", params.assigned_officer_id);
  if (params?.search) qs.set("search", params.search);
  if (params?.overdue) qs.set("overdue", "true");
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const qStr = qs.toString() ? `?${qs.toString()}` : "";
  return request<ActionItem[]>(`/actions${qStr}`);
}

export async function getActionDetail(actionId: string): Promise<ActionItem> {
  return request<ActionItem>(`/actions/${actionId}`);
}

export async function createAction(payload: Partial<ActionItem>): Promise<ActionItem> {
  return request<ActionItem>("/actions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAction(actionId: string, payload: Partial<ActionItem>): Promise<ActionItem> {
  return request<ActionItem>(`/actions/${actionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function assignAction(actionId: string, payload: { officer_id: string; notes?: string }): Promise<ActionItem> {
  return request<ActionItem>(`/actions/${actionId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function transitionAction(actionId: string, payload: { new_status: string; comment?: string; completion_percentage?: number }): Promise<ActionItem> {
  return request<ActionItem>(`/actions/${actionId}/transition`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeAction(actionId: string, payload: { completion_notes: string; actual_outcome?: string; evidence_url?: string }): Promise<ActionItem> {
  return request<ActionItem>(`/actions/${actionId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyAction(actionId: string, payload: { is_approved: boolean; verification_notes: string }): Promise<ActionItem> {
  return request<ActionItem>(`/actions/${actionId}/verify`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listActionComments(actionId: string): Promise<ActionComment[]> {
  return request<ActionComment[]>(`/actions/${actionId}/comments`);
}

export async function addActionComment(actionId: string, message: string): Promise<ActionComment> {
  return request<ActionComment>(`/actions/${actionId}/comments`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function getActionHistory(actionId: string): Promise<ActionHistoryItem[]> {
  return request<ActionHistoryItem[]>(`/actions/${actionId}/history`);
}

export async function listOfficers(): Promise<OfficerProfile[]> {
  return request<OfficerProfile[]>("/actions/officers");
}

export async function getRecommendedOfficer(projectId: string): Promise<OfficerRecommendation> {
  return request<OfficerRecommendation>(`/actions/recommend-officer/${projectId}`);
}

export async function generateAiIntervention(projectId: string, alertId?: string): Promise<ActionAiRecommendation> {
  return request<ActionAiRecommendation>("/actions/ai-recommend", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, alert_id: alertId || undefined }),
  });
}

export async function deleteAction(actionId: string): Promise<{ status: string; deleted_id: string }> {
  return request<{ status: string; deleted_id: string }>(`/actions/${actionId}`, {
    method: "DELETE",
  });
}


export async function parseOutsideFile(file: File): Promise<any> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/parse-document`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload error");
  }
  return res.json();
}

export async function generateLlmBriefing(payload: Record<string, any> = {}): Promise<any> {
  return request<any>("/projects/llm-briefing", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ============================================================
// TEMPORARY MONTHLY PDF AI ANALYSIS & MITIGATION PIPELINE
// ============================================================

export async function uploadTemporaryMonthlyPdf(file: File): Promise<any> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/temporary-analysis/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  const body = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) {
    const msg = typeof body.detail === "object" ? body.detail.detail || body.detail.error : body.detail;
    throw new Error(msg || "Upload error");
  }
  return body;
}

export async function getTemporaryProjects(sessionId: string): Promise<any> {
  return request<any>(`/temporary-analysis/${sessionId}/projects`);
}

export async function generateTemporaryMitigation(sessionId: string, projectId: string): Promise<any> {
  return request<any>(`/temporary-analysis/${encodeURIComponent(sessionId)}/projects/${encodeURIComponent(projectId)}/mitigation`, {
    method: "POST",
  });
}

export function getTemporaryCsvUrl(sessionId: string): string {
  return `${API}/temporary-analysis/${sessionId}/csv`;
}

export function getTemporaryRiskCsvUrl(sessionId: string): string {
  return `${API}/temporary-analysis/${sessionId}/risk-csv`;
}

export function getTemporaryJsonUrl(sessionId: string): string {
  return `${API}/temporary-analysis/${sessionId}/json`;
}

export async function deleteTemporarySession(sessionId: string): Promise<any> {
  return request<any>(`/temporary-analysis/${sessionId}`, {
    method: "DELETE",
  });
}

export async function getFileAnalysisModelStatuses(): Promise<any> {
  return request<any>("/file-analysis/models/status").catch(() => null);
}

// ── Analytics (New endpoints) ──────────────────────────

export async function getModelMetrics(): Promise<any> {
  return request<any>("/analytics/model-metrics");
}

export async function getBenchmarking(): Promise<any> {
  return request<any>("/analytics/benchmarking");
}

export async function getCostDrivers(sector?: string): Promise<any> {
  const qs = sector ? `?sector=${encodeURIComponent(sector)}` : "";
  return request<any>(`/analytics/cost-drivers${qs}`);
}

export async function getEarlyWarnings(
  params?: { limit?: number; severity?: string; sector?: string } | number
): Promise<any> {
  if (typeof params === "number") {
    return request<any>(`/analytics/early-warning?limit=${params}`);
  }
  const qs = new URLSearchParams();
  const limit = params?.limit ?? 2500;
  qs.set("limit", String(limit));
  if (params?.severity && params.severity !== "all") {
    qs.set("severity", params.severity);
  }
  if (params?.sector && params.sector !== "all") {
    qs.set("sector", params.sector);
  }
  return request<any>(`/analytics/early-warning?${qs.toString()}`);
}

// =============================================
// CITIZEN TRANSPARENCY & GRIEVANCE APIS
// =============================================

export interface PublicProjectFilters {
  search?: string;
  state?: string;
  district?: string;
  sector?: string;
  ministry?: string;
  agency?: string;
  status?: string;
  page?: number;
  page_size?: number;
  skip?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

export async function listPublicProjects(filters: PublicProjectFilters = {}): Promise<PublicProjectsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  const res = await fetch(`${API}/public/projects?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to fetch public projects");
  }
  return res.json();
}

export async function getPublicFilterOptions(): Promise<PublicFilterOptions> {
  const res = await fetch(`${API}/public/filter-options`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to fetch filter options");
  }
  return res.json();
}

export async function getPublicProject(id: string): Promise<PublicProjectDetail> {
  const res = await fetch(`${API}/public/projects/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to fetch public project details");
  }
  return res.json();
}

export async function submitCitizenGrievance(payload: CitizenGrievanceCreate): Promise<CitizenGrievanceOut> {
  const res = await fetch(`${API}/public/grievances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to submit grievance");
  }
  return res.json();
}

export async function trackCitizenGrievance(referenceId: string): Promise<CitizenGrievanceOut> {
  const res = await fetch(`${API}/public/grievances/${encodeURIComponent(referenceId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Grievance ticket not found");
  }
  return res.json();
}

// =============================================
// FRAUD & CARTEL FORENSICS APIS
// =============================================

export async function getFraudAndCartelAnalytics(minCostCr = 50.0, limitCases = 25): Promise<FraudAnalyticsResponse> {
  return request<FraudAnalyticsResponse>(`/analytics/fraud-detection?min_cost_cr=${minCostCr}&limit_cases=${limitCases}`);
}

// =============================================
// GEOTAGGED FIELD EVIDENCE APIS
// =============================================

export async function listFieldEvidence(projectId?: string, verifiedOnly?: boolean): Promise<FieldEvidenceOut[]> {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  if (verifiedOnly !== undefined) params.set("verified_only", String(verifiedOnly));
  return request<FieldEvidenceOut[]>(`/field-evidence?${params}`);
}

export async function submitFieldEvidence(payload: FieldEvidenceCreate): Promise<FieldEvidenceOut> {
  return request<FieldEvidenceOut>("/field-evidence", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// =============================================
// EXTERNAL GOVERNMENT INTEGRATIONS APIS
// =============================================

export async function getIntegrationsStatus(): Promise<IntegrationsStatusResponse> {
  return request<IntegrationsStatusResponse>("/integrations/status");
}

export async function syncGatiShakti(projectId: string, bufferKm = 5.0): Promise<any> {
  return request<any>("/integrations/gatishakti/sync", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, corridor_buffer_km: bufferKm }),
  });
}

export async function verifyDigiLocker(projectId: string, docType: string, docIdentifier: string): Promise<any> {
  return request<any>("/integrations/digilocker/verify", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, doc_type: docType, doc_identifier: docIdentifier }),
  });
}

export async function dispatchAlert(projectId: string, service: "sms" | "email", recipient: string, message: string): Promise<any> {
  return request<any>("/integrations/dispatch-alert", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, service, recipient, message }),
  });
}

export async function getIntegrationLogs(service?: string, limit = 50): Promise<IntegrationLogOut[]> {
  const qs = service ? `?service=${encodeURIComponent(service)}&limit=${limit}` : `?limit=${limit}`;
  return request<IntegrationLogOut[]>(`/integrations/logs${qs}`);
}

// =============================================
// NOTIFICATIONS APIS
// =============================================

export async function listNotifications(unreadOnly = false, limit = 50): Promise<import("./types").Notification[]> {
  const qs = new URLSearchParams();
  if (unreadOnly) qs.set("unread_only", "true");
  qs.set("limit", String(limit));
  return request<import("./types").Notification[]>(`/notifications?${qs}`);
}

export async function getUnreadNotificationCount(): Promise<{ unread_count: number }> {
  return request<{ unread_count: number }>("/notifications/unread-count");
}

export async function markNotificationRead(id: string): Promise<void> {
  return request<void>(`/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<{ status: string; marked_count: number }> {
  return request<{ status: string; marked_count: number }>("/notifications/read-all", { method: "POST" });
}

// =============================================
// AUDIT LOG APIS
// =============================================

export async function listAuditLogs(params?: {
  action?: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  skip?: number;
  limit?: number;
}): Promise<import("./types").AuditLog[]> {
  const qs = new URLSearchParams();
  if (params?.action) qs.set("action", params.action);
  if (params?.entity_type) qs.set("entity_type", params.entity_type);
  if (params?.entity_id) qs.set("entity_id", params.entity_id);
  if (params?.user_id) qs.set("user_id", params.user_id);
  if (params?.skip !== undefined) qs.set("skip", String(params.skip));
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  return request<import("./types").AuditLog[]>(`/audit?${qs}`);
}

export async function getAuditSummary(): Promise<any> {
  return request<any>("/audit/summary");
}

// =============================================
// DOCUMENT MANAGEMENT & INTELLIGENCE APIS
// =============================================

export async function listDocuments(params?: {
  project_id?: string;
  doc_type?: string;
  document_type?: string;
  status?: string;
  search?: string;
  report_month?: string;
  skip?: number;
  limit?: number;
}): Promise<any> {
  const qs = new URLSearchParams();
  if (params?.project_id) qs.set("project_id", params.project_id);
  const dtype = params?.document_type || params?.doc_type;
  if (dtype) qs.set("document_type", dtype);
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  if (params?.report_month) qs.set("report_month", params.report_month);
  if (params?.skip !== undefined) qs.set("skip", String(params.skip));
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  return request<any>(`/documents?${qs}`);
}

export async function listProjectDocuments(projectId: string, docType?: string): Promise<any> {
  const qs = docType ? `?doc_type=${encodeURIComponent(docType)}` : "";
  return request<any>(`/documents/project/${projectId}${qs}`);
}

export async function getDocumentAnalytics(): Promise<any> {
  return request<any>("/documents/analytics");
}

export async function getDocument(id: string): Promise<any> {
  return request<any>(`/documents/${id}`);
}

export async function askDocument(id: string, question: string): Promise<any> {
  return request<any>(`/documents/${id}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function getProjectDocumentTimeline(projectId: string): Promise<any> {
  return request<any>(`/documents/project/${projectId}/timeline`);
}

export async function createDocument(payload: {
  project_id: string;
  doc_type: string;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  report_month?: string;
}): Promise<any> {
  return request<any>("/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteDocument(docId: string): Promise<any> {
  return request<any>(`/documents/${docId}`, { method: "DELETE" });
}

export async function verifyDocument(docId: string): Promise<any> {
  return request<any>(`/documents/${docId}/verify`, { method: "PATCH" });
}


// =============================================
// REPORTS APIS
// =============================================

export function getPortfolioCsvUrl(params?: { state?: string; sector?: string; ministry?: string; risk_tier?: string }): string {
  const qs = new URLSearchParams();
  if (params?.state) qs.set("state", params.state);
  if (params?.sector) qs.set("sector", params.sector);
  if (params?.ministry) qs.set("ministry", params.ministry);
  if (params?.risk_tier) qs.set("risk_tier", params.risk_tier);
  const token = typeof window !== "undefined" ? localStorage.getItem("prism_token") : "";
  return `${BASE_URL}/api/v1/reports/portfolio/csv?${qs}`;
}

export async function getPortfolioReportJson(params?: { state?: string; sector?: string; ministry?: string }): Promise<any> {
  const qs = new URLSearchParams();
  if (params?.state) qs.set("state", params.state);
  if (params?.sector) qs.set("sector", params.sector);
  if (params?.ministry) qs.set("ministry", params.ministry);
  return request<any>(`/reports/portfolio/json?${qs}`);
}

export async function getProjectReportSummary(projectId: string): Promise<any> {
  return request<any>(`/reports/project/${projectId}/summary`);
}

export async function getDataQualityReport(): Promise<import("./types").DataQualityReport> {
  return request<import("./types").DataQualityReport>("/reports/data-quality");
}

// =============================================
// PROJECT HISTORY & MILESTONES APIS
// =============================================

export async function getProjectHistory(projectId: string): Promise<import("./types").ProjectHistoryResponse> {
  return request<import("./types").ProjectHistoryResponse>(`/projects/${projectId}/history`);
}

export async function getProjectMilestones(projectId: string): Promise<import("./types").ProjectMilestonesResponse> {
  return request<import("./types").ProjectMilestonesResponse>(`/projects/${projectId}/milestones`);
}

// =============================================
// HEALTH CHECK APIS
// =============================================

export async function getPlatformHealth(): Promise<any> {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json().catch(() => ({ status: "unknown" }));
}

export async function getDatabaseHealth(): Promise<any> {
  const res = await fetch(`${BASE_URL}/health/database`);
  return res.json().catch(() => ({ status: "unknown" }));
}

export async function getMlHealth(): Promise<any> {
  const res = await fetch(`${BASE_URL}/health/ml`);
  return res.json().catch(() => ({ status: "unknown" }));
}

export async function getLlmHealth(): Promise<any> {
  const res = await fetch(`${BASE_URL}/health/llm`);
  return res.json().catch(() => ({ status: "unknown" }));
}

