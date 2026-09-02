"use client";
import { useState, useEffect } from "react";
import type { Project, RiskPrediction, StructuredMitigationPlan, MitigationPlanResponse, ModelMetadata } from "@/lib/types";
import { generateMitigationPlan, downloadMitigationPdf } from "@/lib/api";

interface Props {
  project: Project;
  prediction: RiskPrediction | null;
}

const PROGRESS_STEPS = [
  "Building canonical ProjectRiskContext (Financials, Milestones, History)...",
  "Analyzing XGBoost predictive risk scores & delay duration...",
  "Extracting live SHAP feature contributions & risk drivers...",
  "Running Qwen 2.5 infrastructure risk mitigation strategy...",
  "Performing cross-model review & evidence-grounded synthesis...",
  "Validating strict JSON schema and computing Plan Hash...",
];

export default function StructuredMitigationSection({ project, prediction }: Props) {
  const [plan, setPlan] = useState<StructuredMitigationPlan | null>(null);
  const [planId, setPlanId] = useState<string>("");
  const [planVersion, setPlanVersion] = useState<number>(1);
  const [planHash, setPlanHash] = useState<string>("");
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [pdfDownloading, setPdfDownloading] = useState<boolean>(false);

  // Reset state when project.id changes (prevents cross-project state bugs)
  // AI mitigation plan runs ONLY on-demand when user clicks "Generate AI Mitigation Plan"
  useEffect(() => {
    setPlan(null);
    setPlanId("");
    setPlanVersion(1);
    setPlanHash("");
    setModelMetadata(null);
    setError("");
    setLoading(false);
    setProgressStep(0);
  }, [project?.id]);

  async function handleGenerate(force = true) {
    if (!project?.id || loading) return;
    setLoading(true);
    setError("");
    setProgressStep(0);

    const interval = setInterval(() => {
      setProgressStep((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 400);

    try {
      const res = await generateMitigationPlan(project.id, force);
      if (res?.plan) {
        setPlan(res.plan);
        setPlanId(res.plan_id || "MP-2026-AUTOGEN");
        setPlanVersion(res.plan_version || 1);
        setPlanHash(res.plan_hash || "");
        setGeneratedAt(res.generated_at || new Date().toISOString());
        setModelMetadata(res.model_metadata || null);
      } else {
        throw new Error("Invalid mitigation plan response from AI service.");
      }
    } catch (e: any) {
      setError(e?.message || "AI mitigation generation failed. Please retry.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!project?.id || !plan || pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const primaryModel = modelMetadata?.primary_model || "Qwen 2.5";
      const blob = await downloadMitigationPdf(project.id, planId, plan, primaryModel);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TRACE_AI_Mitigation_Plan_${plan.project_summary.project_id || project.id}_${planId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("PDF download error:", e);
      alert("Failed to generate PDF report. Please try again.");
    } finally {
      setPdfDownloading(false);
    }
  }

  // Split actions into immediate/critical vs next/medium
  const immediateActions = plan?.mitigation_actions?.filter(
    (a) => a.severity === "CRITICAL" || a.priority <= 2 || a.timeline.toLowerCase().includes("immediate") || a.timeline.toLowerCase().includes("7")
  ) || [];

  const followUpActions = plan?.mitigation_actions?.filter(
    (a) => !immediateActions.includes(a)
  ) || [];

  return (
    <div className="card animate-fade" style={{ marginBottom: 24, background: "var(--surface)" }}>
      {/* Top Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              width: 24, height: 24, borderRadius: 6, overflow: "hidden", flexShrink: 0,
              border: "1px solid var(--accent-glow)",
            }}
          >
            <img src="/logo.jpg" alt="TRACE AI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)" }}>
              AI Mitigation Plan
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
              (Live Project Risk Intelligence)
            </span>
          </div>
        </div>

        {/* Action Buttons & Canonical Identifiers */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {plan && planId && !loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", background: "var(--surface-2)", padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text)" }}><strong>Plan ID:</strong> {planId}</span>
              <span>·</span>
              <span>v{planVersion}</span>
              {planHash && (
                <>
                  <span>·</span>
                  <span title={`Full Plan SHA256: ${planHash}`} style={{ cursor: "help", color: "var(--accent)" }}>
                    Hash: {planHash.substring(0, 8)}...
                  </span>
                </>
              )}
            </div>
          )}

          {plan && !loading && (
            <button
              onClick={handleDownloadPdf}
              disabled={pdfDownloading}
              className="btn btn-secondary animate-fade"
              style={{ fontSize: 12, padding: "7px 14px", display: "flex", alignItems: "center", gap: 6 }}
            >
              {pdfDownloading ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Generate PDF
                </>
              )}
            </button>
          )}

          {plan && !loading && (
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading}
              className="btn btn-primary"
              style={{ fontSize: 12, padding: "7px 16px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Regenerate AI Plan
            </button>
          )}
        </div>
      </div>

      {/* Loading Progress State */}
      {loading && (
        <div style={{ padding: "28px 20px", textAlign: "center", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>
            {PROGRESS_STEPS[progressStep]}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
            Step {progressStep + 1} of {PROGRESS_STEPS.length} · Processing live SHAP vectors and multi-LLM risk synthesis
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", maxWidth: 420, margin: "0 auto" }}>
            <div
              style={{
                height: "100%",
                width: `${((progressStep + 1) / PROGRESS_STEPS.length) * 100}%`,
                background: "linear-gradient(90deg, var(--accent) 0%, #a855f7 50%, #38bdf8 100%)",
                transition: "width 0.35s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Error State (Never generic static text) */}
      {error && !loading && (
        <div style={{ color: "#f43f5e", fontSize: 12, padding: "12px 16px", background: "rgba(244, 63, 94, 0.08)", borderRadius: 8, border: "1px solid rgba(244, 63, 94, 0.25)", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {error}
        </div>
      )}

      {/* Structured Plan Rendering */}
      {plan && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Section 1: Executive Recommendation & Why At Risk */}
          <div style={{ background: "rgba(6, 182, 212, 0.06)", borderLeft: "4px solid var(--accent)", borderRadius: "0 8px 8px 0", padding: "14px 18px", border: "1px solid rgba(6, 182, 212, 0.2)", borderLeftWidth: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", marginBottom: 6 }}>
              1. Executive Recommendation
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.65 }}>
              {plan.executive_recommendation}
            </div>
          </div>

          {/* Section 2: Main Risk Drivers (SHAP + XGBoost) */}
          {plan.risk_drivers && plan.risk_drivers.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
                2. Main Risk Drivers (SHAP Feature Attribution)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
                {plan.risk_drivers.map((d, i) => (
                  <div key={i} style={{ background: "var(--surface-2)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{d.factor}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "rgba(244, 63, 94, 0.12)", color: "#f43f5e" }}>
                        {d.impact}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-sub)", lineHeight: 1.5 }}>
                      {d.evidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Root Cause Analysis */}
          {plan.root_causes && plan.root_causes.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
                3. Why This Project Is At Risk (Root Cause Analysis)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {plan.root_causes.map((rc, i) => (
                  <div key={i} style={{ background: "var(--surface-2)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                      {rc.risk}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-sub)", lineHeight: 1.5, marginBottom: 4 }}>
                      <strong style={{ color: "var(--text)" }}>Likely Cause:</strong> {rc.cause}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      <strong style={{ color: "var(--text-sub)" }}>Observed Evidence:</strong> {rc.evidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: What Should Be Done Now (Immediate Actions) */}
          {immediateActions.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#f43f5e", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f43f5e" }} />
                4. What Should Be Done Now (Immediate Actions)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {immediateActions.map((act, i) => (
                  <div key={i} style={{ background: "var(--surface-2)", borderRadius: 8, padding: "14px 16px", border: "1px solid rgba(244, 63, 94, 0.3)", borderLeft: "4px solid #f43f5e", display: "flex", gap: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#f43f5e", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                      P{act.priority}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                        {act.action}
                      </div>
                      {act.evidence && (
                        <div style={{ fontSize: 11, color: "var(--accent)", background: "rgba(6, 182, 212, 0.08)", padding: "4px 8px", borderRadius: 4, marginBottom: 6, display: "inline-block" }}>
                          <strong>Project Evidence:</strong> {act.evidence}
                        </div>
                      )}
                      <div style={{ fontSize: 11.5, color: "var(--text-sub)", lineHeight: 1.5, marginBottom: 8 }}>
                        <strong style={{ color: "var(--text)" }}>Reason:</strong> {act.reason}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, background: "rgba(0,0,0,0.15)", padding: "8px 10px", borderRadius: 6, fontSize: 11 }}>
                        <div><span style={{ color: "var(--text-muted)" }}>Target Timeline:</span> <strong style={{ color: "var(--accent)" }}>{act.timeline}</strong></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Responsible Role:</span> <strong style={{ color: "var(--text)" }}>{act.responsible_role}</strong></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Expected Outcome:</span> <strong style={{ color: "#10b981" }}>{act.expected_outcome}</strong></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Escalation Trigger:</span> <span style={{ color: "#f43f5e" }}>{act.escalation_trigger}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: What Should Be Done Next (Follow-up Actions) */}
          {followUpActions.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)", marginBottom: 8 }}>
                5. What Should Be Done Next (Secondary & Preventive Actions)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {followUpActions.map((act, i) => (
                  <div key={i} style={{ background: "var(--surface-2)", borderRadius: 8, padding: "14px 16px", border: "1px solid var(--border)", display: "flex", gap: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", color: "#090d16", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                      P{act.priority}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                        {act.action}
                      </div>
                      {act.evidence && (
                        <div style={{ fontSize: 11, color: "var(--accent)", background: "rgba(6, 182, 212, 0.08)", padding: "4px 8px", borderRadius: 4, marginBottom: 6, display: "inline-block" }}>
                          <strong>Project Evidence:</strong> {act.evidence}
                        </div>
                      )}
                      <div style={{ fontSize: 11.5, color: "var(--text-sub)", lineHeight: 1.5, marginBottom: 8 }}>
                        <strong style={{ color: "var(--text)" }}>Reason:</strong> {act.reason}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, background: "rgba(0,0,0,0.15)", padding: "8px 10px", borderRadius: 6, fontSize: 11 }}>
                        <div><span style={{ color: "var(--text-muted)" }}>Timeline:</span> <strong style={{ color: "var(--accent)" }}>{act.timeline}</strong></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Responsible:</span> <strong style={{ color: "var(--text)" }}>{act.responsible_role}</strong></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Outcome:</span> <strong style={{ color: "#10b981" }}>{act.expected_outcome}</strong></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Escalation:</span> <span style={{ color: "#f59e0b" }}>{act.escalation_trigger}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 6: How To Monitor */}
          {plan.monitoring_plan && plan.monitoring_plan.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
                6. How To Monitor (Continuous Indicator Framework)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%", fontSize: 11.5 }}>
                  <thead>
                    <tr>
                      <th>Monitoring Indicator</th>
                      <th>Current Baseline</th>
                      <th>Target Goal</th>
                      <th>Review Cadence</th>
                      <th>Responsible Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.monitoring_plan.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>{m.indicator}</td>
                        <td style={{ color: "var(--text-sub)" }}>{m.current_value}</td>
                        <td style={{ color: "#10b981", fontWeight: 700 }}>{m.target}</td>
                        <td><span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4 }}>{m.frequency}</span></td>
                        <td style={{ color: "var(--accent)" }}>{m.responsible_role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 7: When To Escalate */}
          {plan.escalation_plan && plan.escalation_plan.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
                7. When To Escalate (Institutional Governance Triggers)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%", fontSize: 11.5 }}>
                  <thead>
                    <tr>
                      <th>Trigger Event</th>
                      <th>Variance Threshold</th>
                      <th>Escalate To</th>
                      <th>Recommended Statutory Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.escalation_plan.map((e, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: "#f43f5e" }}>{e.trigger}</td>
                        <td style={{ color: "var(--text)" }}>{e.threshold}</td>
                        <td style={{ color: "var(--accent)", fontWeight: 600 }}>{e.escalate_to}</td>
                        <td style={{ color: "var(--text-sub)" }}>{e.recommended_action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 8: AI Generation Information & Provenance Box */}
          <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <strong>Plan ID:</strong> <span style={{ color: "var(--text)" }}>{planId}</span> | <strong>Hash:</strong> <span style={{ color: "var(--accent)" }}>{planHash.substring(0, 16)}...</span> | <strong>Primary Model:</strong> <span style={{ color: "var(--accent)" }}>{modelMetadata?.primary_model || "Qwen 2.5"}</span>
              {modelMetadata?.models_used && modelMetadata.models_used.length > 1 && (
                <> | <strong>Models:</strong> {modelMetadata.models_used.join(", ")}</>
              )}
            </div>
            <div>
              <strong>Mode:</strong> {modelMetadata?.generation_mode || "Project-Specific Deep Risk Intelligence"} | <strong>Generated:</strong> {new Date(generatedAt || Date.now()).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Initial state before first generation (On-Demand only) */}
      {!plan && !loading && !error && (
        <div style={{ padding: "32px 24px", textAlign: "center", background: "var(--surface-2)", borderRadius: 10, border: "1px dashed var(--border)" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(6, 182, 212, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
            On-Demand AI Project Mitigation Strategy
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 520, margin: "0 auto 18px", lineHeight: 1.6 }}>
            Click below to generate a tailored, evidence-grounded action roadmap analyzing live SHAP feature drivers, milestone progress, and financial variance for this specific asset.
          </div>
          <button
            onClick={() => handleGenerate(true)}
            className="btn btn-primary"
            style={{ fontSize: 12.5, padding: "8px 20px", display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Generate AI Mitigation Plan
          </button>
        </div>
      )}
    </div>
  );
}
