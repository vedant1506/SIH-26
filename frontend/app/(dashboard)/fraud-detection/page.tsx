"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getFraudAndCartelAnalytics } from "../../../lib/api";
import type { FraudAnalyticsResponse } from "../../../lib/types";

export default function FraudDetectionPage() {
  const [data, setData] = useState<FraudAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"phantom" | "spikes" | "cartel" | "rce">("phantom");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getFraudAndCartelAnalytics(50.0, 25);
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load fraud & cartel analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleEscalateAction = (projName: string, actionName: string) => {
    setActionSuccess(`Directive Issued: "${actionName}" dispatched for ${projName}. Internal vigilance memorandum generated.`);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px" }}>
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
              CONFIDENTIAL • CVC / CAG COMPLIANCE SUITE
            </span>
            <span style={{ fontSize: 11, color: "var(--text-sub)" }}>Rule-Based & ML Forensic Audit</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Procurement Forensics & Cartel Detection Radar
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-sub)", margin: "4px 0 0" }}>
            Automated screening for phantom expenditure, front-loaded milestone billing spikes, and cross-state EPC contractor syndicates.
          </p>
        </div>

        <button
          onClick={loadData}
          style={{
            padding: "8px 16px", borderRadius: 8, background: "var(--surface-raised)",
            border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13,
            fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span>⟳</span> Refresh Radar
        </button>
      </div>

      {actionSuccess && (
        <div style={{ background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 8, padding: "12px 16px", color: "#4ade80", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "100px 0", color: "var(--text-sub)" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
          Executing forensic multi-layer audit scans...
        </div>
      ) : error ? (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: 20, borderRadius: 8, color: "#f87171" }}>
          {error}
        </div>
      ) : data ? (
        <>
          {/* Key Metric Tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
            <div style={{ background: "var(--surface)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "#ef4444" }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-sub)", textTransform: "uppercase", marginBottom: 4 }}>
                Suspect Capital Outlay
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#ef4444" }}>
                ₹{data.summary.suspect_outlay_cr.toLocaleString()} Cr
              </div>
              <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 4 }}>
                Cumulative disbursements on decoupled projects
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 12, padding: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "#f59e0b" }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-sub)", textTransform: "uppercase", marginBottom: 4 }}>
                Phantom Progress Projects
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>
                {data.summary.phantom_projects_count}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 4 }}>
                High fund burn with &lt;15% physical ground reality
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: 12, padding: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "#38bdf8" }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-sub)", textTransform: "uppercase", marginBottom: 4 }}>
                Billing Surge Spikes
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8" }}>
                {data.summary.billing_spikes_count}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 4 }}>
                Disproportionate burn-to-delivery ratios (&gt;2.2x)
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: 12, padding: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: "#a855f7" }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-sub)", textTransform: "uppercase", marginBottom: 4 }}>
                High-Risk Cartel EPCs
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#a855f7" }}>
                {data.summary.flagged_contractors_count}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 4 }}>
                Contractor consortiums with cross-state cost escalations
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
            {[
              { id: "phantom", label: `Phantom Outflow (${data.phantom_projects.length})` },
              { id: "spikes", label: `Billing Spikes (${data.billing_spikes.length})` },
              { id: "cartel", label: `Contractor Cartel Index (${data.contractor_cartel_index.length})` },
              { id: "rce", label: `Cost Expansion RCE (${data.rce_escalations.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "10px 16px", background: "none", border: "none",
                  borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                  color: activeTab === tab.id ? "var(--accent)" : "var(--text-sub)",
                  fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 13,
                  cursor: "pointer", transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Phantom Projects */}
          {activeTab === "phantom" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {data.phantom_projects.map((item) => (
                <div
                  key={item.project_id}
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
                          {item.severity} PHANTOM OUTFLOW
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-sub)" }}>{item.sector} • {item.state}</span>
                      </div>
                      <Link
                        href={`/projects/${item.project_id}`}
                        style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", textDecoration: "none" }}
                      >
                        {item.project_name} ↗
                      </Link>
                      <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 2 }}>
                        EPC Consortium: <strong>{item.contractor}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Burn vs Progress Gap</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444" }}>
                        +{item.burn_progress_gap}%
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, background: "var(--surface-raised)", padding: 12, borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Cumulative Spent</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>₹{item.cumulative_expenditure_cr} Cr</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Capital Burn Rate</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>{item.burn_rate_pct}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Physical Progress</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444" }}>{item.physical_progress_pct}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Sanctioned Cost</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>₹{item.revised_cost_cr} Cr</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#fca5a5", background: "rgba(239, 68, 68, 0.08)", padding: "8px 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>{item.flag_reason}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
                    <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                      <strong>Action Directive:</strong> {item.recommended_action}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Billing Spikes */}
          {activeTab === "spikes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {data.billing_spikes.map((item) => (
                <div
                  key={item.project_id}
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                        FRONT-LOADED SURGE SPIKE
                      </span>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "4px 0" }}>{item.project_name}</h3>
                      <div style={{ fontSize: 12, color: "var(--text-sub)" }}>{item.state} • {item.sector} • Contractor: <strong>{item.contractor}</strong></div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Burn-to-Progress Ratio</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>{item.spike_ratio}x</div>
                    </div>
                  </div>

                  <p style={{ fontSize: 12, color: "var(--text-sub)", margin: 0 }}>
                    {item.flag_reason}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 11, color: "var(--text-sub)" }}>Recommendation: {item.recommended_action}</span>
                    <button
                      onClick={() => handleEscalateAction(item.project_name, "Drone Orthophoto MB Verification")}
                      style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      Trigger Drone MB Verification
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Contractor Cartel Index */}
          {activeTab === "cartel" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {data.contractor_cartel_index.map((c) => {
                const tierColor = c.risk_tier === "CRITICAL" ? "#ef4444" : c.risk_tier === "HIGH" ? "#f59e0b" : "#38bdf8";
                return (
                  <div
                    key={c.contractor_name}
                    style={{
                      background: "var(--surface)", border: `1px solid ${tierColor}40`,
                      borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}40` }}>
                            {c.risk_tier} CARTEL RISK TIER
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
                            Cartel Score: <strong>{c.cartel_risk_score}/100</strong>
                          </span>
                        </div>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px" }}>
                          {c.contractor_name}
                        </h3>
                        <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                          Sectors: {c.sectors.join(", ")}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 16 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Active Portfolio</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>₹{c.total_portfolio_cr.toLocaleString()} Cr</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Total Cost Overrun</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: tierColor }}>+₹{c.total_escalation_cr.toLocaleString()} Cr</div>
                        </div>
                      </div>
                    </div>

                    {/* Forensic Indicators */}
                    <div style={{ background: "var(--surface-raised)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase", marginBottom: 6 }}>
                        Forensic Pattern Indicators
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {c.forensic_indicators.map((ind, i) => (
                          <div key={i} style={{ fontSize: 12, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: tierColor }}>•</span>
                            <span>{ind}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 12, color: "var(--text-sub)" }}>
                      <div>
                        Operates across <strong>{c.active_states.length} states</strong>: {c.active_states.slice(0, 5).join(", ")}{c.active_states.length > 5 ? ` +${c.active_states.length - 5} more` : ""}
                      </div>
                      <button
                        onClick={() => handleEscalateAction(c.contractor_name, "Cartel Investigation Referral to Competition Commission of India (CCI)")}
                        style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", color: "#c084fc", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      >
                        Refer to Competition Commission (CCI)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 4: Cost Expansion (RCE) */}
          {activeTab === "rce" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.rce_escalations.map((item) => (
                <div
                  key={item.project_id}
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>{item.project_name}</h4>
                    <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                      {item.state} • {item.sector} • Contractor: {item.contractor}
                    </div>
                    <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>
                      {item.flag_reason}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>+{item.escalation_pct}%</div>
                    <div style={{ fontSize: 11, color: "var(--text-sub)" }}>+₹{item.cost_overrun_cr} Cr Overrun</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
