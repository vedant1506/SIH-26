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
import ShapWaterfall from "@/components/charts/ShapWaterfall";
import RiskTrendChart from "@/components/charts/RiskTrendChart";
import BurnProgressGauge from "@/components/charts/BurnProgressGauge";
import WhatIfPanel from "@/components/features/WhatIfPanel";
import PdfExportButton from "@/components/features/PdfExportButton";


const DRIVER_SOLUTIONS: Record<string, string> = {
  burn_progress_gap:
    "Conduct immediate joint site audit of financial invoices against physical work completion. Freeze un-verified billing claims and enforce milestone-linked escrow disbursements.",
  time_elapsed_ratio:
    "Fast-track critical path activities by authorizing 24/7 dual-shift operations. Accelerate pending land acquisition, environmental clearances, and utility shifting.",
  cost_variation_pct:
    "Re-evaluate material procurement contracts and cap price escalation clauses. Re-allocate unused project contingency reserves and mandate ministry value-engineering review.",
  physical_progress_num:
    "Deploy additional contractor heavy machinery and manpower. Establish weekly site-level monitoring committees chaired by regional project directors.",
  previous_progress_change:
    "Remove site bottlenecks hindering monthly construction velocity. Provide immediate cash-flow assistance to contractors upon milestone completion.",
};

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
    Promise.all([
      getProject(id),
      getProjectPredictions(id, 10).catch(() => []),
    ])
      .then(async ([p, h]) => {
        setProject(p);
        const historyList = (h as RiskPrediction[]) || [];
        setHistory(historyList);
        if (historyList.length > 0) {
          setPrediction(historyList[0]);
        } else if (p) {
          try {
            const freshPred = await predictProject(id);
            setPrediction(freshPred);
            setHistory([freshPred]);
          } catch (pe) {
            console.error("Auto prediction on load failed", pe);
          }
        }
      })
      .catch((e) => setError(e.message || "Failed to load project details"))
      .finally(() => setLoading(false));
  }, [id]);

  async function runPrediction() {
    if (!project) return;
    setPredicting(true);
    try {
      const pred = await predictProject(id);
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
  if (error || !project)
    return (
      <div style={{ padding: 32 }}>
        <ErrorState message={error || "Project not found"} />
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
              <Link href="/map" style={{ fontSize: 12, color: "var(--text-sub)", textDecoration: "none", fontWeight: 500 }}>
                🗺 View on Map
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
          <div style={{ display: "flex", gap: 10 }}>
            <PdfExportButton project={project} prediction={prediction} />
            <button id="run-prediction-btn" className="btn btn-primary" onClick={runPrediction} disabled={predicting}>
              {predicting ? "Running AI Models..." : "Run AI Prediction"}
            </button>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
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
            label="Physical Progress"
            value={project.physical_progress_pct != null ? `${project.physical_progress_pct.toFixed(1)}%` : "—"}
            sub="As reported"
            color="#10b981"
          />
          <KpiCard
            label="Delay Probability"
            value={prediction ? `${(prediction.delay_probability * 100).toFixed(0)}%` : "—"}
            sub={prediction?.delay_duration_months ? `~${prediction.delay_duration_months} mo delay` : "AI prediction"}
            color={prediction ? (prediction.delay_probability > 0.6 ? "#f43f5e" : "#f59e0b") : "#94a3b8"}
          />
        </div>

        {/* AI Executive Risk Narrative Card */}
        {prediction?.ai_risk_narrative && (
          <div className="card animate-fade" style={{ marginBottom: 24, borderLeft: "4px solid #6366f1", background: "rgba(99, 102, 241, 0.08)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#818cf8", marginBottom: 8 }}>
              🏛️ MoSPI PAIMANA Executive Risk Assessment & Policy Advisory
            </div>

            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, fontWeight: 400, whiteSpace: "pre-line" }}>
              {prediction.ai_risk_narrative}
            </div>

          </div>
        )}


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

        {/* Graph-Driven Actionable Mitigation Solutions Section */}
        {prediction?.shap_values && prediction.shap_values.length > 0 && (
          <div className="card animate-fade" style={{ marginBottom: 24, background: "var(--surface)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)", marginBottom: 16 }}>
              💡 Graph-Driven Actionable Mitigation Solutions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {prediction.shap_values.slice(0, 4).map((sv, idx) => (
                <div key={idx} style={{ background: "var(--surface-2)", padding: 14, borderRadius: 8, borderLeft: `3px solid ${sv.direction === "positive" ? "#f43f5e" : "#10b981"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{sv.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: sv.direction === "positive" ? "#f43f5e" : "#10b981", background: "var(--surface)", padding: "2px 6px", borderRadius: 4 }}>
                      {sv.direction === "positive" ? "+ " : "- "}{(Math.abs(sv.value) * 100).toFixed(0)}% Impact
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-sub)", lineHeight: 1.5 }}>
                    {DRIVER_SOLUTIONS[sv.feature] || "Review project management schedule and optimize site resource deployment."}
                  </div>
                </div>
              ))}
            </div>
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
              onResult={(r) => {
                setPrediction(r);
                setHistory((h) => [r, ...h].slice(0, 10));
              }}
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