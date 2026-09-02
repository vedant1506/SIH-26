// =============================================
// API Client — SIH26103
// ALL API calls go through this file.
// Never call Supabase directly from pages.
// =============================================

import { getToken } from "./auth";
import type {
  Project, ProjectListItem, RiskPrediction, Alert,
  PortfolioSummary, User, PredictRequest,
  StructuredMitigationPlan, MitigationPlanResponse
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

  const res = await fetch(`${API}${path}`, { ...options, headers });

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
  return request<ProjectListItem[]>(`/projects?${params}`);
}

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

export async function generateMitigationPlan(projectId: string, forceRegenerate = false): Promise<MitigationPlanResponse> {
  return request<MitigationPlanResponse>(`/projects/${projectId}/mitigation-plan`, {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, force_regenerate: forceRegenerate }),
  });
}

export async function downloadMitigationPdf(projectId: string, plan: StructuredMitigationPlan, modelName?: string): Promise<Blob> {
  const token = typeof window !== "undefined" ? localStorage.getItem("prism_token") : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const res = await fetch(`${baseUrl}/projects/${projectId}/mitigation-plan/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ project_id: projectId, plan, model: modelName }),
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
export async function listAlerts(unacknowledgedOnly = false, limit?: number): Promise<Alert[]> {
  const params = new URLSearchParams();
  if (unacknowledgedOnly) params.set("unacknowledged_only", "true");
  if (limit !== undefined && limit !== null && limit > 0) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<Alert[]>(`/alerts${qs}`);
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  return request<void>(`/alerts/${alertId}/acknowledge`, { method: "POST" });
}

export async function acknowledgeAllAlerts(): Promise<{ status: string; acknowledged_count: number }> {
  return request<{ status: string; acknowledged_count: number }>(`/alerts/acknowledge-all`, { method: "POST" });
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


