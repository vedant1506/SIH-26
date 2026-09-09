"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProject, predictProject, getProjectPredictions } from "@/lib/api";
import type { Project, RiskPrediction } from "@/lib/types";
import TopBar from "@/components/layout/TopBar";
import RiskBadge from "@/components/ui/RiskBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import KpiCard from "@/components/ui/KpiCard";
import ShapWaterfallChart from "@/components/charts/ShapWaterfallChart";
import HistoricalTrajectoryChart from "@/components/charts/HistoricalTrajectoryChart";
import RiskTrendChart from "@/components/charts/RiskTrendChart";
import BurnProgressGauge from "@/components/charts/BurnProgressGauge";
import WhatIfPanel from "@/components/features/WhatIfPanel";
import StructuredMitigationSection from "@/components/features/StructuredMitigationSection";
import ProjectDocumentsSection from "@/components/documents/ProjectDocumentsSection";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [history, setHistory] = useState<RiskPrediction[]>([]);
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
            {/* Stagnation Alert Banner — shown when project is severely behind schedule */}
            {project.time_elapsed_ratio != null &&
              project.physical_progress_pct != null &&
              project.time_elapsed_ratio > 0.5 &&
              project.physical_progress_pct < 15.0 && (
                <div style={{
                  marginTop: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(244,63,94,0.12)",
                  border: "1px solid rgba(244,63,94,0.40)",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#f43f5e",
                  maxWidth: 600,
                }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>
                    PROJECT STAGNATION DETECTED — {(project.time_elapsed_ratio * 100).toFixed(0)}% of timeline elapsed with only {project.physical_progress_pct.toFixed(1)}% physical progress.
                    {" "}SPI = {project.time_elapsed_ratio > 0 ? (project.physical_progress_pct / (project.time_elapsed_ratio * 100)).toFixed(3) : "—"}.
                    {" "}Immediate site inspection and contractor mobilization review required.
                  </span>
                </div>
              )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href={`/actions?project_id=${project.id}&project_name=${encodeURIComponent(project.project_name)}&title=${encodeURIComponent(`Intervention: ${project.project_name}`)}&priority=${prediction?.risk_tier || "medium"}&action=new`}
              className="btn btn-primary"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                padding: "8px 16px",
                boxShadow: "0 0 15px rgba(59, 130, 246, 0.25)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Initiate Action Item
            </Link>
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
              sub={(() => {
                const pp = project.physical_progress_pct ?? 0;
                const ter = project.time_elapsed_ratio ?? 0;
                const gap = project.burn_progress_gap;
                // Stagnation: large time elapsed, near-zero progress — negative gap is NOT "efficiency"
                if (gap != null && gap < 0 && pp < 15.0 && ter >= 0.40) {
                  return "⚠ Stagnation Warning";
                }
                if (gap != null) {
                  return gap > 0 ? `+${gap.toFixed(1)}% spend gap` : `${Math.abs(gap).toFixed(1)}% ahead of spend`;
                }
                return "Ground completion";
              })()}
              color={(() => {
                const pp = project.physical_progress_pct ?? 0;
                const ter = project.time_elapsed_ratio ?? 0;
                return pp < 15.0 && ter >= 0.40 ? "#f43f5e" : "#10b981";
              })()}
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


        {/* Middle Charts Grid — Budget & Progress Gauges + Historical Trajectory */}
        <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, marginBottom: 24 }}>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 16 }}>
              Budget vs Progress (Burn Gap)
            </div>
            <BurnProgressGauge burnRate={project.burn_rate_pct} physicalProgress={project.physical_progress_pct} gap={project.burn_progress_gap} timeElapsedRatio={project.time_elapsed_ratio} />
          </div>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 12 }}>
              Historical & Projected Execution Trajectory
            </div>
            <HistoricalTrajectoryChart project={project} prediction={prediction} />
          </div>
        </div>

        {/* Executive AI Risk Narrative Diagnostic */}
        {prediction?.ai_risk_narrative && (
          <div
            className="card"
            style={{
              marginBottom: 20,
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.06) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              borderRadius: 12,
              padding: "18px 22px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 6,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Executive AI Diagnostic
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                  Automated Root Cause Synthesis & PAIMANA Alert Reasoning
                </span>
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: "1.75",
                color: "var(--text)",
                background: "rgba(0,0,0,0.25)",
                padding: "14px 18px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.06)",
                whiteSpace: "pre-line",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {prediction.ai_risk_narrative}
            </div>
          </div>
        )}

        {/* Full-width Explainable AI (TreeSHAP) Factor Attribution Section */}
        <div className="card" style={{ marginBottom: 24, border: "1px solid var(--border-2)", boxShadow: "0 4px 24px rgba(0,0,0,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#06b6d4",
                  background: "rgba(6,182,212,0.1)",
                  padding: "2px 8px",
                  borderRadius: 4,
                  border: "1px solid rgba(6,182,212,0.25)",
                }}>
                  Explainable AI (XAI)
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Algorithmic Factor Attribution
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>
                TreeSHAP Feature Risk Impact Breakdown
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-sub)", maxWidth: 680 }}>
                Every factor evaluated by the AI model is isolated below, revealing its exact mathematical push towards delay or cost overrun along with clear operational explanations.
              </p>
            </div>

            {prediction?.model_version && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-2)",
                  padding: "5px 12px",
                  borderRadius: 20,
                  color: "var(--text-sub)",
                }}
                title={`Full Engine ID: ${prediction.model_version}`}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", display: "inline-block" }} />
                <span>Engine: <strong style={{ color: "var(--text)" }}>XGBoost + Qwen 2.5 (SHAP)</strong></span>
              </div>
            )}
          </div>
          {prediction ? (
            <ShapWaterfallChart values={prediction.shap_values} baselineScore={prediction.composite_risk_score} riskTier={prediction.risk_tier} modelVersion={prediction.model_version} />
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
              Run a risk prediction to compute live SHAP vector attributions
            </div>
          )}
        </div>

        {/* AI-Powered Multi-LLM Mitigation Plan */}
        <StructuredMitigationSection project={project} prediction={prediction} />

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

        {/* Project Documents & Intelligence Timeline */}
        <ProjectDocumentsSection
          projectId={project.id}
          projectName={project.project_name}
          masterRevisedCost={project.revised_cost_cr || project.original_cost_cr}
          masterProgress={project.physical_progress_pct}
        />

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