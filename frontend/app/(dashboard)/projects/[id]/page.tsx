"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProject, predictProject, getProjectPredictions, generateMitigation } from "@/lib/api";
import type { Project, RiskPrediction } from "@/lib/types";
import TopBar from "@/components/layout/TopBar";
import RiskBadge from "@/components/ui/RiskBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import KpiCard from "@/components/ui/KpiCard";
import ShapWaterfall from "@/components/charts/ShapWaterfall";
import RiskTrendChart from "@/components/charts/RiskTrendChart";
import BurnProgressGauge from "@/components/charts/BurnProgressGauge";
import WhatIfPanel from "@/components/features/WhatIfPanel";
import PdfExportButton from "@/components/features/PdfExportButton";



export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [history, setHistory] = useState<RiskPrediction[]>([]);
  const [mitigationText, setMitigationText] = useState<string | null>(null);
  const [mitigationModel, setMitigationModel] = useState<string>("");
  const [mitigationLoading, setMitigationLoading] = useState(false);
  const [mitigationError, setMitigationError] = useState("");
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");

    getProject(id)
      .then(async (p) => {
        if (!p) throw new Error("Project not found");
        setProject(p);

        // Always run a fresh AI prediction on page open — never show stale seed data
        try {
          setPredicting(true);
          const freshPred = await predictProject(p.id).catch(() => null);
          if (freshPred) {
            setPrediction(freshPred);
            // Also refresh history to include this latest run
            const h = await getProjectPredictions(p.id, 10).catch(() => []);
            setHistory((h as RiskPrediction[]) || [freshPred]);
          } else {
            // Fallback: if live prediction fails, show latest DB record
            const h = await getProjectPredictions(p.id, 10).catch(() => []);
            const historyList = (h as RiskPrediction[]) || [];
            setHistory(historyList);
            if (historyList.length > 0) setPrediction(historyList[0]);
          }
        } catch (pe) {
          console.error("Auto prediction on load failed", pe);
        } finally {
          setPredicting(false);
        }
      })
      .catch(async (e) => {
        // Graceful auto-recovery fallback: if UUID not found, retrieve active portfolio project
        try {
          const { listProjects } = await import("@/lib/api");
          const list = await listProjects({ limit: 5 });
          if (list && list.length > 0) {
            const fallbackP = await getProject(list[0].id);
            if (fallbackP) {
              setProject(fallbackP);
              return;
            }
          }
        } catch (_) {}
        setError(e.message || "Failed to load project details");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function _runPrediction_unused() {
    if (!project) return;
    setPredicting(true);
    try {
      const pred = await predictProject(project.id);
      setPrediction(pred);
      setHistory((h) => [pred, ...h].slice(0, 10));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setPredicting(false);
    }
  }

  if (loading)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <LoadingSpinner size={40} label="Loading project details & AI risk model..." />
      </div>
    );

  if (!project)
    return (
      <div>
        <TopBar title="Project Record Status" subtitle="MoSPI PAIMANA Infrastructure Intelligence" />
        <div style={{ padding: "40px 24px", maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
              Project Record Not Located
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.6, marginBottom: 24 }}>
              The requested project record could not be retrieved from the active database session. This may occur if the database was recently re-indexed or if an outdated link was referenced.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/map" className="btn btn-primary" style={{ textDecoration: "none" }}>
                Return to Geospatial Map
              </Link>
              <Link href="/projects" className="btn" style={{ textDecoration: "none", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                Browse All Projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div>
      <TopBar title={project.project_name} subtitle={`${project.ministry || ""} - ${project.sector || ""} - ${project.state || ""}`} />
      <div style={{ padding: "24px 24px 48px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <Link href="/projects" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                ← Back to Risk Matrix
              </Link>
              <Link href="/map" style={{ fontSize: 12, color: "var(--text-sub)", textDecoration: "none", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                  <line x1="9" y1="3" x2="9" y2="18"/>
                  <line x1="15" y1="6" x2="15" y2="21"/>
                </svg>
                View on Map
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <RiskBadge tier={prediction?.risk_tier} size="lg" />
              {prediction && (
                <span className="tabular" style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 600 }}>
                  Composite Risk Score: {(prediction.composite_risk_score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PdfExportButton
              project={project}
              prediction={prediction}
              mitigationPlan={mitigationText}
              onMitigationFetched={(text, model) => {
                setMitigationText(text);
                setMitigationModel(model);
              }}
              label="Export Executive PDF Report"
              className="btn btn-secondary"
            />
          </div>
        </div>

        {/* Timing & Schedule Row */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Project Timeline & Schedule Details
          </div>
          <div className="responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <KpiCard
              label="Starting Date"
              value={project.original_start_date ? new Date(project.original_start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              sub="Work sanctioned start"
              color="#38bdf8"
            />
            <KpiCard
              label="Scheduled Completion"
              value={project.scheduled_completion_date ? new Date(project.scheduled_completion_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              sub="Contractual target date"
              color="#a855f7"
            />
            <KpiCard
              label="Revised Completion"
              value={project.revised_completion_date ? new Date(project.revised_completion_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : (project.scheduled_completion_date ? new Date(project.scheduled_completion_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—")}
              sub={project.revised_completion_date ? "Anticipated commission" : "Original target"}
              color="#f59e0b"
            />
            <KpiCard
              label="Timeline Elapsed"
              value={project.time_elapsed_ratio != null ? `${(project.time_elapsed_ratio * 100).toFixed(1)}%` : "—"}
              sub={(() => {
                if (project.time_elapsed_ratio == null) return "Scheduled window";
                if (project.original_start_date && project.scheduled_completion_date) {
                  const s = new Date(project.original_start_date).getTime();
                  const c = new Date(project.scheduled_completion_date).getTime();
                  const totalDays = Math.max((c - s) / (1000 * 60 * 60 * 24), 30);
                  const now = new Date("2026-04-30").getTime();
                  const elapsedDays = (now - s) / (1000 * 60 * 60 * 24);
                  const diffDays = elapsedDays - totalDays;
                  if (diffDays > 0) {
                    const mo = (diffDays / 30.4).toFixed(1);
                    return `Overdue by ~${mo} mo`;
                  } else {
                    const remMo = (Math.abs(diffDays) / 30.4).toFixed(1);
                    return `~${remMo} mo remaining`;
                  }
                }
                return project.time_elapsed_ratio > 1.0 ? "Over original schedule" : "Within planned schedule";
              })()}
              color={project.time_elapsed_ratio != null && project.time_elapsed_ratio > 1.0 ? "#f43f5e" : "#10b981"}
            />
          </div>
        </div>

        {/* Financial & Physical Progress Row */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Financial & Execution Progress
          </div>
          <div className="responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <KpiCard
              label="Original Cost"
              value={project.original_cost_cr != null ? `₹${project.original_cost_cr.toLocaleString("en-IN")} Cr` : "—"}
              sub="At sanction"
              color="#94a3b8"
            />
            <KpiCard
              label="Revised Cost"
              value={project.revised_cost_cr != null ? `₹${project.revised_cost_cr.toLocaleString("en-IN")} Cr` : "—"}
              sub="Latest revision"
              color="#06b6d4"
            />
            <KpiCard
              label="Cumulative Expenditure"
              value={project.cumulative_expenditure_cr != null ? `₹${project.cumulative_expenditure_cr.toLocaleString("en-IN")} Cr` : "—"}
              sub={project.burn_rate_pct != null ? `${project.burn_rate_pct.toFixed(1)}% budget spent` : "Total spent to date"}
              color="#818cf8"
            />
            <KpiCard
              label="Physical Progress"
              value={project.physical_progress_pct != null ? `${project.physical_progress_pct.toFixed(1)}%` : "—"}
              sub={project.burn_progress_gap != null ? (project.burn_progress_gap > 0 ? `+${project.burn_progress_gap.toFixed(1)}% spend gap` : `${Math.abs(project.burn_progress_gap).toFixed(1)}% ahead of spend`) : "Ground completion"}
              color="#10b981"
            />
          </div>
        </div>

        {/* XGBoost AI Models Inference Outputs Row */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            XGBoost AI Models Inference Outputs
            {predicting && (
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: "#f59e0b", background: "rgba(245,158,11,0.12)", borderRadius: 6, padding: "2px 8px", animation: "pulse 1.2s ease-in-out infinite", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Running AI Model...
              </span>
            )}
          </div>
          <div className="responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <KpiCard
              label="XGBoost Delay Prob"
              value={prediction ? `${(prediction.delay_probability * 100).toFixed(1)}%` : "—"}
              sub={prediction ? (prediction.delay_probability > 0.60 ? "High slippage probability" : "Within scheduled buffer") : "Classification output"}
              color={prediction ? (prediction.delay_probability > 0.6 ? "#f43f5e" : "#10b981") : "#94a3b8"}
            />
            <KpiCard
              label="Forecasted Schedule Lag"
              value={prediction?.delay_duration_months != null ? (prediction.delay_duration_months > 0 ? `+${prediction.delay_duration_months.toFixed(1)} mo` : `${prediction.delay_duration_months.toFixed(1)} mo`) : "—"}
              sub={prediction?.delay_duration_months && prediction.delay_duration_months > 0 ? "Past original target date" : "On scheduled track"}
              color={prediction?.delay_duration_months && prediction.delay_duration_months > 0 ? "#f43f5e" : "#10b981"}
            />
            <KpiCard
              label="XGBoost Cost Overrun Prob"
              value={prediction ? `${(prediction.cost_overrun_probability * 100).toFixed(1)}%` : "—"}
              sub={prediction ? (prediction.cost_overrun_probability > 0.50 ? "High overrun risk" : "Low overrun probability") : "Classification output"}
              color={prediction ? (prediction.cost_overrun_probability > 0.50 ? "#f43f5e" : "#06b6d4") : "#94a3b8"}
            />
            <KpiCard
              label="Cost Exposure Amount"
              value={prediction?.cost_overrun_amount_cr != null ? (prediction.cost_overrun_amount_cr > 0 ? `+₹${prediction.cost_overrun_amount_cr.toFixed(1)} Cr` : `₹0.0 Cr`) : "—"}
              sub="Projected fiscal overrun"
              color={prediction?.cost_overrun_amount_cr && prediction.cost_overrun_amount_cr > 0 ? "#f43f5e" : "#10b981"}
            />
          </div>
        </div>

        {/* Executive Risk Assessment & Policy Advisory Card (Human-Readable, Professional Format) */}
        {prediction?.ai_risk_narrative && (() => {
          const raw = prediction.ai_risk_narrative;
          // 1. Strip technical AI/model prefixes
          let clean = raw
            .replace(/\[Qwen-2\.5\s*QLoRA\s*Executive\s*Briefing\]/gi, "")
            .replace(/\[.*?Executive Briefing\]/gi, "")
            .replace(/\[.*?Briefing\]/gi, "")
            .trim();

          // 2. Remove duplicate parenthetical state names like "(Gujarat) (Petroleum & Natural Gas, GUJARAT)"
          clean = clean.replace(/\(([A-Za-z\s&]+)\)\s*\(([A-Za-z\s&]+),\s*\1\)/gi, "($2, $1)");

          // 3. Fix negative schedule delays
          clean = clean.replace(/projected schedule delay of -([0-9\.]+) months/gi, (match, m) => {
            return `operating ${m} months ahead of schedule`;
          });
          clean = clean.replace(/projected schedule delay of 0(?:\.0)? months/gi, "milestone execution strictly on schedule");
          clean = clean.replace(/projected schedule delay of ([0-9\.]+) months/gi, (match, m) => {
            return `projected schedule lag of ${m} months`;
          });

          // 4. Extract clean narrative summary only (remove any attached mitigation plan from this card)
          let narrativeText = clean;
          const resMatch = clean.match(/(?:Recommended Resolution|Recommended Action Plan|EXECUTIVE MITIGATION PLAN|Mitigation Plan)[\s\S]*$/i);
          if (resMatch) {
            narrativeText = clean.replace(/(?:Recommended Resolution|Recommended Action Plan|EXECUTIVE MITIGATION PLAN|Mitigation Plan)[\s\S]*$/i, "").trim();
          }

          // 5. Parse points into distinct lines
          const points = narrativeText
            .split(/•\s*/)
            .map(p => p.trim())
            .filter(p => p.length > 0 && !p.startsWith("PROJECT RISK ASSESSMENT") && !p.startsWith("━") && !p.startsWith("─"));

          return (
            <div
              className="card animate-fade executive-advisory-card"
              style={{
                marginBottom: 24,
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 24, height: 24, borderRadius: 6, overflow: "hidden", flexShrink: 0,
                      border: "1px solid var(--accent-glow)",
                    }}
                  >
                    <img src="/logo.jpg" alt="MoSPI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <span className="executive-advisory-title" style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    MoSPI PAIMANA Executive Risk Assessment
                  </span>
                </div>
                <RiskBadge tier={prediction.risk_tier} suffix={prediction.composite_risk_score != null ? ` (${(prediction.composite_risk_score * 100).toFixed(0)}% Index)` : ""} />
              </div>

              {points.length > 1 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, lineHeight: 1.6 }}>
                  {points.map((pt, idx) => {
                    const colonIdx = pt.indexOf(":");
                    if (colonIdx > 0 && colonIdx < 35) {
                      const key = pt.substring(0, colonIdx).trim();
                      const val = pt.substring(colonIdx + 1);
                      return (
                        <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block", flexShrink: 0, marginTop: 7 }} />
                          <div style={{ flex: 1 }}>
                            <strong style={{ color: "var(--text)", fontWeight: 600 }}>{key}:</strong>
                            <span style={{ color: "var(--text-sub)", marginLeft: 6 }}>{val}</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block", flexShrink: 0, marginTop: 7 }} />
                        <div style={{ flex: 1, color: "var(--text-sub)" }}>{pt}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.7, fontWeight: 400 }}>
                  {narrativeText}
                </div>
              )}
            </div>
          );
        })()}


        {/* Middle Charts Grid */}
        <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, marginBottom: 24 }}>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 16 }}>
              Budget vs Progress
            </div>
            <BurnProgressGauge burnRate={project.burn_rate_pct} physicalProgress={project.physical_progress_pct} gap={project.burn_progress_gap} />
          </div>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 12 }}>
              AI Risk Drivers (SHAP Waterfall)
            </div>
            {prediction ? (
              <ShapWaterfall values={prediction.shap_values} />
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "24px 0" }}>Run a prediction to see risk drivers</div>
            )}
          </div>
        </div>

        {/* Graph-Driven Mitigation — button triggers AI model */}
        {prediction?.shap_values && prediction.shap_values.length > 0 && (
          <div className="card animate-fade" style={{ marginBottom: 24, background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)", display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 20, height: 20, borderRadius: 5, overflow: "hidden", flexShrink: 0,
                    border: "1px solid var(--accent-glow)",
                  }}
                >
                  <img src="/logo.jpg" alt="PRISM AI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                AI-Generated Mitigation Plan
                {mitigationModel && (
                  <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(99, 102, 241, 0.15)", color: "#818cf8", borderRadius: 12, border: "1px solid rgba(99, 102, 241, 0.3)", textTransform: "none", letterSpacing: "normal", fontWeight: 500 }}>
                    {mitigationModel}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {mitigationText && !mitigationLoading && (
                  <PdfExportButton
                    project={project}
                    prediction={prediction}
                    mitigationPlan={mitigationText}
                    onMitigationFetched={(text, model) => {
                      setMitigationText(text);
                      setMitigationModel(model);
                    }}
                    label="Export PDF with AI Plan"
                    className="btn btn-secondary animate-fade"
                  />
                )}
                <button
                  id="generate-mitigation-btn"
                  className="btn btn-primary"
                  disabled={mitigationLoading}
                  onClick={async () => {
                    if (!project) return;
                    setMitigationLoading(true);
                    setMitigationError("");
                    setMitigationText(null);
                    try {
                      const res = await generateMitigation(project.id);
                      setMitigationText(res.mitigation_text);
                      setMitigationModel(res.model || "Hugging Face Qwen 2.5");
                    } catch (e: any) {
                      setMitigationError(e?.message || "Failed to generate mitigation plan. Please try again.");
                    } finally {
                      setMitigationLoading(false);
                    }
                  }}
                  style={{ fontSize: 12, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {mitigationLoading ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      {mitigationText ? "Regenerate AI Mitigation Plan" : "Generate AI Mitigation Plan"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Loading state */}
            {mitigationLoading && (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 8 }}>AI Model is analysing this project...</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Analyzing project parameters and generating customized mitigation actions.</div>
                <div style={{ marginTop: 16, height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, var(--accent) 0%, #a855f7 50%, var(--accent) 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s ease-in-out infinite" }} />
                </div>
              </div>
            )}

            {/* Error state */}
            {mitigationError && !mitigationLoading && (
              <div style={{ color: "#f43f5e", fontSize: 12, padding: "8px 0", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {mitigationError}
              </div>
            )}

            {/* Generated output */}
            {mitigationText && !mitigationLoading && (
              <div style={{ animation: "fadeIn 0.4s ease" }}>
                <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "18px 20px", borderLeft: "3px solid var(--accent)" }}>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--text)", lineHeight: 1.75 }}>
                    {mitigationText}
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder state — before button is clicked */}
            {!mitigationText && !mitigationLoading && !mitigationError && (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Click <strong style={{ color: "var(--accent)" }}>Generate AI Mitigation Plan</strong> to run the AI model and get a unique, project-specific action plan.
              </div>
            )}
          </div>
        )}

        {/* Bottom Trend & What-If Simulation Grid */}
        <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 24 }}>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 12 }}>
              Risk Score Trend
            </div>
            <RiskTrendChart predictions={history} />
          </div>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 12 }}>
              What-If Simulation
            </div>
            <WhatIfPanel
              projectId={id}
              currentScore={prediction?.composite_risk_score}
              currentRevisedCost={project.revised_cost_cr || project.original_cost_cr}
              currentProgress={project.physical_progress_pct ?? undefined}
            />
          </div>
        </div>


        {/* Milestones Table */}
        {project.milestones && project.milestones.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              Project Milestones
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Milestone Name</th>
                  <th>Scheduled Date</th>
                  <th>Actual Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {project.milestones.map((m) => (
                  <tr key={m.id}>
                    <td style={{ color: "var(--text)", fontWeight: 500 }}>{m.milestone_name}</td>
                    <td>{m.scheduled_date || "-"}</td>
                    <td>{m.actual_date || "-"}</td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: m.is_completed ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                          color: m.is_completed ? "var(--low)" : "var(--high)",
                          fontWeight: 600,
                        }}
                      >
                        {m.is_completed ? "Completed" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}