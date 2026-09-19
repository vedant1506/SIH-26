// ============================================================
// API Client — SIH26103 Phase 2 Hybrid Zero-Crash Architecture
// Centralized error handling, timeout resilience & offline fallback
// ALL API calls route through this file.
// ============================================================

import { getToken } from "./auth";
import type {
  Project, ProjectListItem, RiskPrediction, Alert, ActionItem,
  ActionSummary, ActionComment, ActionHistoryItem, OfficerProfile, OfficerRecommendation, ActionAiRecommendation,
  PortfolioSummary, User, PredictRequest,
  StructuredMitigationPlan, MitigationPlanResponse, AvailableLlmModel,
  PublicProjectListItem, PublicProjectDetail, CitizenGrievanceCreate, CitizenGrievanceOut,
  PublicProjectsResponse, PublicFilterOptions,
  FraudAnalyticsResponse, FieldEvidenceCreate, FieldEvidenceOut,
  IntegrationsStatusResponse, IntegrationLogOut, GFR175ScreeningResult
} from "./types";

import {
  setDataMode,
  toggleDataMode,
  enableFallbackMode,
  enableLiveMode,
  isSimulatingApiFailure,
  getSimulateTimeout,
  getDataMode,
  isFallbackMode,
  setSimulateApiFailure,
  setSimulateTimeout,
} from "./fallback-state";

import {
  FALLBACK_LABEL,
  FALLBACK_PROJECTS,
  FALLBACK_PORTFOLIO_SUMMARY,
  FALLBACK_EARLY_WARNINGS,
  FALLBACK_FRAUD_ANALYTICS,
  FALLBACK_COST_DRIVERS,
  FALLBACK_BENCHMARKING,
  FALLBACK_MODEL_METRICS,
  FALLBACK_ALERTS,
  FALLBACK_ACTIONS,
  FALLBACK_ACTION_SUMMARY,
  getFallbackProjects,
  getFallbackProject,
  getFallbackPrediction,
  getFallbackMitigationPlan,
} from "./fallback-data";

// Re-export state utilities for application-wide and testing use
export {
  getDataMode,
  isFallbackMode,
  toggleDataMode,
  enableFallbackMode,
  enableLiveMode,
  setDataMode,
  setSimulateApiFailure,
  isSimulatingApiFailure,
  setSimulateTimeout,
} from "./fallback-state";

export {
  FALLBACK_LABEL,
  FALLBACK_PROJECTS,
  FALLBACK_PORTFOLIO_SUMMARY,
} from "./fallback-data";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API = `${BASE_URL}/api/v1`;

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  isCriticalEmpty?: (data: any) => boolean;
}

/**
 * Centralized request engine with timeout, network detection,
 * HTTP status handling, JSON parsing safety, and automatic offline fallback.
 * Strictly avoids mixing live and fallback records.
 */
export async function requestWithFallback<T>(
  path: string,
  options: RequestOptions = {},
  fallbackResolver?: () => T | Promise<T>
): Promise<T> {
  const timeoutMs = options.timeoutMs || 30000;

  // 1. If user explicitly enabled Offline Fallback Mode, or QA simulation flag is active
  if (isFallbackMode() || isSimulatingApiFailure()) {
    if (fallbackResolver) return await fallbackResolver();
    throw new Error("Offline Fallback Mode active (no fallback resolver provided)");
  }

  const simTimeout = getSimulateTimeout();
  if (simTimeout > 0) {
    await new Promise((resolve) => setTimeout(resolve, simTimeout));
    if (fallbackResolver) return await fallbackResolver();
    throw new Error(`Simulated timeout after ${simTimeout}ms`);
  }

  // 2. Set up AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timeout threshold exceeded (${timeoutMs}ms)`));
  }, timeoutMs);

  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API}${path}`, {
      cache: "no-store",
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Auth redirection
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err?.detail === "string" ? err.detail : `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(msg);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    const rawText = await res.text();
    let data: T;
    try {
      data = rawText ? JSON.parse(rawText) : ({} as T);
    } catch {
      throw new Error("Malformed JSON response from server");
    }

    // Critical empty response validation
    if (options.isCriticalEmpty && options.isCriticalEmpty(data)) {
      throw new Error("Empty critical response received from server");
    }

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);

    // DO NOT automatically set OFFLINE FALLBACK MODE!
    // Manual user action via button is required to activate offline fallback mode.
    throw err;
  }
}

// Ensure standard request<T> calls pass through the centralized handler
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestWithFallback<T>(path, options);
}

// ── Auth ──────────────────────────────────────
export async function login(email: string, password: string) {
  if (isFallbackMode()) {
    return {
      access_token: "demo-fallback-token",
      token_type: "bearer",
      user: {
        user_id: "demo-usr-01",
        email: email || "demo.officer@nic.in",
        role: "monitoring_officer",
        full_name: "Demo Monitoring Officer (Fallback)",
      },
    };
  }

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

export async function getMe(): Promise<User> {
  return requestWithFallback<User>(
    "/auth/me",
    {},
    () => ({
      user_id: "demo-usr-01",
      email: "demo.officer@nic.in",
      role: "monitoring_officer",
      full_name: "Demo Monitoring Officer (Fallback)",
    })
  );
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

export async function listProjects(filters: ProjectFilters = {}, options: RequestOptions = {}): Promise<ProjectListItem[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  params.set("_t", String(Date.now()));
  const defaultTimeout = (filters.limit && filters.limit > 100) ? 25000 : 6000;
  return requestWithFallback<ProjectListItem[]>(
    `/projects?${params}`,
    { timeoutMs: options.timeoutMs || defaultTimeout, isCriticalEmpty: (data) => !Array.isArray(data), ...options },
    () => getFallbackProjects(filters)
  );
}

export const getProjects = listProjects;

export async function getProject(id: string): Promise<Project> {
  return requestWithFallback<Project>(
    `/projects/${id}`,
    { isCriticalEmpty: (data) => !data || !data.id },
    () => getFallbackProject(id)
  );
}

// ── Predictions ───────────────────────────────
export async function predictProject(
  projectId: string,
  payload?: PredictRequest
): Promise<RiskPrediction> {
  return requestWithFallback<RiskPrediction>(
    `/projects/${projectId}/predict`,
    {
      method: "POST",
      body: JSON.stringify(payload || {}),
    },
    () => getFallbackPrediction(projectId)
  );
}

export async function getProjectPredictions(
  projectId: string,
  limit = 10
): Promise<RiskPrediction[]> {
  return requestWithFallback<RiskPrediction[]>(
    `/projects/${projectId}/predictions?limit=${limit}`,
    {},
    () => [getFallbackPrediction(projectId)]
  );
}

export async function generateMitigation(projectId: string): Promise<{ mitigation_text: string; model: string; plan?: StructuredMitigationPlan }> {
  return requestWithFallback<{ mitigation_text: string; model: string; plan?: StructuredMitigationPlan }>(
    `/projects/${projectId}/mitigation`,
    { method: "POST" },
    () => ({
      mitigation_text: `[${FALLBACK_LABEL}] Inter-agency coordination directive issued under GFR Rule 175. Empowered steering committee requested to unblock utility and ROW constraints.`,
      model: "Qwen-2.5-72B (DEMO / FALLBACK DATA)",
      plan: getFallbackMitigationPlan(projectId).plan,
    })
  );
}

export async function generateMitigationPlan(
  projectId: string,
  forceRegenerate = false,
  modelPreference = "auto",
  apiKey?: string
): Promise<MitigationPlanResponse> {
  return requestWithFallback<MitigationPlanResponse>(
    `/projects/${projectId}/mitigation-plan/generate`,
    {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        force_regenerate: forceRegenerate,
        model_preference: modelPreference,
        api_key: apiKey,
      }),
    },
    () => getFallbackMitigationPlan(projectId)
  );
}

export async function getAvailableLlmModels(): Promise<AvailableLlmModel[]> {
  return requestWithFallback<AvailableLlmModel[]>(
    "/projects/mitigation-models",
    {},
    () => [
      {
        id: "auto",
        name: "Auto Multi-LLM Engine (DEMO / FALLBACK)",
        provider: "System",
        is_available: true,
        is_local: false,
        description: "Ensemble LLM fallback decision engine",
      },
      {
        id: "deepseek-v3",
        name: "DeepSeek-V3 Infrastructure Specialist",
        provider: "DeepSeek",
        is_available: true,
        is_local: false,
        description: "DeepSeek infrastructure risk mitigation engine",
      },
    ]
  );
}

export async function getStoredMitigationPlan(projectId: string, planId: string): Promise<MitigationPlanResponse> {
  return requestWithFallback<MitigationPlanResponse>(
    `/projects/${projectId}/mitigation-plan/${planId}`,
    {},
    () => getFallbackMitigationPlan(projectId)
  );
}

export async function downloadMitigationPdf(
  projectId: string,
  planId?: string,
  plan?: StructuredMitigationPlan,
  modelName?: string
): Promise<Blob> {
  if (isFallbackMode()) {
    return new Blob([`PRISM Mitigation Report (DEMO / FALLBACK DATA)\nProject ID: ${projectId}\nGenerated: ${new Date().toISOString()}`], { type: "application/pdf" });
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("prism_token") : null;
  const res = await fetch(`${API}/projects/${projectId}/mitigation-plan/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ project_id: projectId, plan_id: planId, plan, model: modelName }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error("Failed to generate server PDF");
  return res.blob();
}

export async function getPortfolioSummary(filters: ProjectFilters = {}): Promise<PortfolioSummary> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  return requestWithFallback<PortfolioSummary>(
    `/projects/analytics/portfolio?${params}`,
    { isCriticalEmpty: (data) => !data || data.total_projects === undefined },
    () => FALLBACK_PORTFOLIO_SUMMARY
  );
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
  return requestWithFallback<Alert[]>(
    `/alerts${qs}`,
    {},
    () => {
      let list = [...FALLBACK_ALERTS];
      if (unacknowledgedOnly) list = list.filter((a) => !a.is_acknowledged);
      if (status && status !== "ALL") list = list.filter((a) => a.status === status);
      if (limit) list = list.slice(0, limit);
      return list;
    }
  );
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  return requestWithFallback<void>(
    `/alerts/${alertId}/acknowledge`,
    { method: "POST" },
    () => undefined
  );
}

export async function updateAlertStatus(alertId: string, status: string): Promise<Alert> {
  return requestWithFallback<Alert>(
    `/alerts/${alertId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    () => {
      const found = FALLBACK_ALERTS.find((a) => a.id === alertId) || FALLBACK_ALERTS[0];
      return { ...found, id: alertId, status: status as any };
    }
  );
}

export async function acknowledgeAllAlerts(): Promise<{ status: string; acknowledged_count: number }> {
  return requestWithFallback<{ status: string; acknowledged_count: number }>(
    `/alerts/acknowledge-all`,
    { method: "POST" },
    () => ({ status: "success", acknowledged_count: FALLBACK_ALERTS.length })
  );
}

// ── Action Items & Interventions ───────────────
export async function getActionSummary(): Promise<ActionSummary> {
  return requestWithFallback<ActionSummary>(
    "/actions/summary",
    {},
    () => FALLBACK_ACTION_SUMMARY
  );
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
  return requestWithFallback<ActionItem[]>(
    `/actions${qStr}`,
    {},
    () => {
      let list = [...FALLBACK_ACTIONS];
      if (params?.status && params.status !== "all") list = list.filter((a) => a.status === params.status);
      if (params?.priority && params.priority !== "all") list = list.filter((a) => a.priority === params.priority);
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter((a) => a.title.toLowerCase().includes(q) || (a.project_name || "").toLowerCase().includes(q));
      }
      return list;
    }
  );
}

export async function getActionDetail(actionId: string): Promise<ActionItem> {
  return requestWithFallback<ActionItem>(
    `/actions/${actionId}`,
    {},
    () => FALLBACK_ACTIONS.find((a) => a.id === actionId) || FALLBACK_ACTIONS[0]
  );
}

export async function createAction(payload: Partial<ActionItem>): Promise<ActionItem> {
  return requestWithFallback<ActionItem>(
    "/actions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    () => ({
      id: `fb-act-${Date.now()}`,
      title: payload.title || "Fallback Action Directive",
      priority: payload.priority || "high",
      status: "in_progress",
      project_name: payload.project_name || "Fallback Project",
      created_at: new Date().toISOString(),
      ...payload,
    } as ActionItem)
  );
}

export async function updateAction(actionId: string, payload: Partial<ActionItem>): Promise<ActionItem> {
  return requestWithFallback<ActionItem>(
    `/actions/${actionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    () => {
      const item = FALLBACK_ACTIONS.find((a) => a.id === actionId) || FALLBACK_ACTIONS[0];
      return { ...item, ...payload };
    }
  );
}

export async function assignAction(actionId: string, payload: { officer_id: string; notes?: string }): Promise<ActionItem> {
  return requestWithFallback<ActionItem>(
    `/actions/${actionId}/assign`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    () => {
      const item = FALLBACK_ACTIONS.find((a) => a.id === actionId) || FALLBACK_ACTIONS[0];
      return { ...item, assigned_officer_id: payload.officer_id, status: "assigned" };
    }
  );
}

export async function transitionAction(actionId: string, payload: { new_status: string; comment?: string; completion_percentage?: number }): Promise<ActionItem> {
  return requestWithFallback<ActionItem>(
    `/actions/${actionId}/transition`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    () => {
      const item = FALLBACK_ACTIONS.find((a) => a.id === actionId) || FALLBACK_ACTIONS[0];
      return { ...item, status: payload.new_status as any, completion_percentage: payload.completion_percentage ?? item.completion_percentage };
    }
  );
}

export async function completeAction(actionId: string, payload: { completion_notes: string; actual_outcome?: string; evidence_url?: string }): Promise<ActionItem> {
  return requestWithFallback<ActionItem>(
    `/actions/${actionId}/complete`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    () => {
      const item = FALLBACK_ACTIONS.find((a) => a.id === actionId) || FALLBACK_ACTIONS[0];
      return { ...item, status: "completed", completion_percentage: 100, actual_outcome: payload.actual_outcome };
    }
  );
}

export async function verifyAction(actionId: string, payload: { is_approved: boolean; verification_notes: string }): Promise<ActionItem> {
  return requestWithFallback<ActionItem>(
    `/actions/${actionId}/verify`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    () => {
      const item = FALLBACK_ACTIONS.find((a) => a.id === actionId) || FALLBACK_ACTIONS[0];
      return { ...item, status: payload.is_approved ? "verified" : "in_progress", verification_notes: payload.verification_notes };
    }
  );
}

export async function listActionComments(actionId: string): Promise<ActionComment[]> {
  return requestWithFallback<ActionComment[]>(
    `/actions/${actionId}/comments`,
    {},
    () => [
      {
        id: "c-1",
        action_id: actionId,
        user_name: "Dr. S. K. Ramanathan",
        user_role: "Deputy Secretary",
        message: `[${FALLBACK_LABEL}] EPSC review convened. State nodal officers notified for expedited site handover.`,
        created_at: new Date().toISOString(),
      },
    ]
  );
}

export async function addActionComment(actionId: string, message: string): Promise<ActionComment> {
  return requestWithFallback<ActionComment>(
    `/actions/${actionId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
    () => ({
      id: `c-${Date.now()}`,
      action_id: actionId,
      user_name: "Monitoring Officer",
      user_role: "Officer",
      message,
      created_at: new Date().toISOString(),
    })
  );
}

export async function getActionHistory(actionId: string): Promise<ActionHistoryItem[]> {
  return requestWithFallback<ActionHistoryItem[]>(
    `/actions/${actionId}/history`,
    {},
    () => [
      {
        id: "h-1",
        action_id: actionId,
        changed_by_name: "Admin System",
        previous_status: null,
        new_status: "pending",
        event_type: "CREATED",
        comment: `[${FALLBACK_LABEL}] Action initiated via automated risk escalation`,
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ]
  );
}

export async function listOfficers(): Promise<OfficerProfile[]> {
  return requestWithFallback<OfficerProfile[]>(
    "/actions/officers",
    {},
    () => [
      { id: "off-001", full_name: "Sri A. K. Verma", email: "ak.verma@nic.in", role: "decision_maker", designation: "Joint Secretary (Infra Monitoring)", department_or_ministry: "MoSPI", active_actions_count: 3 },
      { id: "off-002", full_name: "Ms. Priyadarshini Rao", email: "p.rao@nic.in", role: "monitoring_officer", designation: "Director (Aviation Monitoring)", department_or_ministry: "MoCA", active_actions_count: 2 },
    ]
  );
}

export async function getRecommendedOfficer(projectId: string): Promise<OfficerRecommendation> {
  return requestWithFallback<OfficerRecommendation>(
    `/actions/recommend-officer/${projectId}`,
    {},
    () => ({
      officer: { id: "off-001", full_name: "Sri A. K. Verma", email: "ak.verma@nic.in", role: "decision_maker", designation: "Joint Secretary (Infra Monitoring)", department_or_ministry: "MoSPI", active_actions_count: 3 },
      match_reason: "Specialist oversight in central infrastructure projects",
      relevance_score: 0.94,
    })
  );
}

export async function generateAiIntervention(projectId: string, alertId?: string): Promise<ActionAiRecommendation> {
  return requestWithFallback<ActionAiRecommendation>(
    "/actions/ai-recommend",
    {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, alert_id: alertId || undefined }),
    },
    () => ({
      title: "Expedite Sub-Structure Geotechnical Rectification & EPSC Coordination",
      root_cause: "High time elapsed ratio and progress-expenditure disconnect.",
      recommended_action: "Establish high-level state empowered committee under GFR Rule 175.",
      expected_outcome: "Mitigate 6-12 months of further schedule slippage.",
      suggested_priority: "critical",
      suggested_officer_id: "off-001",
      suggested_officer_name: "Sri A. K. Verma",
      shap_factors: [
        { factor: "Time Elapsed Ratio", weight: 0.38 },
        { factor: "Burn Progress Gap", weight: 0.24 },
      ],
      disclaimer: `[${FALLBACK_LABEL}] Decision-support recommendation. Confirm through departmental review.`,
    })
  );
}

export async function deleteAction(actionId: string): Promise<{ status: string; deleted_id: string }> {
  return requestWithFallback<{ status: string; deleted_id: string }>(
    `/actions/${actionId}`,
    { method: "DELETE" },
    () => ({ status: "deleted", deleted_id: actionId })
  );
}

export async function parseOutsideFile(file: File): Promise<any> {
  if (isFallbackMode()) {
    return {
      status: "fallback_parsed",
      file_name: file.name,
      extracted_projects: FALLBACK_PROJECTS.slice(0, 3),
      data_source: FALLBACK_LABEL,
    };
  }

  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/parse-document`, {
    method: "POST",
    headers,
    body: formData,
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload error");
  }
  return res.json();
}

export async function generateLlmBriefing(payload: Record<string, any> = {}): Promise<any> {
  return requestWithFallback<any>(
    "/projects/llm-briefing",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    () => ({
      briefing: `[${FALLBACK_LABEL}] Executive Portfolio Intelligence Briefing: Analysis across 16 monitored national projects highlights critical interventions required in Railways, Water Resources, and Civil Aviation. GFR Rule 175 compliance audits are currently recommended for projects with cost revisions exceeding 20%.`,
      model: "Qwen-2.5-72B (DEMO / FALLBACK DATA)",
    })
  );
}

export async function uploadTemporaryMonthlyPdf(file: File): Promise<any> {
  if (isFallbackMode()) {
    return {
      session_id: "demo-session-fb",
      file_name: file.name,
      total_extracted: FALLBACK_PROJECTS.length,
      data_source: FALLBACK_LABEL,
      projects: FALLBACK_PROJECTS,
    };
  }

  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/temporary-analysis/upload`, {
    method: "POST",
    headers,
    body: formData,
    signal: AbortSignal.timeout(180000),
  });

  const body = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) {
    const msg = typeof body?.detail === "object" ? (body.detail.detail || body.detail.error || JSON.stringify(body.detail)) : body?.detail;
    throw new Error(msg || "Upload error");
  }
  return body;
}

export async function getTemporaryProjects(sessionId: string): Promise<any> {
  return requestWithFallback<any>(
    `/temporary-analysis/${sessionId}/projects`,
    {},
    () => FALLBACK_PROJECTS
  );
}

export async function generateTemporaryMitigation(sessionId: string, projectId: string): Promise<any> {
  return requestWithFallback<any>(
    `/temporary-analysis/${encodeURIComponent(sessionId)}/projects/${encodeURIComponent(projectId)}/mitigation`,
    { method: "POST" },
    () => getFallbackMitigationPlan(projectId)
  );
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
  return requestWithFallback<any>(
    `/temporary-analysis/${sessionId}`,
    { method: "DELETE" },
    () => ({ status: "deleted", session_id: sessionId })
  );
}

export async function getFileAnalysisModelStatuses(): Promise<any> {
  return requestWithFallback<any>(
    "/file-analysis/models/status",
    {},
    () => ({ status: "ready", model: "Fallback Model Pipeline", data_source: FALLBACK_LABEL })
  );
}

// ── Analytics ──────────────────────────────────
export async function getModelMetrics(): Promise<any> {
  return requestWithFallback<any>(
    "/analytics/model-metrics",
    {},
    () => FALLBACK_MODEL_METRICS
  );
}

export async function getBenchmarking(): Promise<any> {
  return requestWithFallback<any>(
    "/analytics/benchmarking",
    {},
    () => FALLBACK_BENCHMARKING
  );
}

export async function getCostDrivers(sector?: string): Promise<any> {
  const qs = sector ? `?sector=${encodeURIComponent(sector)}` : "";
  return requestWithFallback<any>(
    `/analytics/cost-drivers${qs}`,
    {},
    () => FALLBACK_COST_DRIVERS
  );
}

export async function getEarlyWarnings(
  params?: { limit?: number; severity?: string; sector?: string } | number
): Promise<any> {
  const qs = new URLSearchParams();
  if (typeof params === "number") {
    qs.set("limit", String(params));
  } else {
    const limit = params?.limit ?? 2500;
    qs.set("limit", String(limit));
    if (params?.severity && params.severity !== "all") qs.set("severity", params.severity);
    if (params?.sector && params.sector !== "all") qs.set("sector", params.sector);
  }

  return requestWithFallback<any>(
    `/analytics/early-warning?${qs.toString()}`,
    {},
    () => {
      let list = [...FALLBACK_EARLY_WARNINGS.warnings];
      if (typeof params === "object") {
        if (params?.severity && params.severity !== "all") {
          list = list.filter((w) => w.severity === params.severity);
        }
        if (params?.sector && params.sector !== "all") {
          list = list.filter((w) => w.sector.toLowerCase() === params.sector!.toLowerCase());
        }
        if (params?.limit) {
          list = list.slice(0, params.limit);
        }
      }
      return {
        ...FALLBACK_EARLY_WARNINGS,
        total: list.length,
        warnings: list,
      };
    }
  );
}

// ── Citizen Portal ─────────────────────────────
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

  return requestWithFallback<PublicProjectsResponse>(
    `/public/projects?${params}`,
    {},
    () => {
      const page = filters.page || 1;
      const pageSize = filters.page_size || 20;
      const projs = getFallbackProjects({
        search: filters.search,
        state: filters.state,
        sector: filters.sector,
        ministry: filters.ministry,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      });

      return {
        data: projs.map((p) => ({
          id: p.id,
          project_id: p.id,
          project_name: p.project_name,
          state: p.state,
          district: p.district || null,
          sector: p.sector,
          ministry: p.ministry,
          agency: p.agency || null,
          location_name: p.location_name || null,
          latitude: p.latitude,
          longitude: p.longitude,
          original_cost_cr: p.original_cost_cr,
          revised_cost_cr: p.revised_cost_cr,
          cumulative_expenditure_cr: p.cumulative_expenditure_cr,
          physical_progress_pct: p.physical_progress_pct,
          source_pdf_page: p.source_pdf_page,
          report_month: p.report_month,
          sl_no: p.sl_no,
          public_status: (p.delay_probability ?? 0) > 0.6 ? "DELAYED" : (p.delay_probability ?? 0) > 0.3 ? "ACTIVE_MONITORING" : "ON_SCHEDULE",
          grievances_count: 2,
        })),
        pagination: {
          total: FALLBACK_PROJECTS.length,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(FALLBACK_PROJECTS.length / pageSize),
          has_next: page * pageSize < FALLBACK_PROJECTS.length,
          has_prev: page > 1,
        },
        counts_by_status: {
          ALL: FALLBACK_PROJECTS.length,
          ON_SCHEDULE: FALLBACK_PROJECTS.filter((p) => (p.delay_probability ?? 0) <= 0.3).length,
          ACTIVE_MONITORING: FALLBACK_PROJECTS.filter((p) => (p.delay_probability ?? 0) > 0.3 && (p.delay_probability ?? 0) <= 0.6).length,
          DELAYED: FALLBACK_PROJECTS.filter((p) => (p.delay_probability ?? 0) > 0.6).length,
        },
      };
    }
  );
}

export async function getPublicFilterOptions(): Promise<PublicFilterOptions> {
  return requestWithFallback<PublicFilterOptions>(
    "/public/filter-options",
    {},
    () => ({
      states: Array.from(new Set(FALLBACK_PROJECTS.map((p) => p.state))).sort(),
      sectors: Array.from(new Set(FALLBACK_PROJECTS.map((p) => p.sector))).sort(),
      ministries: Array.from(new Set(FALLBACK_PROJECTS.map((p) => p.ministry))).sort(),
      agencies: ["AAI", "NHAI", "NHSRCL", "BMRCL", "DFCCIL", "IOCL", "NPCIL"],
      counts_by_status: {
        ALL: FALLBACK_PROJECTS.length,
        ON_SCHEDULE: 5,
        ACTIVE_MONITORING: 6,
        DELAYED: 5,
      },
      total: FALLBACK_PROJECTS.length,
    })
  );
}

export async function getPublicProject(id: string): Promise<PublicProjectDetail> {
  return requestWithFallback<PublicProjectDetail>(
    `/public/projects/${id}`,
    {},
    () => {
      const p = getFallbackProject(id);
      const raw = FALLBACK_PROJECTS.find((x) => x.id === p.id) || FALLBACK_PROJECTS[0];
      return {
        id: p.id,
        project_id: p.id,
        project_name: p.project_name,
        state: p.state,
        district: raw.district || null,
        sector: p.sector,
        ministry: p.ministry,
        location_name: raw.location_name || raw.place || null,
        latitude: p.latitude,
        longitude: p.longitude,
        original_cost_cr: p.original_cost_cr,
        revised_cost_cr: p.revised_cost_cr,
        cumulative_expenditure_cr: p.cumulative_expenditure_cr,
        physical_progress_pct: p.physical_progress_pct,
        burn_rate_pct: p.burn_rate_pct,
        burn_progress_gap: p.burn_progress_gap,
        time_elapsed_ratio: p.time_elapsed_ratio,
        scheduled_completion_date: p.scheduled_completion_date,
        revised_completion_date: p.revised_completion_date,
        source_pdf_page: p.source_pdf_page,
        report_month: p.report_month,
        public_status: "ACTIVE_MONITORING",
        grievances_count: 2,
        milestones: p.milestones.map((m) => ({
          milestone_name: m.milestone_name,
          scheduled_date: m.scheduled_date,
          is_completed: m.is_completed,
        })),
      };
    }
  );
}

export async function submitCitizenGrievance(payload: CitizenGrievanceCreate): Promise<CitizenGrievanceOut> {
  return requestWithFallback<CitizenGrievanceOut>(
    "/public/grievances",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    () => ({
      id: `grv-fb-${Date.now()}`,
      reference_id: `GRV-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      project_id: payload.project_id,
      citizen_name: payload.citizen_name,
      citizen_phone: payload.citizen_phone,
      citizen_email: payload.citizen_email,
      category: payload.category,
      description: payload.description,
      pincode: payload.pincode,
      status: "SUBMITTED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  );
}

export async function trackCitizenGrievance(referenceId: string): Promise<CitizenGrievanceOut> {
  return requestWithFallback<CitizenGrievanceOut>(
    `/public/grievances/${encodeURIComponent(referenceId)}`,
    {},
    () => ({
      reference_id: referenceId,
      project_id: "fb-proj-001",
      citizen_name: "Citizen Contributor",
      grievance_text: "Inquiry regarding pedestrian connectivity and local access roads.",
      status: "UNDER_INVESTIGATION",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    } as any)
  );
}

// ── Fraud & Cartels ────────────────────────────
export async function getFraudAndCartelAnalytics(minCostCr = 50.0, limitCases = 25): Promise<FraudAnalyticsResponse> {
  return requestWithFallback<FraudAnalyticsResponse>(
    `/analytics/fraud-detection?min_cost_cr=${minCostCr}&limit_cases=${limitCases}`,
    {},
    () => FALLBACK_FRAUD_ANALYTICS
  );
}

export async function getProjectGFR175Screening(projectId: string): Promise<GFR175ScreeningResult> {
  return requestWithFallback<GFR175ScreeningResult>(
    `/analytics/fraud-detection/gfr175/${encodeURIComponent(projectId)}`,
    {},
    () => {
      const p = getFallbackProject(projectId);
      const isClean = p && (p.burn_progress_gap == null || Math.abs(p.burn_progress_gap) < 5);
      const isSevere = p && (p.burn_rate_pct != null && p.burn_rate_pct >= 35 && p.physical_progress_pct != null && p.physical_progress_pct <= 15);
      
      const status = isClean
        ? "No Integrity Indicators Detected"
        : isSevere
        ? "Potential Integrity Concern"
        : "Compliance Review Required";
      const color = isClean ? "GREEN" : isSevere ? "RED" : "YELLOW";
      const indicators = isClean
        ? []
        : isSevere
        ? [`Unusual expenditure pattern: ₹${p?.cumulative_expenditure_cr ?? 850} Cr disbursed while validated physical progress is ${p?.physical_progress_pct ?? 12}%`]
        : ["Billing anomaly: Milestone disbursement acceleration without matching physical handover"];

      return {
        contractor_id: `cntr-fb-${projectId.slice(0, 5)}`,
        contractor_name: (p as any)?.contractor || "Infrastructure EPC Consortium",
        project_id: projectId,
        project_name: p?.project_name || "Infrastructure Project Baseline",
        risk_score: 0.65,
        risk_tier: ((p as any)?.risk_tier || "MEDIUM").toUpperCase(),
        gfr175_screening_status: status as any,
        status_color: color as any,
        indicators,
        evidence: {
          source_document: p?.source_document || "FlashReport_April_2026.pdf",
          source_page: p?.source_pdf_page || 88,
          sl_no: p?.sl_no || 1,
          report_month: p?.report_month || "April 2026",
          description: `${p?.report_month || "April 2026"} Flash Report — Page ${p?.source_pdf_page || 88}`,
        },
        explanation: `Statutory compliance screening record evaluated under GFR 175 integrity provisions for ${p?.project_name || "Project"}.`,
        generated_at: new Date().toISOString(),
        advisory_only: true,
        advisory_notice: "Advisory screening — final determination remains with authorized officials. This statutory screening does not establish a legal violation or constitute administrative disqualification.",
      };
    }
  );
}

// ── Field Evidence ─────────────────────────────
export async function listFieldEvidence(projectId?: string, verifiedOnly?: boolean): Promise<FieldEvidenceOut[]> {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  if (verifiedOnly !== undefined) params.set("verified_only", String(verifiedOnly));
  return requestWithFallback<FieldEvidenceOut[]>(
    `/field-evidence?${params}`,
    {},
    () => [
      {
        id: "fe-1",
        project_id: projectId || "fb-proj-001",
        location_lat: 14.51,
        location_lng: 78.7725,
        title: `[${FALLBACK_LABEL}] Terminal Sub-structure Ground Verification`,
        description: "Physical inspection of pier cap concrete pouring completed.",
        verified: true,
        created_at: new Date().toISOString(),
      } as any,
    ]
  );
}

export async function submitFieldEvidence(payload: FieldEvidenceCreate): Promise<FieldEvidenceOut> {
  return requestWithFallback<FieldEvidenceOut>(
    "/field-evidence",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    () => ({
      id: `fe-${Date.now()}`,
      ...payload,
      verified: false,
      created_at: new Date().toISOString(),
    } as any)
  );
}

// ── External Integrations ──────────────────────
export async function getIntegrationsStatus(): Promise<IntegrationsStatusResponse> {
  return requestWithFallback<IntegrationsStatusResponse>(
    "/integrations/status",
    {},
    () => ({
      gatishakti: { status: "connected_fallback", last_sync: new Date().toISOString() },
      digilocker: { status: "connected_fallback", total_verified: 42 },
      alert_dispatch: { sms: "active", email: "active" },
      data_source: FALLBACK_LABEL,
    } as any)
  );
}

export async function syncGatiShakti(projectId: string, bufferKm = 5.0): Promise<any> {
  return requestWithFallback<any>(
    "/integrations/gatishakti/sync",
    {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, corridor_buffer_km: bufferKm }),
    },
    () => ({ status: "synced_fallback", corridor_buffer_km: bufferKm, data_source: FALLBACK_LABEL })
  );
}

export async function verifyDigiLocker(projectId: string, docType: string, docIdentifier: string): Promise<any> {
  return requestWithFallback<any>(
    "/integrations/digilocker/verify",
    {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, doc_type: docType, doc_identifier: docIdentifier }),
    },
    () => ({ status: "verified", certificate_id: `DL-${Date.now()}`, data_source: FALLBACK_LABEL })
  );
}

export async function dispatchAlert(projectId: string, service: "sms" | "email", recipient: string, message: string): Promise<any> {
  return requestWithFallback<any>(
    "/integrations/dispatch-alert",
    {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, service, recipient, message }),
    },
    () => ({ status: "dispatched_fallback", service, recipient })
  );
}

export async function getIntegrationLogs(service?: string, limit = 50): Promise<IntegrationLogOut[]> {
  const qs = service ? `?service=${encodeURIComponent(service)}&limit=${limit}` : `?limit=${limit}`;
  return requestWithFallback<IntegrationLogOut[]>(
    `/integrations/logs${qs}`,
    {},
    () => [
      {
        id: "log-1",
        service_name: service || "gatishakti",
        event_type: "GIS_BUFFER_CHECK",
        status: "SUCCESS",
        timestamp: new Date().toISOString(),
      } as any,
    ]
  );
}

// ── Notifications ──────────────────────────────
export async function listNotifications(unreadOnly = false, limit = 50): Promise<import("./types").Notification[]> {
  const qs = new URLSearchParams();
  if (unreadOnly) qs.set("unread_only", "true");
  qs.set("limit", String(limit));
  return requestWithFallback<import("./types").Notification[]>(
    `/notifications?${qs}`,
    {},
    () => [
      {
        id: "notif-1",
        title: `[${FALLBACK_LABEL}] Critical Risk Escalation Alert`,
        body: "Polavaram Dam Project schedule slippage reached 48 months.",
        notification_type: "CRITICAL_ALERT",
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      } as any,
      {
        id: "notif-2",
        title: `[${FALLBACK_LABEL}] GFR 175 Steering Directive Issued`,
        body: "Kadapa Airport sub-structure audit directive awaiting clearance.",
        notification_type: "ACTION_REQUIRED",
        is_read: true,
        created_at: new Date(Date.now() - 7200000).toISOString(),
      } as any,
    ]
  );
}

export async function getUnreadNotificationCount(): Promise<{ unread_count: number }> {
  return requestWithFallback<{ unread_count: number }>(
    "/notifications/unread-count",
    {},
    () => ({ unread_count: 1 })
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  return requestWithFallback<void>(
    `/notifications/${id}/read`,
    { method: "POST" },
    () => undefined
  );
}

export async function markAllNotificationsRead(): Promise<{ status: string; marked_count: number }> {
  return requestWithFallback<{ status: string; marked_count: number }>(
    "/notifications/read-all",
    { method: "POST" },
    () => ({ status: "success", marked_count: 1 })
  );
}

// ── Audit Logs ─────────────────────────────────
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
  return requestWithFallback<import("./types").AuditLog[]>(
    `/audit?${qs}`,
    {},
    () => [
      {
        id: "aud-1",
        action: "MODEL_PREDICTION_RUN",
        entity_type: "PROJECT",
        entity_id: "fb-proj-001",
        user_email: "system@prism.gov.in",
        created_at: new Date().toISOString(),
      } as any,
    ]
  );
}

export async function getAuditSummary(): Promise<any> {
  return requestWithFallback<any>(
    "/audit/summary",
    {},
    () => ({ total_logs: 124, today_actions: 14, high_risk_actions: 2, data_source: FALLBACK_LABEL })
  );
}

// ── Documents ──────────────────────────────────
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
  return requestWithFallback<any>(
    `/documents?${qs}`,
    {},
    () => [
      {
        id: "doc-fb-1",
        project_id: params?.project_id || "fb-proj-001",
        title: `FlashReport_April_2026.pdf (DEMO / FALLBACK DATA)`,
        document_type: "flash_report",
        report_month: "April 2026",
        upload_date: "2026-04-10",
        verified: true,
      },
    ]
  );
}

export async function listProjectDocuments(projectId: string, docType?: string): Promise<any> {
  const qs = docType ? `?doc_type=${encodeURIComponent(docType)}` : "";
  return requestWithFallback<any>(
    `/documents/project/${projectId}${qs}`,
    {},
    () => [
      {
        id: "doc-fb-1",
        project_id: projectId,
        title: "FlashReport_April_2026.pdf (DEMO / FALLBACK DATA)",
        document_type: "flash_report",
        report_month: "April 2026",
        upload_date: "2026-04-10",
        verified: true,
      },
    ]
  );
}

export async function getDocumentAnalytics(): Promise<any> {
  return requestWithFallback<any>(
    "/documents/analytics",
    {},
    () => ({ total_documents: 18, verified_count: 18, data_source: FALLBACK_LABEL })
  );
}

export async function getDocument(id: string): Promise<any> {
  return requestWithFallback<any>(
    `/documents/${id}`,
    {},
    () => ({
      id,
      title: "FlashReport_April_2026.pdf (DEMO / FALLBACK DATA)",
      document_type: "flash_report",
      verified: true,
      summary: `[${FALLBACK_LABEL}] Official MoSPI April 2026 Project Monitoring Report.`,
    })
  );
}

export async function askDocument(id: string, question: string): Promise<any> {
  return requestWithFallback<any>(
    `/documents/${id}/ask`,
    {
      method: "POST",
      body: JSON.stringify({ question }),
    },
    () => ({
      answer: `[${FALLBACK_LABEL}] Based on cited MoSPI report records: ${question} is addressed under sector monitoring guidelines.`,
      citation: "Page 55, FlashReport_April_2026.pdf",
    })
  );
}

export async function getProjectDocumentTimeline(projectId: string): Promise<any> {
  return requestWithFallback<any>(
    `/documents/project/${projectId}/timeline`,
    {},
    () => [
      { id: "tl-1", title: "MoSPI Monthly Flash Report — April 2026", document_type: "flash_report", report_month: "April 2026", verified: true, upload_date: "2026-04-05" },
      { id: "tl-2", title: "Expenditure Sanction & Bill Certification", document_type: "expenditure_bill", report_month: "March 2026", verified: true, upload_date: "2026-03-25" },
    ]
  );
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
  return requestWithFallback<any>(
    "/documents",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    () => ({ id: `doc-${Date.now()}`, ...payload, verified: false, created_at: new Date().toISOString() })
  );
}

export async function deleteDocument(docId: string): Promise<any> {
  return requestWithFallback<any>(
    `/documents/${docId}`,
    { method: "DELETE" },
    () => ({ status: "deleted", id: docId })
  );
}

export async function verifyDocument(docId: string): Promise<any> {
  return requestWithFallback<any>(
    `/documents/${docId}/verify`,
    { method: "PATCH" },
    () => ({ status: "verified", id: docId })
  );
}

// ── Reports ────────────────────────────────────
export function getPortfolioCsvUrl(params?: { state?: string; sector?: string; ministry?: string; risk_tier?: string }): string {
  const qs = new URLSearchParams();
  if (params?.state) qs.set("state", params.state);
  if (params?.sector) qs.set("sector", params.sector);
  if (params?.ministry) qs.set("ministry", params.ministry);
  if (params?.risk_tier) qs.set("risk_tier", params.risk_tier);
  return `${BASE_URL}/api/v1/reports/portfolio/csv?${qs}`;
}

export async function getPortfolioReportJson(params?: { state?: string; sector?: string; ministry?: string }): Promise<any> {
  const qs = new URLSearchParams();
  if (params?.state) qs.set("state", params.state);
  if (params?.sector) qs.set("sector", params.sector);
  if (params?.ministry) qs.set("ministry", params.ministry);
  return requestWithFallback<any>(
    `/reports/portfolio/json?${qs}`,
    {},
    () => ({
      portfolio_summary: FALLBACK_PORTFOLIO_SUMMARY,
      projects: FALLBACK_PROJECTS,
      data_source: FALLBACK_LABEL,
    })
  );
}

export async function getProjectReportSummary(projectId: string): Promise<any> {
  return requestWithFallback<any>(
    `/reports/project/${projectId}/summary`,
    {},
    () => ({
      project: getFallbackProject(projectId),
      prediction: getFallbackPrediction(projectId),
      data_source: FALLBACK_LABEL,
    })
  );
}

export async function getDataQualityReport(): Promise<import("./types").DataQualityReport> {
  return requestWithFallback<import("./types").DataQualityReport>(
    "/reports/data-quality",
    {},
    () => ({
      total_records_audited: FALLBACK_PROJECTS.length,
      coordinate_coverage_pct: 100.0,
      cost_reconciliation_rate_pct: 100.0,
      data_source: FALLBACK_LABEL,
    } as any)
  );
}

// ── Project History & Milestones ───────────────
export async function getProjectHistory(projectId: string): Promise<import("./types").ProjectHistoryResponse> {
  return requestWithFallback<import("./types").ProjectHistoryResponse>(
    `/projects/${projectId}/history`,
    {},
    () => ({
      project_id: projectId,
      history: [
        {
          report_month: "April 2026",
          physical_progress_pct: 65.0,
          cumulative_expenditure_cr: 129.07,
          burn_rate_pct: 48.54,
          burn_progress_gap: -16.46,
          risk_tier: "high",
          composite_risk_score: 0.5338,
          delay_probability: 0.9417,
          cost_overrun_probability: 0.0352,
          predicted_delay_months: 18,
          is_fallback: true,
        },
        {
          report_month: "March 2026",
          physical_progress_pct: 62.0,
          cumulative_expenditure_cr: 122.5,
          burn_rate_pct: 46.06,
          burn_progress_gap: -15.94,
          risk_tier: "high",
          composite_risk_score: 0.521,
          delay_probability: 0.925,
          cost_overrun_probability: 0.031,
          predicted_delay_months: 16,
          is_fallback: true,
        },
      ],
      data_source: FALLBACK_LABEL,
    } as any)
  );
}

export async function getProjectMilestones(projectId: string): Promise<import("./types").ProjectMilestonesResponse> {
  return requestWithFallback<import("./types").ProjectMilestonesResponse>(
    `/projects/${projectId}/milestones`,
    {},
    () => ({
      project_id: projectId,
      milestones: getFallbackProject(projectId).milestones,
      data_source: FALLBACK_LABEL,
    } as any)
  );
}

// ── Platform Health Checks ─────────────────────
export async function getPlatformHealth(): Promise<any> {
  return requestWithFallback<any>(
    "/health",
    {},
    () => ({ status: isFallbackMode() ? "offline_fallback" : "healthy", mode: getDataMode() })
  );
}

export async function getDatabaseHealth(): Promise<any> {
  return requestWithFallback<any>(
    "/health/database",
    {},
    () => ({ status: isFallbackMode() ? "fallback_sqlite_memory" : "healthy", mode: getDataMode() })
  );
}

export async function getMlHealth(): Promise<any> {
  return requestWithFallback<any>(
    "/health/ml",
    {},
    () => ({ status: isFallbackMode() ? "fallback_heuristics" : "healthy", mode: getDataMode() })
  );
}

export async function getLlmHealth(): Promise<any> {
  return requestWithFallback<any>(
    "/health/llm",
    {},
    () => ({ status: isFallbackMode() ? "fallback_directives" : "healthy", mode: getDataMode() })
  );
}
