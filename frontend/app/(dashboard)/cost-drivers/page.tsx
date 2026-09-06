"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import { getCostDrivers } from "@/lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from "recharts";

interface CostDriver {
  driver: string;
  contribution_pct: number;
  affected_projects: number;
  sectors: string[];
}

interface SectorProfile {
  sector: string;
  total_projects: number;
  high_risk_projects: number;
  high_risk_pct: number;
  avg_burn_gap: number;
}

interface CostDriversResponse {
  drivers: CostDriver[];
  sector_profile: SectorProfile[];
  total_portfolio: number;
}

const DRIVER_COLORS = [
  "#f43f5e", // Critical Rose
  "#f59e0b", // High Amber
  "#38bdf8", // Sky Blue
  "#a855f7", // Violet
  "#ec4899", // Pink
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

const DRIVER_CATEGORIES: Record<string, string> = {
  "Progress-to-Expenditure Mismatch": "Fiscal Burn Divergence",
  "Timeline Slippage / Extension": "Schedule Slippage",
  "Cost Revision (Scope Creep)": "Budget & Scope Expansion",
  "Low Physical Progress": "Execution Bottleneck",
  "High Capital Exposure": "Fiscal Scale Risk",
  "Land Acquisition Delays": "Right-of-Way & Statutory",
  "Contractor Performance Issues": "Procurement & EPC Agency",
  "Environmental / Clearance Delays": "Regulatory & Ecological",
};

const PLAYBOOK_REMEDIES: Record<
  string,
  {
    summary: string;
    step1: string;
    step2: string;
    step3: string;
  }
> = {
  "Progress-to-Expenditure Mismatch": {
    summary: "Expenditure run rate significantly exceeds physical ground progress, indicating premature billing or uncertified disbursements.",
    step1: "Trigger mandatory joint financial audit between MoSPI nodal director and implementing agency chief engineer within 7 business days.",
    step2: "Enforce digital milestone verification holding back next milestone tranche disbursements until physical telemetry matches invoice certifications.",
    step3: "Audit EPC sub-contractor payment flows to identify working capital leaks and unapproved advance adjustments.",
  },
  "Timeline Slippage / Extension": {
    summary: "Milestone completion dates breached with compounding delays on critical path civil engineering packages.",
    step1: "Reconstitute inter-departmental task force with State Chief Secretary to eliminate inter-agency handover impasses.",
    step2: "Enforce contract liquidated damages (LD) provisions and mandate double-shift work schedules on stalled structural works.",
    step3: "Fast-track parallel track utility shifting and Stage-II statutory handover with dedicated nodal liaisons.",
  },
  "Cost Revision (Scope Creep)": {
    summary: "Successive unapproved administrative cost revisions diluting initial sanctioned economic rate of return (ERR).",
    step1: "Mandate Cabinet Committee on Economic Affairs (CCEA) / EFC justification note for any variance > 10% over original sanction.",
    step2: "Conduct third-party technical audit on detailed project report (DPR) design changes and structural additions.",
    step3: "Freeze unapproved scope alterations and cap recurring administrative escalation overheads.",
  },
  "Low Physical Progress": {
    summary: "Ground progress trailing targeted completion benchmarks by greater than 20% despite sanctioned capital mobilization.",
    step1: "Direct on-site inspection by MoSPI Regional Monitoring Officer to audit machinery and labor mobilization.",
    step2: "Issue 14-day cure notice to EPC concessionaire for resource deficits and failure to meet scheduled milestones.",
    step3: "Deploy drone GIS spatial telemetry to benchmark month-on-month volumetric earthwork and civil construction pace.",
  },
  "High Capital Exposure": {
    summary: "Mega-scale infrastructure asset (>₹1,000 Cr) with outsized fiscal sensitivity to macroeconomic interest rate or material volatility.",
    step1: "Establish weekly executive oversight desk directly under Ministry Financial Advisor (FA).",
    step2: "Implement dynamic commodity price index tracking (steel, bitumen, cement) to anticipate contractual escalation claims.",
    step3: "Formulate contingency risk capital reserves with State Bank consortium to ensure liquidity continuity.",
  },
  "Land Acquisition Delays": {
    summary: "Right-of-Way (RoW) acquisition halted by pending compensation claims, tribunal disputes, or forest boundary demarcation.",
    step1: "Direct liaison with District Revenue Administration and Special Land Acquisition Officer (SLAO) for accelerated awards.",
    step2: "Expedite Direct Purchase and LARR 2013 compensation disbursement tribunals through dedicated district camps.",
    step3: "Prioritize non-disputed linear stretches for concurrent civil construction while clearing contentious land parcels.",
  },
  "Contractor Performance Issues": {
    summary: "Underperforming EPC agency with persistent resource shortages, subcontractor disputes, or technical execution non-compliance.",
    step1: "Issue formal EPC Clause 14 show-cause notice and review bank guarantee (PBG) validity periods.",
    step2: "Evaluate partial de-scoping of stalled engineering packages to re-tender under fast-track emergency provisions.",
    step3: "Blacklist habitual defaulters across MoRTH / MoR centralized contractor registries to prevent cross-sector exposure.",
  },
  "Environmental / Clearance Delays": {
    summary: "Pending Stage-I/II forest clearance, Wildlife Sanctuary eco-sensitive zone clearances, or CRZ environmental compliance.",
    step1: "Elevate proposal to MoEFCC Parivesh portal fast-track inter-ministerial appraisal committee.",
    step2: "Engage State Chief Wildlife Warden and Regional Forest Officer for expedited compensatory afforestation site sanction.",
    step3: "Design compensatory afforestation and eco-corridor mitigation bypasses to obtain provisional working permissions.",
  },
};

export default function CostDriversPage() {
  const [data, setData] = useState<CostDriversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [hoveredDriver, setHoveredDriver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"donut" | "bars">("donut");

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    try {
      setLoading(true);
      setError("");
      const res = await getCostDrivers();
      setData(res);
      if (res.drivers?.length > 0) {
        setSelectedDriver(res.drivers[0].driver);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load cost drivers data.");
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    if (!data?.drivers) return [];
    return data.drivers.map((d, i) => ({
      name: d.driver,
      fullName: d.driver,
      category: DRIVER_CATEGORIES[d.driver] || "Risk Dimension",
      contribution: d.contribution_pct,
      affected: d.affected_projects,
      color: DRIVER_COLORS[i % DRIVER_COLORS.length],
      rank: i + 1,
    }));
  }, [data]);

  const activeDisplayDriver = hoveredDriver || selectedDriver;
  const activeDisplayObj = useMemo(() => {
    if (!chartData.length) return null;
    if (activeDisplayDriver) {
      const match = chartData.find((d) => d.fullName === activeDisplayDriver);
      if (match) return match;
    }
    return chartData[0];
  }, [chartData, activeDisplayDriver]);

  const activeDriverSop = useMemo(() => {
    if (!activeDisplayObj) return null;
    return (
      PLAYBOOK_REMEDIES[activeDisplayObj.fullName] || {
        summary: "Empirical risk indicator active across central sector capital expenditure programs.",
        step1: "Convene inter-agency task group with nodal ministry to inspect project telemetry.",
        step2: "Audit contractual milestone delivery commitments and align disbursements with physical outputs.",
        step3: "Elevate critical path bottleneck to MoSPI PRISM unified escalation register.",
      }
    );
  }, [activeDisplayObj]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <TopBar
        title="Cost Escalation & Risk Drivers"
        subtitle="Empirical attribution of fiscal variances across 1,981 central sector projects via Global TreeSHAP synthesis (April 2026 Universe)"
      />

      <div style={{ padding: "24px 24px 60px", maxWidth: 1400, margin: "0 auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "100px 0" }}>
            <LoadingSpinner size={44} label="Synthesizing multi-variate TreeSHAP cost escalation models..." />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDrivers} />
        ) : !data ? null : (
          <>
            {/* Macro KPI Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  background: "linear-gradient(145deg, rgba(244,63,94,0.06) 0%, rgba(10,16,32,0.8) 100%)",
                  borderLeft: "3px solid #f43f5e",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                  Primary Cost Escalation Driver
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginTop: 6, lineHeight: 1.3 }}>
                  {data.drivers[0]?.driver || "—"}
                </div>
                <div style={{ fontSize: 12, color: "#f43f5e", marginTop: 4, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>●</span> {data.drivers[0]?.contribution_pct}% variance attribution
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  background: "linear-gradient(145deg, rgba(245,158,11,0.06) 0%, rgba(10,16,32,0.8) 100%)",
                  borderLeft: "3px solid #f59e0b",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                  Burn Gap Vulnerability
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b", marginTop: 4 }}>
                  {data.drivers[0]?.affected_projects || 0} Assets
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Expenditure outpacing verified ground progress &gt; 10%
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  background: "linear-gradient(145deg, rgba(56,189,248,0.06) 0%, rgba(10,16,32,0.8) 100%)",
                  borderLeft: "3px solid #38bdf8",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                  Highest-Exposure Sector
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8", marginTop: 4 }}>
                  {data.sector_profile[0]?.sector || "—"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {data.sector_profile[0]?.high_risk_pct}% classified High/Critical risk
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  background: "linear-gradient(145deg, rgba(168,85,247,0.06) 0%, rgba(10,16,32,0.8) 100%)",
                  borderLeft: "3px solid #a855f7",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                  Authoritative Universe
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>
                  {data.total_portfolio.toLocaleString()} Projects
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  MoSPI Flash Report April 2026 Certified
                </div>
              </div>
            </div>

            {/* Main Visual Analytics Card with View Modes */}
            <div
              className="card"
              style={{
                padding: "24px",
                marginBottom: 24,
                background: "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,16,32,0.95) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                boxShadow: "0 12px 36px rgba(0,0,0,0.35)",
              }}
            >
              {/* Header with Title and Mode Switcher */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 14,
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  paddingBottom: 16,
                  marginBottom: 22,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#06b6d4", boxShadow: "0 0 8px #06b6d4" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#06b6d4", letterSpacing: "0.08em" }}>
                      Variance Attribution Intelligence
                    </span>
                  </div>
                  <h2 style={{ fontSize: 19, fontWeight: 800, color: "#f8fafc", margin: "4px 0 0" }}>
                    Risk Factor Distribution & Empirical Impact
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                    Hover or click any dimension to inspect real-time variance contribution, asset exposure, and ministerial SOP remedies.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    onClick={() => setActiveTab("donut")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                      transition: "all 0.15s ease",
                      background: activeTab === "donut" ? "#0284c7" : "transparent",
                      color: activeTab === "donut" ? "#ffffff" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                    Attribution Donut & Matrix
                  </button>
                  <button
                    onClick={() => setActiveTab("bars")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                      transition: "all 0.15s ease",
                      background: activeTab === "bars" ? "#0284c7" : "transparent",
                      color: activeTab === "bars" ? "#ffffff" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    Comparative TreeSHAP Ranking
                  </button>
                </div>
              </div>

              {activeTab === "donut" ? (
                /* Dynamic Interactive Donut & Factor Board */
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "300px 1fr",
                    gap: 32,
                    alignItems: "center",
                  }}
                  className="responsive-grid-2"
                >
                  {/* Left: Expansive Donut Chart with Digital Focal HUD */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      padding: "16px 0",
                    }}
                  >
                    <div style={{ width: 280, height: 280, position: "relative" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="contribution"
                            nameKey="fullName"
                            cx="50%"
                            cy="50%"
                            innerRadius={72}
                            outerRadius={108}
                            paddingAngle={3}
                            onMouseEnter={(entry: any) => {
                              if (entry && entry.fullName) setHoveredDriver(entry.fullName);
                            }}
                            onMouseLeave={() => setHoveredDriver(null)}
                            onClick={(entry: any) => {
                              if (entry && entry.fullName) setSelectedDriver(entry.fullName);
                            }}
                          >
                            {chartData.map((entry) => {
                              const isHighlighted = (hoveredDriver || selectedDriver) === entry.fullName;
                              return (
                                <Cell
                                  key={`donut-slice-${entry.fullName}`}
                                  fill={entry.color}
                                  stroke="#0f172a"
                                  strokeWidth={isHighlighted ? 3 : 1.5}
                                  opacity={isHighlighted ? 1 : 0.6}
                                  style={{
                                    filter: isHighlighted ? `drop-shadow(0 0 10px ${entry.color})` : "none",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                  }}
                                />
                              );
                            })}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Concentric Digital Center HUD (Zero Tooltip Clashes) */}
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          textAlign: "center",
                          pointerEvents: "none",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 130,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: activeDisplayObj ? activeDisplayObj.color : "#38bdf8",
                            marginBottom: 2,
                          }}
                        >
                          {hoveredDriver ? "HOVERED FACTOR" : "PRIMARY FOCUS"}
                        </span>
                        <div
                          style={{
                            fontSize: 32,
                            fontWeight: 900,
                            color: activeDisplayObj ? activeDisplayObj.color : "#f8fafc",
                            lineHeight: 1,
                            letterSpacing: "-0.03em",
                            textShadow: activeDisplayObj ? `0 0 20px ${activeDisplayObj.color}60` : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {activeDisplayObj ? `${activeDisplayObj.contribution}%` : "65.5%"}
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#cbd5e1",
                            marginTop: 4,
                            lineHeight: 1.2,
                            textAlign: "center",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            maxWidth: 110,
                          }}
                        >
                          {activeDisplayObj ? activeDisplayObj.fullName : "Top 3 Cumulative"}
                        </span>
                        <span style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
                          {activeDisplayObj ? `${activeDisplayObj.affected} Assets` : "65.5% Total Share"}
                        </span>
                      </div>
                    </div>

                    {/* Quick Insight Strip */}
                    <div
                      style={{
                        marginTop: 10,
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "rgba(56, 189, 248, 0.08)",
                        border: "1px solid rgba(56, 189, 248, 0.2)",
                        fontSize: 11,
                        color: "#38bdf8",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      <span>Top 3 Drivers = 65.5% Variance</span>
                    </div>
                  </div>

                  {/* Right: Rich Interactive Factor Attribution Board */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {chartData.map((item) => {
                      const isSelected = selectedDriver === item.fullName;
                      const isHovered = hoveredDriver === item.fullName;
                      const isHighlighted = isSelected || isHovered;

                      return (
                        <div
                          key={item.fullName}
                          onClick={() => setSelectedDriver(item.fullName)}
                          onMouseEnter={() => setHoveredDriver(item.fullName)}
                          onMouseLeave={() => setHoveredDriver(null)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            background: isSelected
                              ? `linear-gradient(135deg, ${item.color}18 0%, rgba(15,23,42,0.8) 100%)`
                              : isHovered
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(255,255,255,0.02)",
                            border: isSelected
                              ? `1.5px solid ${item.color}80`
                              : isHovered
                              ? "1.5px solid rgba(255,255,255,0.15)"
                              : "1px solid rgba(255,255,255,0.06)",
                            cursor: "pointer",
                            transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                            position: "relative",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                          }}
                        >
                          {/* Top row: Rank, Category & Attribution pill */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  color: item.color,
                                  background: `${item.color}20`,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontFamily: "var(--font-mono, monospace)",
                                }}
                              >
                                #{item.rank}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                {item.category}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: item.color,
                                fontFamily: "var(--font-mono, monospace)",
                                background: `${item.color}15`,
                                padding: "2px 8px",
                                borderRadius: 6,
                                border: `1px solid ${item.color}35`,
                              }}
                            >
                              {item.contribution}%
                            </span>
                          </div>

                          {/* Full Name (Zero Truncation) */}
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: isHighlighted ? 700 : 600,
                              color: isHighlighted ? "#f8fafc" : "#cbd5e1",
                              lineHeight: 1.35,
                              marginBottom: 8,
                            }}
                          >
                            {item.fullName}
                          </div>

                          {/* Bottom row: Proportional Progress bar & Assets */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                              <span>Vulnerable assets</span>
                              <span style={{ color: "#94a3b8", fontWeight: 600 }}>{item.affected.toLocaleString()} projects</span>
                            </div>
                            <div style={{ width: "100%", height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${(item.contribution / 30) * 100}%`,
                                  height: "100%",
                                  background: item.color,
                                  borderRadius: 999,
                                  boxShadow: isHighlighted ? `0 0 6px ${item.color}` : "none",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Comparative Horizontal Bar Model */
                <div style={{ width: "100%", height: 380 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 10, right: 50, left: 20, bottom: 10 }}
                      onClick={(e: any) => {
                        if (e && e.activePayload && e.activePayload[0]) {
                          setSelectedDriver(e.activePayload[0].payload.fullName);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} unit="%" domain={[0, "dataMax + 4"]} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={12}
                        width={240}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          borderColor: "rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          fontSize: 12,
                          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                        }}
                        formatter={(val: any) => [`${val}% attribution`, "Factor Weight"]}
                      />
                      <Bar dataKey="contribution" radius={[0, 6, 6, 0]} barSize={20}>
                        {chartData.map((entry) => {
                          const isHighlighted = (hoveredDriver || selectedDriver) === entry.fullName;
                          return (
                            <Cell
                              key={`bar-${entry.fullName}`}
                              fill={entry.color}
                              opacity={isHighlighted ? 1.0 : 0.65}
                              cursor="pointer"
                              style={{
                                filter: isHighlighted ? `drop-shadow(0 0 8px ${entry.color}80)` : "none",
                                transition: "all 0.15s ease",
                              }}
                            />
                          );
                        })}
                        <LabelList
                          dataKey="contribution"
                          position="right"
                          formatter={(v: any) => `${v}%`}
                          fill="#cbd5e1"
                          fontSize={11}
                          fontWeight={700}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Executive SOP Remediation Playbook Drawer */}
            {activeDisplayObj && activeDriverSop && (
              <div
                className="card"
                style={{
                  marginBottom: 24,
                  background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(20,29,48,0.95) 100%)",
                  border: `1.5px solid ${activeDisplayObj.color}40`,
                  borderRadius: 14,
                  padding: "24px",
                  boxShadow: `0 12px 36px rgba(0,0,0,0.4), 0 0 24px ${activeDisplayObj.color}15`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span
                        style={{
                          background: `${activeDisplayObj.color}25`,
                          color: activeDisplayObj.color,
                          border: `1px solid ${activeDisplayObj.color}50`,
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "3px 10px",
                          borderRadius: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Target Factor #{activeDisplayObj.rank}
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        Category: <strong style={{ color: "#f8fafc" }}>{activeDisplayObj.category}</strong>
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        Exposure: <strong style={{ color: activeDisplayObj.color }}>{activeDisplayObj.affected.toLocaleString()} Projects</strong>
                      </span>
                    </div>

                    <h3 style={{ margin: "8px 0 4px", fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>
                      {activeDisplayObj.fullName}
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", maxWidth: 840, lineHeight: 1.5 }}>
                      {activeDriverSop.summary}
                    </p>
                  </div>

                  <Link
                    href={`/actions?title=${encodeURIComponent(`Mitigate: ${activeDisplayObj.fullName}`)}&description=${encodeURIComponent(activeDriverSop.step1)}&priority=high&action=new`}
                    className="btn btn-primary"
                    style={{
                      textDecoration: "none",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "8px 18px",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                      color: "white",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 4px 14px rgba(2,132,199,0.35)",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Assign Playbook Intervention
                  </Link>
                </div>

                {/* Structured 3-Step Ministerial Intervention Protocol */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 14,
                  }}
                  className="responsive-grid-2"
                >
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#f43f5e", color: "white", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        1
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#f43f5e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Phase 1: Immediate Directive
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.55 }}>
                      {activeDriverSop.step1}
                    </p>
                  </div>

                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#f59e0b", color: "black", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        2
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Phase 2: Milestone & Fiscal Audit
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.55 }}>
                      {activeDriverSop.step2}
                    </p>
                  </div>

                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#10b981", color: "black", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        3
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Phase 3: Statutory Escalation
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.55 }}>
                      {activeDriverSop.step3}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sector Susceptibility Matrix Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                    Cross-Sector Susceptibility Matrix
                  </div>
                  <h3 style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>
                    Sector-Wise Vulnerability Ratios & Spend Divergence
                  </h3>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>
                  {data.sector_profile.length} Evaluated Sectors
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left", color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <th style={{ padding: "14px 20px" }}>Infrastructure Sector</th>
                      <th style={{ padding: "14px 20px" }}>Total Monitored</th>
                      <th style={{ padding: "14px 20px" }}>High/Critical Risk Assets</th>
                      <th style={{ padding: "14px 20px" }}>Vulnerability Ratio</th>
                      <th style={{ padding: "14px 20px" }}>Mean Burn Gap</th>
                      <th style={{ padding: "14px 20px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sector_profile.map((sec, idx) => (
                      <tr
                        key={sec.sector}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(56, 189, 248, 0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)")}
                      >
                        <td style={{ padding: "14px 20px", fontWeight: 700, color: "#f8fafc" }}>
                          {sec.sector}
                        </td>
                        <td style={{ padding: "14px 20px", color: "#cbd5e1" }}>
                          {sec.total_projects}
                        </td>
                        <td style={{ padding: "14px 20px", color: sec.high_risk_projects > 0 ? "#f87171" : "#cbd5e1", fontWeight: sec.high_risk_projects > 0 ? 700 : 400 }}>
                          {sec.high_risk_projects}
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: sec.high_risk_pct > 30 ? "rgba(239, 68, 68, 0.15)" : sec.high_risk_pct > 15 ? "rgba(245, 158, 11, 0.15)" : "rgba(34, 197, 94, 0.15)",
                              color: sec.high_risk_pct > 30 ? "#f87171" : sec.high_risk_pct > 15 ? "#fbbf24" : "#4ade80",
                              border: `1px solid ${sec.high_risk_pct > 30 ? "#ef444440" : sec.high_risk_pct > 15 ? "#f59e0b40" : "#22c55e40"}`,
                            }}
                          >
                            {sec.high_risk_pct}%
                          </span>
                        </td>
                        <td style={{ padding: "14px 20px", color: sec.avg_burn_gap > 0 ? "#fb923c" : "#94a3b8", fontWeight: 600 }}>
                          {sec.avg_burn_gap > 0 ? `+${sec.avg_burn_gap}%` : `${sec.avg_burn_gap}%`}
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right" }}>
                          <Link
                            href={`/projects?sector=${encodeURIComponent(sec.sector)}`}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#38bdf8",
                              textDecoration: "none",
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: "rgba(56, 189, 248, 0.1)",
                              border: "1px solid rgba(56, 189, 248, 0.2)",
                            }}
                          >
                            View Assets →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
