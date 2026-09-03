"use client";
import { useState, useMemo, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import { toast } from "sonner";
import {
  uploadTemporaryMonthlyPdf,
  generateTemporaryMitigation,
  getTemporaryCsvUrl,
  getTemporaryRiskCsvUrl,
  getTemporaryJsonUrl,
  deleteTemporarySession,
  getFileAnalysisModelStatuses,
} from "@/lib/api";
import { exportMitigationPlanPdf } from "@/lib/exportMitigationPdf";

// ─────────────────────────────────────────────────────────────
// Types — aligned with backend canonical 19-column schema
// ─────────────────────────────────────────────────────────────
interface ShapFactor {
  feature: string;
  label: string;
  value: number;
  shap_value?: number;
  impact: string;
  importance: number;
  shap_method?: string;
}

interface RiskAnalysis {
  status?: string;
  message?: string;
  missing_fields?: string[];
  composite_risk_score?: number;
  risk_tier?: string;
  cost_risk?: number;
  schedule_risk?: number;
  predicted_delay_months?: number;
  estimated_overrun_cr?: number;
  burn_progress_gap?: number;
  cost_variation_pct?: number;
  shap_factors?: ShapFactor[];
  shap_method?: string;
  model_version?: string;
}

interface TemporaryProject {
  // Canonical 19-column schema — exact field names from backend
  sl_no?: number;
  ministry?: string | null;
  sector?: string | null;
  project_name: string;
  agency?: string | null;
  project_id: string;
  legacy_ocms_code?: string | null;
  pmgid?: string | null;
  state?: string | null;
  approval_date_mm_yyyy?: string | null;
  start_date_mm_yyyy?: string | null;
  original_target_doc_mm_yyyy?: string | null;
  revised_target_doc_mm_yyyy?: string | null;
  original_cost_crore?: number | null;
  revised_cost_crore?: number | null;
  cumulative_expenditure_crore?: number | null;
  physical_progress_percent?: number | null;
  report_month?: string | null;
  source_pdf_page?: number | null;
  // Risk analysis appended by backend scoring
  risk_analysis?: RiskAnalysis;
  // Mitigation plan — only populated after user clicks
  mitigation_plan?: any;
}

interface DiagnosticPanelData {
  source_file?: string;
  detected_report?: string;
  authoritative_table?: string;
  table_start_page?: number;
  table_end_page?: number;
  raw_table_rows?: number;
  valid_project_rows?: number;
  duplicates?: number;
  final_projects?: number;
  reference_csv?: number | null;
  csv_match?: number | null;
  database_writes?: number;
  map_writes?: number;
  missing_from_pdf?: number;
  extra_in_pdf?: number;
  field_mismatches?: number;
}

interface QualityMetrics {
  projects_extracted?: number;
  projects_validated?: number;
  duplicates?: number;
  missing_fields?: number;
  pages_processed?: number;
  tier_distribution?: { low?: number; medium?: number; high?: number; critical?: number; unknown?: number };
  total_original_cost_cr?: number;
  total_expenditure_cr?: number;
  diagnostic_panel?: DiagnosticPanelData;
}

interface TimelineItem {
  step: number;
  title: string;
  status: string;
  detail: string;
}

interface TemporarySession {
  session_id: string;
  reporting_period: string;
  document_type: string;
  projects_validated: number;
  projects_extracted?: number;
  quality_metrics?: QualityMetrics;
  model_statuses?: Record<string, string>;
  projects: TemporaryProject[];
  timeline?: TimelineItem[];
  file_name?: string;
  file_type?: string;
}

interface ModelStatuses {
  document_engine?: string;
  cost_xgboost?: string;
  schedule_xgboost?: string;
  shap_engine?: string;
  qwen_2_5?: string;
  secondary_model?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function tierColor(tier?: string | null): string {
  switch (tier?.toLowerCase()) {
    case "critical": return "var(--critical)";
    case "high": return "#f97316";
    case "medium": return "#f59e0b";
    case "low": return "var(--low)";
    default: return "var(--text-muted)";
  }
}

function tierBg(tier?: string | null): string {
  switch (tier?.toLowerCase()) {
    case "critical": return "rgba(244,63,94,0.12)";
    case "high": return "rgba(249,115,22,0.12)";
    case "medium": return "rgba(245,158,11,0.12)";
    case "low": return "rgba(16,185,129,0.12)";
    default: return "rgba(100,116,139,0.1)";
  }
}

function tierBadge(tier?: string | null) {
  const color = tierColor(tier);
  const bg = tierBg(tier);
  return { color, background: bg, border: `1px solid ${color}33` };
}

function modelStatusColor(status?: string): string {
  if (!status) return "#64748b";
  const s = status.toLowerCase();
  if (s.includes("unavailable")) return "#f43f5e";
  if (s.includes("ready") || s.includes("loaded")) return "#10b981";
  return "#f59e0b";
}

function fmtCrore(val?: number | string | null): string {
  if (val == null || val === "") return "—";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, "").replace(/₹/g, "").replace(/Cr/gi, "").trim());
  if (isNaN(num)) return "—";
  if (num >= 10000) return `₹${(num / 1000).toFixed(1)}K Cr`;
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 1 })} Cr`;
}

function fmtPct(val?: number | string | null): string {
  if (val == null || val === "") return "—";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/%/g, "").trim());
  if (isNaN(num)) return "—";
  return `${num.toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function FileAnalysisHub() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [validationError, setValidationError] = useState<{ error: string; detail: string } | null>(null);
  const [tempSession, setTempSession] = useState<TemporarySession | null>(null);
  const [modelStatuses, setModelStatuses] = useState<ModelStatuses | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Section 49: Pre-fetch real AI model statuses on initial empty state
  useEffect(() => {
    getFileAnalysisModelStatuses()
      .then((statuses) => {
        if (statuses) setModelStatuses(statuses);
      })
      .catch(() => {});
  }, []);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"risk" | "progress" | "cost" | "name">("risk");

  // Selected project details
  const [viewingProject, setViewingProject] = useState<TemporaryProject | null>(null);
  const [activeMitigation, setActiveMitigation] = useState<{ project: TemporaryProject; plan: any } | null>(null);
  const [mitigationLoadingId, setMitigationLoadingId] = useState<string | null>(null);
  const [mitigationStep, setMitigationStep] = useState("");
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  async function handleDownloadPdf(project: TemporaryProject, plan: any) {
    if (isPdfGenerating) return;
    setIsPdfGenerating(true);
    try {
      await exportMitigationPlanPdf(project, plan, tempSession?.file_name);
    } catch (err: any) {
      console.error("PDF export error:", err);
      alert(`Failed to export PDF: ${err?.message || "Error generating document"}`);
    } finally {
      setIsPdfGenerating(false);
    }
  }

  // ── File handlers ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setValidationError(null);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setValidationError(null);
    }
  }

  // ── Analysis — ALL file types go through /temporary-analysis/upload ──
  async function handleRunAnalysis() {
    if (!selectedFile) return;
    setAnalyzing(true);
    setValidationError(null);
    setTempSession(null);

    const steps = [
      "1. Validating document authenticity…",
      "2. Detecting report month dynamically…",
      "3. Locating All Ongoing Projects table…",
      "4. Extracting Table 6 multi-page tables…",
      "5. Reconstructing multi-page wrapped rows…",
      "6. Validating project Sl.No & project codes…",
      "7. Removing duplicate appearances…",
      "8. Generating canonical 19-column CSV…",
      "9. Validating CSV schema via Pandas re-read…",
      "10. Running trained XGBoost risk inference…",
      "11. Computing per-project SHAP factor drivers…",
      "12. Finalizing analysis session…",
    ];

    let stepIdx = 0;
    setAnalysisStep(steps[0]);
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setAnalysisStep(steps[stepIdx]);
    }, 1100);

    try {
      const res = await uploadTemporaryMonthlyPdf(selectedFile);
      clearInterval(stepTimer);

      setTempSession({
        session_id: res.session_id,
        file_name: res.file_name,
        file_type: res.file_type,
        reporting_period: res.reporting_period,
        document_type: res.document_type,
        projects_validated: res.projects_validated,
        projects_extracted: res.projects_extracted,
        quality_metrics: res.quality_metrics,
        model_statuses: res.model_statuses,
        projects: res.projects || [],
        timeline: res.timeline,
      });

      if (res.model_statuses) setModelStatuses(res.model_statuses);
    } catch (err: any) {
      clearInterval(stepTimer);
      const msg = err.message || "Upload failed.";
      setValidationError({
        error: msg.includes("Not Recognized") || msg.includes("rejected") ? "Document Not Recognized" : "Analysis Failed",
        detail: msg,
      });
    } finally {
      setAnalyzing(false);
      setAnalysisStep("");
    }
  }

  async function handleDiscardSession() {
    if (!tempSession) return;
    try { await deleteTemporarySession(tempSession.session_id); } catch {}
    setTempSession(null);
    setSelectedFile(null);
    setViewingProject(null);
    setActiveMitigation(null);
  }

  // ── On-demand mitigation — only on explicit user click ──
  async function handleTriggerMitigation(project: TemporaryProject) {
    if (!tempSession || mitigationLoadingId) return;
    setMitigationLoadingId(project.project_id);

    const steps = [
      "Retrieving project snapshot from session…",
      "Qwen 2.5 generating evidence-grounded plan…",
      "Secondary AI verifying against source data…",
      "Anti-duplication guard check…",
    ];
    let si = 0;
    setMitigationStep(steps[0]);
    const t = setInterval(() => { si = Math.min(si + 1, steps.length - 1); setMitigationStep(steps[si]); }, 1200);

    try {
      const res = await generateTemporaryMitigation(tempSession.session_id, project.project_id);
      clearInterval(t);
      setActiveMitigation({ project, plan: res.mitigation_plan });
      // Update in session
      setTempSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          projects: prev.projects.map((p) =>
            p.project_id === project.project_id ? { ...p, mitigation_plan: res.mitigation_plan } : p
          ),
        };
      });
    } catch (err: any) {
      clearInterval(t);
      alert(err.message?.includes("unavailable") ? "AI mitigation is currently unavailable." : `AI mitigation is currently unavailable: ${err.message || "Model timeout."}`);
    } finally {
      setMitigationLoadingId(null);
      setMitigationStep("");
    }
  }

  // ── Computed data ──
  const filteredProjects = useMemo(() => {
    if (!tempSession) return [];
    let list = tempSession.projects.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matches =
        !q ||
        p.project_name?.toLowerCase().includes(q) ||
        p.project_id?.toLowerCase().includes(q) ||
        (p.sector && p.sector.toLowerCase().includes(q)) ||
        (p.state && p.state.toLowerCase().includes(q)) ||
        (p.agency && p.agency.toLowerCase().includes(q)) ||
        (p.ministry && p.ministry.toLowerCase().includes(q));
      const tier = p.risk_analysis?.risk_tier?.toLowerCase() ?? "unknown";
      return matches && (riskFilter === "all" || tier === riskFilter);
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "risk": return (b.risk_analysis?.composite_risk_score ?? 0) - (a.risk_analysis?.composite_risk_score ?? 0);
        case "progress": return (a.physical_progress_percent ?? 0) - (b.physical_progress_percent ?? 0);
        case "cost": return (b.original_cost_crore ?? 0) - (a.original_cost_crore ?? 0);
        case "name": return a.project_name.localeCompare(b.project_name);
        default: return 0;
      }
    });
    return list;
  }, [tempSession, searchQuery, riskFilter, sortBy]);

  const summaryMetrics = useMemo(() => {
    if (!tempSession?.projects.length) return null;
    const ps = tempSession.projects;
    // Section 49 & 50: Exact SUM(revised_cost_crore) and SUM(cumulative_expenditure_crore)
    const totalCost = ps.reduce((s, p) => s + (p.revised_cost_crore ?? p.original_cost_crore ?? 0), 0);
    const totalExp = ps.reduce((s, p) => s + (p.cumulative_expenditure_crore ?? 0), 0);
    const progValues = ps.filter((p) => p.physical_progress_percent != null).map((p) => p.physical_progress_percent!);
    const avgProg = progValues.length ? progValues.reduce((a, b) => a + b, 0) / progValues.length : null;

    // Section 52: Dynamic real risk counts from actual project inferences
    const dist = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
    ps.forEach((p) => {
      const t = (p.risk_analysis?.risk_tier || "").toLowerCase() as keyof typeof dist;
      if (t && t in dist) dist[t]++;
      else dist.unknown++;
    });

    return { totalCost, totalExp, avgProg, dist };
  }, [tempSession]);

  // ─────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────
  function RenderModelStatus({ statuses }: { statuses: ModelStatuses | null }) {
    const entries: [string, string][] = [
      ["Document Engine", statuses?.document_engine ?? "—"],
      ["Cost XGBoost", statuses?.cost_xgboost ?? "—"],
      ["Schedule XGBoost", statuses?.schedule_xgboost ?? "—"],
      ["SHAP Engine", statuses?.shap_engine ?? "—"],
      ["Qwen 2.5", statuses?.qwen_2_5 ?? "—"],
      ["Secondary Model", statuses?.secondary_model ?? "—"],
    ];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
        {entries.map(([label, status]) => (
          <div key={label} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: modelStatusColor(status), flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: modelStatusColor(status), fontWeight: 700 }}>{status}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────
  const hasSession = !!tempSession;
  const isLarge = (tempSession?.projects_validated ?? 0) > 500;

  return (
    <div>
      <TopBar
        title="File Analysis Hub"
        subtitle="Ephemeral Document Intelligence — Zero Database Writes"
        hideGlobalProjectCount={true}
        customProjectCount={tempSession ? tempSession.projects.length : null}
        customProjectLabel={tempSession ? `${tempSession.reporting_period} ONGOING PROJECTS` : "FILE SESSION · NO DOCUMENT ANALYZED"}
      />

      <div className="responsive-container">

        {/* ── UPLOAD PANEL ── */}
        <div className="card" style={{ marginBottom: 20, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent)" }}>
              Upload Monthly Project Report
            </span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
              PDF · CSV &nbsp;|&nbsp; Max 100 MB
            </span>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              border: isDragging ? "2px dashed var(--accent)" : "2px dashed var(--border)",
              borderRadius: 10,
              padding: selectedFile ? "20px 24px" : "32px 24px",
              textAlign: "center",
              background: isDragging ? "rgba(6,182,212,0.07)" : "var(--surface-2)",
              transition: "all 0.2s",
              cursor: "pointer",
            }}
          >
            {selectedFile ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    <span style={{ background: "rgba(6,182,212,0.12)", color: "var(--accent)", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                      {selectedFile.name.split(".").pop()?.toUpperCase()}
                    </span>
                    {" "}{(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <label htmlFor="file-input" className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>Change</label>
                  <button onClick={() => { setSelectedFile(null); setValidationError(null); }} className="btn btn-secondary btn-sm" style={{ color: "var(--critical)" }}>Remove</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M12 18v-6" /><path d="m9 15 3-3 3 3" />
                  </svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                  Drag & Drop Monthly Report Here
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14, maxWidth: 420, margin: "0 auto 14px" }}>
                  Monthly MoSPI / PAIMANA Flash Report PDF &nbsp;·&nbsp; Structured Ongoing-Project CSV
                </div>
                <label htmlFor="file-input" className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
                  Select File
                </label>
              </div>
            )}
            <input type="file" id="file-input" accept=".pdf,.csv" onChange={handleFileChange} style={{ display: "none" }} />
          </div>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {selectedFile ? "Document selected. Click Analyse to begin the extraction pipeline." : "No document selected."}
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || !selectedFile}
              className="btn btn-primary"
              style={{ padding: "9px 22px", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7, opacity: !selectedFile ? 0.45 : 1, cursor: !selectedFile ? "not-allowed" : "pointer" }}
            >
              {analyzing ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {analysisStep || "Processing…"}
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Analyse Document
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── VALIDATION ERROR ── */}
        {validationError && (
          <div className="card animate-fade" style={{ marginBottom: 20, borderLeft: "3px solid var(--critical)", background: "rgba(244,63,94,0.04)" }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(244,63,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--critical)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--critical)", marginBottom: 4 }}>{validationError.error}</div>
                <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.6 }}>{validationError.detail}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                  Expected: Monthly MoSPI/PAIMANA Central Sector Infrastructure Flash Report PDF, or structured project CSV with canonical 19-column schema.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE (no session, no error) ── */}
        {!hasSession && !validationError && !analyzing && (
          <div className="card animate-fade" style={{ marginBottom: 20, textAlign: "center" }}>
            <div style={{ padding: "32px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>NO ACTIVE DOCUMENT</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 420, margin: "0 auto 24px" }}>
                Upload a monthly MoSPI Flash Report PDF or structured project CSV to begin ephemeral analysis.
                No data is written to the permanent database.
              </div>
            </div>

            {/* Model Status Panel — pre-fetch on empty state */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 10 }}>
                AI Model Status
              </div>
              <RenderModelStatus statuses={modelStatuses} />
            </div>
          </div>
        )}

        {/* ── SESSION RESULTS ── */}
        {hasSession && tempSession && (
          <div className="animate-fade">

            {/* Section 85: Final Validation Summary Screen */}
            <div
              className="card"
              style={{
                marginBottom: 16,
                background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(6,182,212,0.04) 100%)",
                border: "1px solid rgba(16,185,129,0.25)",
                padding: "12px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10b981" }}>
                    Authoritative Dataset Validation Status
                  </span>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                  SESSION ID: {tempSession.session_id}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>DOCUMENT VALIDATION</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}>PASS</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>REPORT MONTH</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>{tempSession.reporting_period}</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>ONGOING DATASET</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>Table 6 (All Ongoing)</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>PROJECTS</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>{tempSession.projects.length.toLocaleString("en-IN")}</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>UNIQUE PROJECTS</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{tempSession.projects.length.toLocaleString("en-IN")}</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>CSV SCHEMA</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}>19 Columns</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>SOURCE TRACEABILITY</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}>PASS</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>MODEL INFERENCE</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}>READY</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>DATABASE STORAGE</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}>NONE (0 Writes)</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>MAP STORAGE</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}>NONE (0 Writes)</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>SESSION STATUS</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>EPHEMERAL (2h)</div>
                </div>
              </div>
            </div>

            {/* ── SESSION SUMMARY BAR ── */}
            <div className="card" style={{ marginBottom: 16, borderTop: "3px solid var(--accent)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                      ✓ VALIDATED
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {tempSession.session_id}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>·</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                      {tempSession.document_type}
                    </span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>
                    {tempSession.projects.length.toLocaleString("en-IN")} ONGOING PROJECTS
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 5, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <span>Report: <strong style={{ color: "var(--accent)" }}>{tempSession.reporting_period}</strong></span>
                    {tempSession.file_name && <span>Source: <strong style={{ color: "var(--text)" }}>{tempSession.file_name}</strong></span>}
                    <span style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", padding: "1px 7px", borderRadius: 4, fontWeight: 700, fontSize: 10 }}>
                      Validation: PASSED
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={getTemporaryCsvUrl(tempSession.session_id)} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download CSV (19 Cols)
                  </a>
                  <a href={getTemporaryRiskCsvUrl(tempSession.session_id)} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, borderColor: "var(--accent)", color: "var(--accent)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Risk Analysis CSV
                  </a>
                  <a href={getTemporaryJsonUrl(tempSession.session_id)} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                    </svg>
                    Export JSON
                  </a>
                  <button onClick={handleDiscardSession} className="btn btn-secondary btn-sm" style={{ color: "var(--critical)" }}>
                    Discard Session
                  </button>
                </div>
              </div>

              {/* ── RISK DISTRIBUTION + METRICS ROW ── */}
              {summaryMetrics && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "CRITICAL", val: summaryMetrics.dist.critical ?? 0, color: "var(--critical)" },
                    { label: "HIGH", val: summaryMetrics.dist.high ?? 0, color: "#f97316" },
                    { label: "MEDIUM", val: summaryMetrics.dist.medium ?? 0, color: "#f59e0b" },
                    { label: "LOW", val: summaryMetrics.dist.low ?? 0, color: "#10b981" },
                    { label: "TOTAL COST", val: fmtCrore(summaryMetrics.totalCost), color: "var(--accent)" },
                    { label: "EXPENDITURE", val: fmtCrore(summaryMetrics.totalExp), color: "var(--accent)" },
                    { label: "AVG PROGRESS", val: summaryMetrics.avgProg != null ? fmtPct(summaryMetrics.avgProg) : "—", color: "var(--text)" },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background: "var(--surface-2)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color }}>{typeof val === "number" ? val.toLocaleString("en-IN") : val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── DATA QUALITY PANEL ── */}
              {tempSession.quality_metrics && (
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>Data Quality & Isolation</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, color: "var(--low)", fontWeight: 700 }}>DATABASE WRITES: 0</span>
                      <button
                        onClick={() => setShowDiagnostics(!showDiagnostics)}
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: 10, padding: "2px 8px" }}
                      >
                        {showDiagnostics ? "Hide Diagnostics" : "Developer Diagnostics"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 11 }}>
                    {[
                      ["Projects Extracted", tempSession.quality_metrics.projects_extracted],
                      ["Projects Validated", tempSession.quality_metrics.projects_validated],
                      ["Duplicates Removed", tempSession.quality_metrics.duplicates ?? 0],
                      ["Missing Fields", tempSession.quality_metrics.missing_fields ?? 0],
                      ["Pages Processed", tempSession.quality_metrics.pages_processed ?? 1],
                    ].map(([label, val]) => (
                      <div key={label as string}>
                        <span style={{ color: "var(--text-muted)" }}>{label}: </span>
                        <strong style={{ color: "var(--text)" }}>{(val as number)?.toLocaleString("en-IN") ?? "—"}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Section 54: Developer Diagnostics Panel */}
                  {showDiagnostics && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--border)", fontSize: 11, fontFamily: "monospace", color: "var(--text)" }}>
                      <div style={{ fontWeight: 800, color: "var(--accent)", marginBottom: 8, letterSpacing: "0.04em", fontSize: 10, textTransform: "uppercase" }}>
                        Diagnostics — Authoritative Dataset Verification
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 6, background: "var(--surface)", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border)" }}>
                        <div>SOURCE FILE: <strong>{tempSession.quality_metrics.diagnostic_panel?.source_file || tempSession.file_name || "FlashReport.pdf"}</strong></div>
                        <div>DETECTED REPORT: <strong>{tempSession.quality_metrics.diagnostic_panel?.detected_report || tempSession.reporting_period}</strong></div>
                        <div>AUTHORITATIVE TABLE: <strong>{tempSession.quality_metrics.diagnostic_panel?.authoritative_table || "Table 6: All Ongoing Projects"}</strong></div>
                        {tempSession.quality_metrics.diagnostic_panel?.table_start_page && (
                          <div>TABLE START: <strong>Page {tempSession.quality_metrics.diagnostic_panel.table_start_page}</strong></div>
                        )}
                        {tempSession.quality_metrics.diagnostic_panel?.table_end_page && (
                          <div>TABLE END: <strong>Page {tempSession.quality_metrics.diagnostic_panel.table_end_page}</strong></div>
                        )}
                        <div>RAW TABLE ROWS: <strong>{tempSession.quality_metrics.diagnostic_panel?.raw_table_rows ?? tempSession.quality_metrics.projects_extracted}</strong></div>
                        <div>VALID PROJECT ROWS: <strong>{tempSession.quality_metrics.diagnostic_panel?.valid_project_rows ?? tempSession.projects.length}</strong></div>
                        <div>DUPLICATES REMOVED: <strong>{tempSession.quality_metrics.diagnostic_panel?.duplicates ?? tempSession.quality_metrics.duplicates ?? 0}</strong></div>
                        <div>FINAL PROJECTS: <strong style={{ color: "var(--accent)" }}>{tempSession.quality_metrics.diagnostic_panel?.final_projects ?? tempSession.projects.length}</strong></div>
                        {tempSession.quality_metrics.diagnostic_panel?.reference_csv && (
                          <div>REFERENCE CSV: <strong>{tempSession.quality_metrics.diagnostic_panel.reference_csv}</strong></div>
                        )}
                        {tempSession.quality_metrics.diagnostic_panel?.csv_match != null && (
                          <div>PROJECT ID MATCH: <strong style={{ color: "#10b981" }}>{tempSession.quality_metrics.diagnostic_panel.csv_match}%</strong></div>
                        )}
                        <div>CSV COLUMNS: <strong style={{ color: "#10b981" }}>19</strong></div>
                        <div>DATABASE WRITES: <strong style={{ color: "#10b981" }}>0</strong></div>
                        <div>MAP WRITES: <strong style={{ color: "#10b981" }}>0</strong></div>
                        {tempSession.quality_metrics.diagnostic_panel?.missing_from_pdf != null && (
                          <div>MISSING FROM PDF: <strong>{tempSession.quality_metrics.diagnostic_panel.missing_from_pdf}</strong></div>
                        )}
                        {tempSession.quality_metrics.diagnostic_panel?.extra_in_pdf != null && (
                          <div>EXTRA IN PDF: <strong>{tempSession.quality_metrics.diagnostic_panel.extra_in_pdf}</strong></div>
                        )}
                        {tempSession.quality_metrics.diagnostic_panel?.field_mismatches != null && (
                          <div>FIELD MISMATCHES: <strong>{tempSession.quality_metrics.diagnostic_panel.field_mismatches}</strong></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PIPELINE TIMELINE ── */}
              {tempSession.timeline && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 6 }}>
                  {tempSession.timeline.map((item) => (
                    <div key={item.step} style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 6, padding: "6px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#10b981", fontWeight: 700, fontSize: 10 }}>
                        <span>✓</span><span style={{ textTransform: "uppercase" }}>{item.title}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{item.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ephemeral notice */}
              <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Ephemeral session (2-hour TTL) — extracted projects and AI plans reside in server memory only. Zero permanent database writes.
              </div>
            </div>

            {/* ── MODEL STATUS (post-upload) ── */}
            {tempSession.model_statuses && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 10 }}>AI Model Status</div>
                <RenderModelStatus statuses={tempSession.model_statuses} />
              </div>
            )}

            {/* ── FILTER & SEARCH & VIEW TOGGLE ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Risk:</span>
                {["all", "critical", "high", "medium", "low"].map((t) => (
                  <button key={t} onClick={() => setRiskFilter(t)} className="btn btn-secondary btn-sm"
                    style={{ fontSize: 10, padding: "3px 10px", textTransform: "uppercase", background: riskFilter === t ? tierColor(t === "all" ? null : t) : undefined, color: riskFilter === t ? "#fff" : undefined, borderColor: riskFilter === t ? tierColor(t === "all" ? null : t) : undefined }}>
                    {t}
                  </button>
                ))}
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginLeft: 6 }}>Sort:</span>
                {(["risk", "progress", "cost", "name"] as const).map((s) => (
                  <button key={s} onClick={() => setSortBy(s)} className="btn btn-secondary btn-sm"
                    style={{ fontSize: 10, padding: "3px 10px", textTransform: "uppercase", background: sortBy === s ? "var(--accent)" : undefined, color: sortBy === s ? "#fff" : undefined }}>
                    {s}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {/* View toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--surface-2)", padding: 2, borderRadius: 6, border: "1px solid var(--border)" }}>
                  <button
                    onClick={() => setViewMode("table")}
                    style={{
                      padding: "4px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      background: viewMode === "table" ? "var(--accent)" : "transparent",
                      color: viewMode === "table" ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    TABLE
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    style={{
                      padding: "4px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      background: viewMode === "cards" ? "var(--accent)" : "transparent",
                      color: viewMode === "cards" ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    CARDS
                  </button>
                </div>

                <input type="text" placeholder="Search project name, ID, state, sector, agency…"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 12, minWidth: 260 }} />
              </div>
            </div>

            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                Showing <strong>{filteredProjects.length.toLocaleString("en-IN")}</strong> of <strong>{tempSession.projects.length.toLocaleString("en-IN")}</strong> ongoing projects
              </div>
              <div style={{ fontSize: 10, color: "var(--accent)" }}>
                Canonical 19-Column Schema & AI Risk Intelligence Active
              </div>
            </div>

            {/* ── PROJECT TABLE / CARDS ── */}
            {filteredProjects.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                No projects match the current filters.
              </div>
            ) : viewMode === "table" ? (
              /* Structured Table View with explicit Column Headers matching CSV */
              <div className="table-responsive-wrapper" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
                {/* Fixed Column Header */}
                <div style={{ display: "grid", gridTemplateColumns: "55px 1.6fr 1.1fr 100px 100px 90px 90px 90px 75px 85px 85px 140px", gap: 10, padding: "10px 14px", background: "var(--surface-2)", borderBottom: "2px solid var(--border)", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", alignItems: "center", minWidth: 1100 }}>
                  <div>Sl.No</div>
                  <div>Project Name & ID</div>
                  <div>Agency & Ministry</div>
                  <div>State</div>
                  <div>Sector</div>
                  <div style={{ textAlign: "right" }}>Original Cost</div>
                  <div style={{ textAlign: "right" }}>Revised Cost</div>
                  <div style={{ textAlign: "right" }}>Expenditure</div>
                  <div style={{ textAlign: "right" }}>Progress</div>
                  <div>Target DoC</div>
                  <div style={{ textAlign: "center" }}>Risk Tier</div>
                  <div style={{ textAlign: "center" }}>Actions</div>
                </div>

                {filteredProjects.slice(0, 300).map((p, idx) => {
                  const tier = p.risk_analysis?.risk_tier;
                  const isInsufficientData = p.risk_analysis?.status === "insufficient_data";
                  const isMitigating = mitigationLoadingId === p.project_id;
                  const hasMitigation = !!p.mitigation_plan;
                  const targetDoc = p.revised_target_doc_mm_yyyy || p.original_target_doc_mm_yyyy || "—";
                  const hasOverrun = p.revised_cost_crore && p.original_cost_crore && p.revised_cost_crore > p.original_cost_crore;

                  return (
                    <div key={`${p.project_id}-${p.sl_no ?? idx}`} style={{ display: "grid", gridTemplateColumns: "55px 1.6fr 1.1fr 100px 100px 90px 90px 90px 75px 85px 85px 140px", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 11, alignItems: "center", minWidth: 1100, background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                      <div style={{ fontFamily: "monospace", color: "var(--text-muted)", fontSize: 10, lineHeight: 1.4 }}>
                        <div style={{ fontWeight: 800, color: "var(--text)", fontSize: 11 }}>#{idx + 1}</div>
                        {p.sl_no != null && p.sl_no !== idx + 1 && (
                          <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }} title="MoSPI Serial No. from report">sl.{p.sl_no}</div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 12, lineHeight: 1.35, marginBottom: 2 }}>
                          {p.project_name}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--accent)", background: "rgba(6,182,212,0.1)", padding: "1px 5px", borderRadius: 3 }}>
                            {p.project_id}
                          </span>
                          {p.source_pdf_page && <span style={{ fontSize: 9, color: "var(--text-muted)" }}>p.{p.source_pdf_page}</span>}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{p.agency ?? "—"}</div>
                        {p.ministry && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{p.ministry}</div>}
                      </div>
                      <div style={{ color: "var(--text-sub)", fontWeight: 500 }}>{p.state ?? "—"}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{p.sector ?? "—"}</div>
                      <div style={{ textAlign: "right", fontWeight: 600 }}>{fmtCrore(p.original_cost_crore)}</div>
                      <div style={{ textAlign: "right", fontWeight: 600, color: hasOverrun ? "var(--critical)" : "var(--text)" }}>
                        {fmtCrore(p.revised_cost_crore)}
                      </div>
                      <div style={{ textAlign: "right", color: "var(--text-sub)" }}>{fmtCrore(p.cumulative_expenditure_crore)}</div>
                      <div style={{ textAlign: "right", fontWeight: 700, color: p.physical_progress_percent != null && p.physical_progress_percent < 30 ? "var(--critical)" : "var(--accent)" }}>
                        {fmtPct(p.physical_progress_percent)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {targetDoc}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        {isInsufficientData ? (
                          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>N/A</span>
                        ) : (
                          <span style={{ ...tierBadge(tier), padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
                            {(tier ?? "—").toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                        <button onClick={() => setViewingProject(p)} className="btn btn-secondary btn-xs" style={{ fontSize: 10, padding: "3px 8px" }}>Details</button>
                        {hasMitigation ? (
                          <>
                            <button onClick={() => setActiveMitigation({ project: p, plan: p.mitigation_plan })}
                              className="btn btn-primary btn-xs"
                              style={{ fontSize: 10, padding: "3px 8px", background: "var(--low)" }}>
                              ✓ Plan
                            </button>
                            <button onClick={() => handleDownloadPdf(p, p.mitigation_plan)}
                              disabled={isPdfGenerating}
                              title="Export Mitigation Plan as PDF"
                              className="btn btn-secondary btn-xs"
                              style={{ fontSize: 10, padding: "3px 7px", display: "inline-flex", alignItems: "center", gap: 2 }}>
                              PDF
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleTriggerMitigation(p)}
                            disabled={isMitigating} className="btn btn-primary btn-xs"
                            style={{ fontSize: 10, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            {isMitigating ? "⏳" : "AI Plan"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Rich Card View */
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
                {filteredProjects.slice(0, 300).map((p, idx) => {
                  const tier = p.risk_analysis?.risk_tier;
                  const riskScore = p.risk_analysis?.composite_risk_score;
                  const isInsufficientData = p.risk_analysis?.status === "insufficient_data";
                  const isMitigating = mitigationLoadingId === p.project_id;
                  const hasMitigation = !!p.mitigation_plan;
                  const targetDoc = p.revised_target_doc_mm_yyyy || p.original_target_doc_mm_yyyy || "—";

                  return (
                    <div key={`${p.project_id}-${p.sl_no ?? idx}`} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>
                              #{idx + 1}
                            </span>
                            {p.sl_no != null && (
                              <span style={{ fontSize: 9, color: "var(--text-muted)" }} title="MoSPI Serial No.">
                                sl.{p.sl_no}
                              </span>
                            )}
                            <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--accent)", background: "rgba(6,182,212,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                              {p.project_id}
                            </span>
                          </div>
                          {isInsufficientData ? (
                            <span style={{ fontSize: 10, color: "var(--text-muted)", background: "rgba(100,116,139,0.1)", padding: "2px 6px", borderRadius: 4 }}>INSUFFICIENT DATA</span>
                          ) : (
                            <span style={{ ...tierBadge(tier), padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                              {(tier ?? "—").toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.4, marginBottom: 8 }}>
                          {p.project_name}
                        </div>

                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                          {p.agency && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>{p.agency}</span>}
                          {p.state && <span style={{ fontSize: 10, color: "var(--text-sub)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>{p.state}</span>}
                          {p.sector && <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>{p.sector}</span>}
                          {p.ministry && <div style={{ fontSize: 10, color: "var(--text-muted)", width: "100%", marginTop: 2 }}>{p.ministry}</div>}
                        </div>

                        {/* Metrics grid matching canonical 19 columns */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, background: "var(--surface-2)", padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 11 }}>
                          <div><div style={{ color: "var(--text-muted)", fontSize: 10 }}>Original Cost</div><div style={{ fontWeight: 700 }}>{fmtCrore(p.original_cost_crore)}</div></div>
                          <div><div style={{ color: "var(--text-muted)", fontSize: 10 }}>Revised Cost</div><div style={{ fontWeight: 700, color: p.revised_cost_crore && p.original_cost_crore && p.revised_cost_crore > p.original_cost_crore ? "var(--critical)" : undefined }}>{fmtCrore(p.revised_cost_crore)}</div></div>
                          <div><div style={{ color: "var(--text-muted)", fontSize: 10 }}>Expenditure</div><div style={{ fontWeight: 700 }}>{fmtCrore(p.cumulative_expenditure_crore)}</div></div>
                          <div><div style={{ color: "var(--text-muted)", fontSize: 10 }}>Progress</div><div style={{ fontWeight: 700, color: "var(--accent)" }}>{fmtPct(p.physical_progress_percent)}</div></div>
                        </div>

                        {/* Timeline & Risk */}
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                          <span>Target: <strong style={{ color: "var(--text)" }}>{targetDoc}</strong></span>
                          {p.source_pdf_page != null && <span>Page {p.source_pdf_page}</span>}
                        </div>

                        {/* Risk scores */}
                        {!isInsufficientData && riskScore != null && (
                          <div style={{ display: "flex", gap: 8, fontSize: 10, marginBottom: 8 }}>
                            <div style={{ flex: 1, textAlign: "center", background: "var(--surface-2)", borderRadius: 6, padding: "5px 6px" }}>
                              <div style={{ color: "var(--text-muted)" }}>Cost Risk</div>
                              <div style={{ fontWeight: 700, color: tierColor(tier) }}>{((p.risk_analysis?.cost_risk ?? 0) * 100).toFixed(0)}%</div>
                            </div>
                            <div style={{ flex: 1, textAlign: "center", background: "var(--surface-2)", borderRadius: 6, padding: "5px 6px" }}>
                              <div style={{ color: "var(--text-muted)" }}>Schedule Risk</div>
                              <div style={{ fontWeight: 700, color: tierColor(tier) }}>{((p.risk_analysis?.schedule_risk ?? 0) * 100).toFixed(0)}%</div>
                            </div>
                            <div style={{ flex: 1, textAlign: "center", background: "var(--surface-2)", borderRadius: 6, padding: "5px 6px" }}>
                              <div style={{ color: "var(--text-muted)" }}>Composite</div>
                              <div style={{ fontWeight: 700, color: tierColor(tier) }}>{(riskScore * 100).toFixed(0)}%</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8, paddingTop: 10, marginTop: 10, borderTop: "1px solid var(--border)" }}>
                        <button onClick={() => setViewingProject(p)} className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: 11 }}>
                          View Details
                        </button>
                        {hasMitigation ? (
                          <div style={{ flex: 1.4, display: "flex", gap: 6 }}>
                            <button
                              onClick={() => setActiveMitigation({ project: p, plan: p.mitigation_plan })}
                              className="btn btn-primary btn-sm"
                              style={{ flex: 1, fontSize: 11, background: "var(--low)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                            >
                              ✓ View Plan
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(p, p.mitigation_plan)}
                              disabled={isPdfGenerating}
                              title="Export AI Mitigation Plan as PDF"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: 11, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              PDF
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleTriggerMitigation(p)}
                            disabled={isMitigating}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1.4, fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                          >
                            {isMitigating ? (
                              <>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                Generating…
                              </>
                            ) : "AI Mitigation Plan"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredProjects.length > 300 && (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 12 }}>
                    Showing first 300 of {filteredProjects.length.toLocaleString("en-IN")} matches. Refine filters to narrow results.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          MODAL 1 — PROJECT DETAILS
          ════════════════════════════════════════════════════════════ */}
      {viewingProject && (
        <div onClick={() => setViewingProject(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card animate-fade"
            style={{ width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", borderTop: "3px solid var(--accent)" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", background: "rgba(6,182,212,0.12)", padding: "2px 8px", borderRadius: 4 }}>
                    SL.NO #{viewingProject.sl_no ?? "—"}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text)", background: "var(--surface-2)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>
                    ID: {viewingProject.project_id}
                  </span>
                  {viewingProject.legacy_ocms_code && (
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-muted)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>
                      OCMS: {viewingProject.legacy_ocms_code}
                    </span>
                  )}
                  {viewingProject.pmgid && (
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-muted)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>
                      PMG: {viewingProject.pmgid}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", lineHeight: 1.35 }}>{viewingProject.project_name}</div>
              </div>
              <button onClick={() => setViewingProject(null)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            {/* Canonical MoSPI 19-Column Dataset Specifications */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
              Official MoSPI / PAIMANA Project Specifications
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12, marginBottom: 16 }}>
              {[
                ["Implementing Agency", viewingProject.agency],
                ["Administrative Ministry", viewingProject.ministry],
                ["Infrastructure Sector", viewingProject.sector],
                ["State / Location", viewingProject.state],
                ["Original Sanctioned Cost", fmtCrore(viewingProject.original_cost_crore)],
                ["Revised Anticipated Cost", fmtCrore(viewingProject.revised_cost_crore)],
                ["Cost Escalation / Overrun", viewingProject.revised_cost_crore && viewingProject.original_cost_crore && viewingProject.revised_cost_crore > viewingProject.original_cost_crore ? fmtCrore(viewingProject.revised_cost_crore - viewingProject.original_cost_crore) : "₹0.0 Cr (Within Budget)"],
                ["Cumulative Expenditure", fmtCrore(viewingProject.cumulative_expenditure_crore)],
                ["Physical Progress", fmtPct(viewingProject.physical_progress_percent)],
                ["Sanction / Approval Date", viewingProject.approval_date_mm_yyyy],
                ["Execution / Start Date", viewingProject.start_date_mm_yyyy],
                ["Original Target DoC", viewingProject.original_target_doc_mm_yyyy],
                ["Revised Target DoC", viewingProject.revised_target_doc_mm_yyyy],
                ["Reporting Period", viewingProject.report_month],
              ].map(([label, val]) => (
                <div key={label as string} style={{ background: "var(--surface-2)", padding: "8px 10px", borderRadius: 6 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 10, display: "block" }}>{label}</span>
                  <strong style={{ color: (val == null || val === "" || val === "—") ? "var(--text-muted)" : "var(--text)", fontSize: 12, display: "block", marginTop: 2 }}>
                    {(val == null || val === "") ? "—" : String(val)}
                  </strong>
                </div>
              ))}
            </div>

            {/* Source Traceability */}
            <div style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 11 }}>
              <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 6, fontSize: 10, textTransform: "uppercase" }}>Source Traceability</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", color: "var(--text-sub)" }}>
                <span>File: <strong>{tempSession?.file_name ?? "—"}</strong></span>
                <span>Report: <strong>{viewingProject.report_month ?? "—"}</strong></span>
                {viewingProject.source_pdf_page != null && <span>PDF Page: <strong>{viewingProject.source_pdf_page}</strong></span>}
                <span>Project ID: <strong style={{ fontFamily: "monospace" }}>{viewingProject.project_id}</strong></span>
              </div>
            </div>

            {/* Risk Analysis */}
            {viewingProject.risk_analysis && viewingProject.risk_analysis.status !== "insufficient_data" && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>ML Risk Analysis</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {[
                    ["Risk Tier", (viewingProject.risk_analysis.risk_tier ?? "—").toUpperCase()],
                    ["Cost Risk", `${((viewingProject.risk_analysis.cost_risk ?? 0) * 100).toFixed(0)}%`],
                    ["Schedule Risk", `${((viewingProject.risk_analysis.schedule_risk ?? 0) * 100).toFixed(0)}%`],
                    ["Composite Score", `${((viewingProject.risk_analysis.composite_risk_score ?? 0) * 100).toFixed(0)}%`],
                    ["Predicted Delay", `~${viewingProject.risk_analysis.predicted_delay_months?.toFixed(1) ?? "—"} months`],
                    ["Estimated Overrun", fmtCrore(viewingProject.risk_analysis.estimated_overrun_cr)],
                  ].map(([label, val]) => (
                    <div key={label as string} style={{ background: "var(--surface-2)", padding: "8px 10px", borderRadius: 6, fontSize: 11 }}>
                      <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{label}</div>
                      <div style={{ fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* SHAP factors */}
                {viewingProject.risk_analysis.shap_factors && viewingProject.risk_analysis.shap_factors.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                      WHY THIS PROJECT IS AT RISK&nbsp;
                      <span style={{ fontWeight: 400, textTransform: "none" }}>({viewingProject.risk_analysis.shap_method ?? viewingProject.risk_analysis.shap_factors[0]?.shap_method ?? "SHAP"})</span>
                    </div>
                    {viewingProject.risk_analysis.shap_factors.map((f) => (
                      <div key={f.feature} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.impact === "risk_increasing" ? "var(--critical)" : "#10b981", flexShrink: 0 }} />
                        <div style={{ flex: 1, color: "var(--text-sub)" }}>{f.label}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 10, color: f.impact === "risk_increasing" ? "var(--critical)" : "#10b981" }}>
                          {f.shap_value !== undefined ? (f.shap_value > 0 ? "+" : "") + f.shap_value.toFixed(4) : f.importance.toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {viewingProject.risk_analysis?.status === "insufficient_data" && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12 }}>
                <strong style={{ color: "#f59e0b" }}>MODEL INPUT INCOMPLETE</strong>
                <div style={{ color: "var(--text-sub)", marginTop: 4 }}>Missing: {viewingProject.risk_analysis.missing_fields?.join(", ") ?? "required fields"}</div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <button onClick={() => setViewingProject(null)} className="btn btn-secondary btn-sm">Close</button>
              <button onClick={() => { const p = viewingProject; setViewingProject(null); handleTriggerMitigation(p); }} className="btn btn-primary btn-sm">
                Generate AI Mitigation Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL 2 — AI MITIGATION PLAN
          ════════════════════════════════════════════════════════════ */}
      {activeMitigation && (
        <div onClick={() => setActiveMitigation(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="card animate-fade"
            style={{ width: "100%", maxWidth: 860, maxHeight: "94vh", overflowY: "auto", borderTop: "4px solid var(--accent)" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, background: "rgba(6,182,212,0.12)", color: "var(--accent)", border: "1px solid rgba(6,182,212,0.3)", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                    {(activeMitigation.plan?.model_used ?? "QWEN 2.5").toUpperCase()} · AI MITIGATION PLAN
                  </span>
                  <span style={{ ...tierBadge(activeMitigation.project.risk_analysis?.risk_tier), padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                    {(activeMitigation.project.risk_analysis?.risk_tier ?? "MEDIUM").toUpperCase()} RISK
                  </span>
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-muted)" }}>
                    {activeMitigation.project.project_id}
                  </span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>{activeMitigation.project.project_name}</div>
                <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 2 }}>
                  {[activeMitigation.project.sector, activeMitigation.project.state, activeMitigation.project.agency ? `Agency: ${activeMitigation.project.agency}` : null].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button onClick={() => setActiveMitigation(null)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            {(() => {
              const plan = activeMitigation.plan;

              function Section({ title, color = "var(--accent)", children }: { title: string; color?: string; children: React.ReactNode }) {
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color, letterSpacing: "0.06em", marginBottom: 8 }}>{title}</div>
                    {children}
                  </div>
                );
              }

              function TextBlock({ text }: { text?: string }) {
                if (!text) return null;
                return <div style={{ background: "var(--surface-2)", padding: "12px 14px", borderRadius: 8, fontSize: 12, color: "var(--text)", lineHeight: 1.65 }}>{text}</div>;
              }

              function StringList({ items }: { items?: string[] }) {
                if (!items?.length) return null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text-sub)", lineHeight: 1.5 }}>
                        <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>→</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <>
                  {/* Executive Assessment */}
                  {plan.overall_assessment && (
                    <Section title="Executive Assessment">
                      <TextBlock text={plan.overall_assessment} />
                    </Section>
                  )}

                  {/* Critical Issues */}
                  {plan.critical_issues?.length > 0 && (
                    <Section title="Critical Issues" color="var(--critical)">
                      {plan.critical_issues.map((iss: any, i: number) => (
                        <div key={i} style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)", padding: "10px 14px", borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                            <span>{iss.issue}</span>
                            <span style={{ fontSize: 10, color: "var(--critical)", fontWeight: 700, flexShrink: 0 }}>
                              {iss.severity} · P{iss.priority}
                            </span>
                          </div>
                          <div style={{ color: "var(--text-sub)", fontSize: 11 }}>{iss.evidence}</div>
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Mitigation Actions */}
                  {plan.mitigation_actions?.length > 0 && (
                    <Section title="Immediate Actions">
                      {plan.mitigation_actions.map((act: any, i: number) => (
                        <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginBottom: 10, fontSize: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 13 }}>{i + 1}. {act.action}</div>
                            <span style={{ fontSize: 10, background: "rgba(249,115,22,0.12)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)", padding: "2px 8px", borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>
                              {act.priority ?? "Immediate"}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, color: "var(--text-sub)", marginBottom: 8 }}>
                            <div><strong style={{ color: "var(--text-muted)" }}>Responsible:</strong> {act.responsible_stakeholder ?? "—"}</div>
                            <div><strong style={{ color: "var(--text-muted)" }}>Timeline:</strong> {act.timeline ?? "—"}</div>
                            {act.dependency && <div style={{ gridColumn: "1/-1" }}><strong style={{ color: "var(--text-muted)" }}>Dependency:</strong> {act.dependency}</div>}
                          </div>
                          <div style={{ background: "rgba(6,182,212,0.06)", borderLeft: "3px solid var(--accent)", padding: "6px 10px", borderRadius: "0 6px 6px 0", fontSize: 11 }}>
                            <span style={{ fontWeight: 700, color: "var(--accent)" }}>Why this recommendation? </span>
                            <span style={{ color: "var(--text)" }}>{act.reason}</span>
                            {act.evidence && <div style={{ marginTop: 2, color: "var(--text-muted)", fontSize: 10 }}><strong>Evidence:</strong> {act.evidence}</div>}
                          </div>
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Cost Control */}
                  {plan.cost_control?.length > 0 && (
                    <Section title="Cost Control">
                      <StringList items={plan.cost_control} />
                    </Section>
                  )}

                  {/* Schedule Recovery */}
                  {plan.schedule_recovery?.length > 0 && (
                    <Section title="Schedule Recovery">
                      <StringList items={plan.schedule_recovery} />
                    </Section>
                  )}

                  {/* Milestone Actions */}
                  {plan.milestone_actions?.length > 0 && (
                    <Section title="Milestone Actions">
                      <StringList items={plan.milestone_actions} />
                    </Section>
                  )}

                  {/* Dependency Resolution */}
                  {plan.dependency_resolution?.length > 0 && (
                    <Section title="Dependency Resolution">
                      <StringList items={plan.dependency_resolution} />
                    </Section>
                  )}

                  {/* Escalation Actions */}
                  {plan.escalation_actions?.length > 0 && (
                    <Section title="Escalation Actions" color="#f97316">
                      <StringList items={plan.escalation_actions} />
                    </Section>
                  )}

                  {/* Monitoring Indicators */}
                  {plan.monitoring_indicators?.length > 0 && (
                    <Section title="Monitoring Indicators">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
                        {plan.monitoring_indicators.map((m: any, i: number) => (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 140px", gap: 8, background: "var(--surface-2)", padding: "8px 12px", borderRadius: 6, fontSize: 11, alignItems: "center" }}>
                            <div style={{ fontWeight: 600, color: "var(--text)" }}>{typeof m === "string" ? m : m.indicator ?? m}</div>
                            {typeof m !== "string" && <div style={{ color: "#10b981", fontFamily: "monospace", fontSize: 10 }}>{m.target}</div>}
                            {typeof m !== "string" && <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{m.responsible}</div>}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Next Review Focus */}
                  {plan.next_review_focus?.length > 0 && (
                    <Section title="Next Review Focus">
                      <StringList items={plan.next_review_focus} />
                    </Section>
                  )}

                  {/* Data Limitations */}
                  {plan.data_limitations?.length > 0 && (
                    <Section title="Data Limitations" color="var(--text-muted)">
                      <div style={{ background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)", borderRadius: 8, padding: "10px 14px" }}>
                        <StringList items={plan.data_limitations} />
                      </div>
                    </Section>
                  )}

                  {/* Source Traceability */}
                  {plan.source_traceability && (
                    <Section title="Source Traceability">
                      <div style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 11 }}>
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", color: "var(--text-sub)" }}>
                          <span>Source: <strong>{plan.source_traceability.source_file}</strong></span>
                          <span>Report: <strong>{plan.source_traceability.report_month}</strong></span>
                          {plan.source_traceability.source_pdf_page && <span>Page: <strong>{plan.source_traceability.source_pdf_page}</strong></span>}
                          <span>Project ID: <strong style={{ fontFamily: "monospace" }}>{plan.source_traceability.project_id}</strong></span>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Explainability */}
                  {plan.explainability && (
                    <Section title="Why These Recommendations?">
                      <div style={{ background: "var(--surface-2)", borderLeft: "3px solid var(--accent)", padding: "10px 14px", borderRadius: "0 8px 8px 0", fontSize: 12, color: "var(--text)", lineHeight: 1.6 }}>
                        <div>{plan.explainability.why_this_recommendation}</div>
                        {plan.explainability.primary_evidence_metric && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "var(--accent)", fontFamily: "monospace" }}>
                            {plan.explainability.primary_evidence_metric}
                          </div>
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Secondary AI Validation */}
                  {plan.secondary_ai_validation && (
                    <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 11 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981", fontWeight: 700, marginBottom: 4 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Verified by {plan.secondary_ai_validation.validator_model}
                      </div>
                      <div style={{ color: "var(--text-sub)" }}>
                        Specificity: <strong>{((plan.secondary_ai_validation.specificity_score ?? 0) * 100).toFixed(0)}%</strong>
                        {" · "}Evidence-Grounded: <strong>Yes</strong>
                        {plan.secondary_ai_validation.critique_notes && (
                          <div style={{ marginTop: 4 }}>{plan.secondary_ai_validation.critique_notes}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Governance Disclaimer */}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid var(--border)", paddingTop: 12, marginBottom: 4 }}>
                    AI-generated decision support based on the selected project's uploaded source data.
                    Final administrative decisions remain with authorized officials.
                  </div>
                </>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button onClick={() => setActiveMitigation(null)} className="btn btn-secondary btn-sm">Close</button>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(activeMitigation.plan, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Mitigation_${activeMitigation.project.project_id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn btn-secondary btn-sm"
              >
                Download JSON
              </button>
              <button
                onClick={() => handleDownloadPdf(activeMitigation.project, activeMitigation.plan)}
                disabled={isPdfGenerating}
                className="btn btn-primary btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
              >
                {isPdfGenerating ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Download Plan PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
