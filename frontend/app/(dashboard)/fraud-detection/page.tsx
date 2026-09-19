"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getFraudAndCartelAnalytics } from "../../../lib/api";
import type { FraudAnalyticsResponse, GFR175StatusColor } from "../../../lib/types";
import SourceCitation from "@/components/ui/SourceCitation";
import GFR175ComplianceCard from "@/components/compliance/GFR175ComplianceCard";

export default function FraudDetectionPage() {
  const [data, setData] = useState<FraudAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"phantom" | "spikes" | "cartel" | "rce">("phantom");
  const [complianceFilter, setComplianceFilter] = useState<"ALL" | GFR175StatusColor>("ALL");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [inspectorItem, setInspectorItem] = useState<any | null>(null);

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

  // Filter items in active tab by compliance screening status
  const filterByCompliance = (items: any[]) => {
    if (complianceFilter === "ALL") return items;
    return items.filter((item) => {
      const color = item.gfr175_screening?.status_color;
      return color === complianceFilter;
    });
  };

  // Calculated compliance counts across all modules
  const complianceCounts = useMemo(() => {
    if (!data) return { total: 0, green: 0, yellow: 0, red: 0 };
    const allItems = [
      ...data.phantom_projects,
      ...data.billing_spikes,
      ...data.rce_escalations,
      ...data.contractor_cartel_index,
    ];
    let green = 0;
    let yellow = 0;
    let red = 0;

    allItems.forEach((it) => {
      const c = it.gfr175_screening?.status_color;
      if (c === "RED") red++;
      else if (c === "YELLOW") yellow++;
      else if (c === "GREEN") green++;
    });

    // Fallback to summary counts if populated
    if (data.summary?.gfr175_summary) {
      green = Math.max(green, data.summary.gfr175_summary.green_count || 0);
      yellow = Math.max(yellow, data.summary.gfr175_summary.yellow_count || 0);
      red = Math.max(red, data.summary.gfr175_summary.red_count || 0);
    }

    return {
      total: allItems.length,
      green,
      yellow,
      red,
    };
  }, [data]);

  const filteredPhantom = useMemo(
    () => (data ? filterByCompliance(data.phantom_projects) : []),
    [data, complianceFilter]
  );
  const filteredSpikes = useMemo(
    () => (data ? filterByCompliance(data.billing_spikes) : []),
    [data, complianceFilter]
  );
  const filteredCartel = useMemo(
    () => (data ? filterByCompliance(data.contractor_cartel_index) : []),
    [data, complianceFilter]
  );
  const filteredRce = useMemo(
    () => (data ? filterByCompliance(data.rce_escalations) : []),
    [data, complianceFilter]
  );

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
            Automated statutory screening under GFR Rule 175 for phantom expenditure, front-loaded milestone billing spikes, and cross-state EPC contractor syndicates.
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
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

          {/* GFR 175 Statutory Compliance Summary Bar & Filters */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)",
              border: "1px solid var(--border-2, rgba(255, 255, 255, 0.12))",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                  STATUTORY SCREENING RADAR
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                  GFR 175 Code of Integrity Screening Status
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                Rule 175 screening is advisory. Contractor risk tier remains strictly independent.
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setComplianceFilter("ALL")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: complianceFilter === "ALL" ? "var(--accent, #06b6d4)" : "rgba(255, 255, 255, 0.05)",
                  color: complianceFilter === "ALL" ? "#000" : "var(--text-sub)",
                  border: "1px solid " + (complianceFilter === "ALL" ? "var(--accent, #06b6d4)" : "rgba(255, 255, 255, 0.1)"),
                  transition: "all 0.15s ease",
                }}
              >
                All Cases ({complianceCounts.total})
              </button>

              <button
                onClick={() => setComplianceFilter("RED")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: complianceFilter === "RED" ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.08)",
                  color: "#f87171",
                  border: "1px solid " + (complianceFilter === "RED" ? "#ef4444" : "rgba(239, 68, 68, 0.3)"),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
                Potential Integrity Concern ({complianceCounts.red})
              </button>

              <button
                onClick={() => setComplianceFilter("YELLOW")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: complianceFilter === "YELLOW" ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.08)",
                  color: "#fbbf24",
                  border: "1px solid " + (complianceFilter === "YELLOW" ? "#f59e0b" : "rgba(245, 158, 11, 0.3)"),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                Compliance Review Required ({complianceCounts.yellow})
              </button>

              <button
                onClick={() => setComplianceFilter("GREEN")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: complianceFilter === "GREEN" ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.08)",
                  color: "#34d399",
                  border: "1px solid " + (complianceFilter === "GREEN" ? "#10b981" : "rgba(16, 185, 129, 0.3)"),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                No Integrity Indicators ({complianceCounts.green})
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
            {[
              { id: "phantom", label: `Phantom Outflow (${filteredPhantom.length})` },
              { id: "spikes", label: `Billing Spikes (${filteredSpikes.length})` },
              { id: "cartel", label: `Contractor Cartel Index (${filteredCartel.length})` },
              { id: "rce", label: `Cost Expansion RCE (${filteredRce.length})` },
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
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {filteredPhantom.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-sub)", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  No phantom outflow records match the current compliance screening filter.
                </div>
              ) : (
                filteredPhantom.map((item) => (
                  <div
                    key={item.project_id}
                    style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 12, padding: 22, display: "flex", flexDirection: "column", gap: 14,
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
                          style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", textDecoration: "none" }}
                        >
                          {item.project_name} ↗
                        </Link>
                        <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 2 }}>
                          EPC Consortium: <strong>{item.contractor}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Burn vs Progress Gap</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>
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

                    {/* Embedded GFR 175 Statutory Compliance Card */}
                    <GFR175ComplianceCard
                      screening={item.gfr175_screening}
                      projectId={item.project_id}
                      contractorRiskTier={item.severity}
                      contractorName={item.contractor}
                      projectName={item.project_name}
                      variant="card"
                    />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                        <strong>Action Directive:</strong> {item.recommended_action}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Link
                          href={`/map?project_id=${encodeURIComponent(item.project_id)}&basemap=bhuvan`}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: "6px 12px",
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "rgba(6, 182, 212, 0.12)",
                            color: "#38bdf8",
                            borderColor: "rgba(56, 189, 248, 0.35)",
                          }}
                          title="Locate project on ISRO Bhuvan satellite GIS map"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                            <line x1="9" y1="3" x2="9" y2="18"/>
                            <line x1="15" y1="6" x2="15" y2="21"/>
                          </svg>
                          Locate on GIS (Bhuvan)
                        </Link>
                        <Link
                          href={`/projects/${item.project_id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, textDecoration: "none" }}
                        >
                          Open Dossier
                        </Link>
                        <Link
                          href={`/actions?project_id=${item.project_id}&project_name=${encodeURIComponent(item.project_name)}&title=${encodeURIComponent(`Forensic Action: ${item.flag_reason}`)}&priority=${(item.severity || "critical").toLowerCase()}&action=new`}
                          className="btn btn-primary btn-sm"
                          style={{
                            padding: "6px 12px",
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                          Initiate Action
                        </Link>
                        <button
                          onClick={() => setInspectorItem(item)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            background: "rgba(56, 189, 248, 0.15)",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            color: "#38bdf8",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Forensic Deep Dive
                        </button>
                        <SourceCitation
                          source_document={item.source_document || `FlashReport_${(item.report_month || "April 2026").replace(" ", "_")}.pdf`}
                          source_page={item.source_pdf_page}
                          sl_no={item.sl_no}
                          source_type={item.source_type || "MoSPI Flash Report"}
                          source_title={`Phantom Outlay Evidence: ${item.project_name}`}
                          variant="badge"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Billing Spikes */}
          {activeTab === "spikes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {filteredSpikes.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-sub)", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  No billing spike records match the current compliance screening filter.
                </div>
              ) : (
                filteredSpikes.map((item) => (
                  <div
                    key={item.project_id}
                    style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 12, padding: 22, display: "flex", flexDirection: "column", gap: 14,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                          FRONT-LOADED SURGE SPIKE
                        </span>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: "4px 0" }}>{item.project_name}</h3>
                        <div style={{ fontSize: 12, color: "var(--text-sub)" }}>{item.state} • {item.sector} • Contractor: <strong>{item.contractor}</strong></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Burn-to-Progress Ratio</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#38bdf8" }}>{item.spike_ratio}x</div>
                      </div>
                    </div>

                    <p style={{ fontSize: 12.5, color: "var(--text-sub)", margin: 0 }}>
                      {item.flag_reason}
                    </p>

                    {/* Embedded GFR 175 Statutory Compliance Card */}
                    <GFR175ComplianceCard
                      screening={item.gfr175_screening}
                      projectId={item.project_id}
                      contractorRiskTier="HIGH"
                      contractorName={item.contractor}
                      projectName={item.project_name}
                      variant="card"
                    />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "var(--text-sub)" }}>Recommendation: {item.recommended_action}</span>
                        <SourceCitation
                          source_document={item.source_document || `FlashReport_${(item.report_month || "April 2026").replace(" ", "_")}.pdf`}
                          source_page={item.source_pdf_page}
                          sl_no={item.sl_no}
                          source_type={item.source_type || "MoSPI Flash Report"}
                          source_title={`Billing Spike Evidence: ${item.project_name}`}
                          variant="inline"
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Link
                          href={`/map?project_id=${encodeURIComponent(item.project_id)}&basemap=bhuvan`}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: "5px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "rgba(6, 182, 212, 0.12)",
                            color: "#38bdf8",
                            borderColor: "rgba(56, 189, 248, 0.3)",
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                            <line x1="9" y1="3" x2="9" y2="18"/>
                            <line x1="15" y1="6" x2="15" y2="21"/>
                          </svg>
                          Locate on GIS
                        </Link>
                        <Link
                          href={`/projects/${item.project_id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, textDecoration: "none" }}
                        >
                          Dossier
                        </Link>
                        <Link
                          href={`/actions?project_id=${item.project_id}&project_name=${encodeURIComponent(item.project_name)}&title=${encodeURIComponent(`Billing Surge Audit: ${item.flag_reason}`)}&priority=high&action=new`}
                          className="btn btn-primary btn-sm"
                          style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, textDecoration: "none" }}
                        >
                          Action
                        </Link>
                        <button
                          onClick={() => setInspectorItem(item)}
                          style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        >
                          Forensic Audit
                        </button>
                        <button
                          onClick={() => handleEscalateAction(item.project_name, "Drone Orthophoto MB Verification")}
                          style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        >
                          Trigger Drone MB
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Contractor Cartel Index */}
          {activeTab === "cartel" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {filteredCartel.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-sub)", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  No contractor consortiums match the current compliance screening filter.
                </div>
              ) : (
                filteredCartel.map((c) => {
                  const tierColor = c.risk_tier === "CRITICAL" ? "#ef4444" : c.risk_tier === "HIGH" ? "#f59e0b" : "#38bdf8";
                  return (
                    <div
                      key={c.contractor_name}
                      style={{
                        background: "var(--surface)", border: `1px solid ${tierColor}40`,
                        borderRadius: 12, padding: 22, display: "flex", flexDirection: "column", gap: 14,
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
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px" }}>
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
                          Consortium Concentration Indicators
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {c.forensic_indicators.map((ind: string, i: number) => (
                            <div key={i} style={{ fontSize: 12, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ color: tierColor }}>•</span>
                              <span>{ind}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Embedded GFR 175 Statutory Compliance Card */}
                      <GFR175ComplianceCard
                        screening={c.gfr175_screening}
                        contractorRiskTier={c.risk_tier}
                        contractorName={c.contractor_name}
                        variant="card"
                      />

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 12, color: "var(--text-sub)" }}>
                        <div>
                          Operates across <strong>{c.active_states.length} states</strong>: {c.active_states.slice(0, 5).join(", ")}{c.active_states.length > 5 ? ` +${c.active_states.length - 5} more` : ""}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setInspectorItem({ ...c, project_name: `${c.contractor_name} (Consortium)` })}
                            style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                          >
                            Audit Profile
                          </button>
                          <button
                            onClick={() => handleEscalateAction(c.contractor_name, "Cartel Investigation Referral to Competition Commission of India (CCI)")}
                            style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", color: "#c084fc", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                          >
                            Refer to Competition Commission (CCI)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 4: Cost Expansion (RCE) */}
          {activeTab === "rce" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filteredRce.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-sub)", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  No cost expansion records match the current compliance screening filter.
                </div>
              ) : (
                filteredRce.map((item) => (
                  <div
                    key={item.project_id}
                    style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>{item.project_name}</h4>
                        <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                          {item.state} • {item.sector} • Contractor: <strong>{item.contractor}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 4 }}>
                          {item.flag_reason}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>+{item.escalation_pct}%</div>
                        <div style={{ fontSize: 11, color: "var(--text-sub)" }}>+₹{item.cost_overrun_cr} Cr Overrun</div>
                      </div>
                    </div>

                    {/* Embedded GFR 175 Statutory Compliance Card */}
                    <GFR175ComplianceCard
                      screening={item.gfr175_screening}
                      projectId={item.project_id}
                      contractorRiskTier="HIGH"
                      contractorName={item.contractor}
                      projectName={item.project_name}
                      variant="card"
                    />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                      <SourceCitation
                        source_document={item.source_document || `FlashReport_${(item.report_month || "April 2026").replace(" ", "_")}.pdf`}
                        source_page={item.source_pdf_page}
                        sl_no={item.sl_no}
                        source_type={item.source_type || "MoSPI Flash Report"}
                        source_title={`RCE Cost Escalation Evidence: ${item.project_name}`}
                        variant="inline"
                      />
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <Link
                          href={`/map?project_id=${encodeURIComponent(item.project_id)}&basemap=bhuvan`}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: "5px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "rgba(6, 182, 212, 0.12)",
                            color: "#38bdf8",
                            borderColor: "rgba(56, 189, 248, 0.3)",
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                            <line x1="9" y1="3" x2="9" y2="18"/>
                            <line x1="15" y1="6" x2="15" y2="21"/>
                          </svg>
                          Locate on GIS
                        </Link>
                        <Link
                          href={`/projects/${item.project_id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, textDecoration: "none" }}
                        >
                          Dossier
                        </Link>
                        <Link
                          href={`/actions?project_id=${item.project_id}&project_name=${encodeURIComponent(item.project_name)}&title=${encodeURIComponent(`RCE Cost Expansion Audit: +${item.escalation_pct}%`)}&priority=high&action=new`}
                          className="btn btn-primary btn-sm"
                          style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, textDecoration: "none" }}
                        >
                          Action
                        </Link>
                        <button
                          onClick={() => setInspectorItem(item)}
                          style={{ padding: "5px 12px", borderRadius: 6, background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        >
                          Inspect Sanction Records
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : null}

      {/* Forensic Deep Dive & GFR 175 Audit Modal */}
      {inspectorItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setInspectorItem(null)}
        >
          <div
            style={{
              background: "var(--surface, #0f172a)",
              border: "1px solid var(--border, rgba(255,255,255,0.15))",
              borderRadius: 12,
              padding: 24,
              maxWidth: 720,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
                  STATUTORY SCREENING INSPECTOR
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: "4px 0 0" }}>
                  {inspectorItem.project_name || inspectorItem.contractor_name}
                </h3>
              </div>
              <button
                onClick={() => setInspectorItem(null)}
                style={{ background: "none", border: "none", color: "var(--text-sub)", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Embedded GFR 175 Card inside Inspector */}
            <div style={{ marginBottom: 20 }}>
              <GFR175ComplianceCard
                screening={inspectorItem.gfr175_screening}
                projectId={inspectorItem.project_id}
                contractorRiskTier={inspectorItem.severity || inspectorItem.risk_tier || "HIGH"}
                contractorName={inspectorItem.contractor || inspectorItem.contractor_name}
                projectName={inspectorItem.project_name}
                variant="card"
                showInspectorButton={false}
              />
            </div>

            {/* Empirical Forensic Signal Data */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase", marginBottom: 8 }}>
                Empirical Variance Signals
              </div>
              <div style={{ background: "var(--surface-raised)", padding: 14, borderRadius: 8, fontSize: 12.5, display: "flex", flexDirection: "column", gap: 6 }}>
                <div><strong>Flag Reason:</strong> {inspectorItem.flag_reason || inspectorItem.forensic_indicators?.join("; ") || "Statutory pattern review"}</div>
                {inspectorItem.cumulative_expenditure_cr && (
                  <div><strong>Disbursed Capital:</strong> ₹{inspectorItem.cumulative_expenditure_cr} Cr ({inspectorItem.burn_rate_pct}% budget burn)</div>
                )}
                {inspectorItem.physical_progress_pct != null && (
                  <div><strong>Certified Ground Reality:</strong> {inspectorItem.physical_progress_pct}% completion</div>
                )}
                {inspectorItem.burn_progress_gap != null && (
                  <div><strong>Burn vs Delivery Decoupling Gap:</strong> +{inspectorItem.burn_progress_gap}%</div>
                )}
                {inspectorItem.spike_ratio && (
                  <div><strong>Burn-to-Progress Front-loading Ratio:</strong> {inspectorItem.spike_ratio}x</div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              {inspectorItem.project_id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Link
                    href={`/map?project_id=${encodeURIComponent(inspectorItem.project_id)}&basemap=bhuvan`}
                    className="btn btn-secondary btn-sm"
                    style={{
                      padding: "7px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "rgba(6, 182, 212, 0.12)",
                      color: "#38bdf8",
                      borderColor: "rgba(56, 189, 248, 0.35)",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                      <line x1="9" y1="3" x2="9" y2="18"/>
                      <line x1="15" y1="6" x2="15" y2="21"/>
                    </svg>
                    Locate on GIS (Bhuvan)
                  </Link>
                  <Link
                    href={`/projects/${inspectorItem.project_id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                  >
                    Open Project Dossier
                  </Link>
                  <Link
                    href={`/actions?project_id=${inspectorItem.project_id}&project_name=${encodeURIComponent(inspectorItem.project_name || "Project")}&title=${encodeURIComponent(`Forensic Action: ${inspectorItem.flag_reason || "GFR 175 Variance"}`)}&priority=${(inspectorItem.severity || inspectorItem.risk_tier || "high").toLowerCase()}&action=new`}
                    className="btn btn-primary btn-sm"
                    style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                  >
                    Initiate Action Workflow
                  </Link>
                </div>
              ) : <div />}

              <button
                onClick={() => setInspectorItem(null)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
