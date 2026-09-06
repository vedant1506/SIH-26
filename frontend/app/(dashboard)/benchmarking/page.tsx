"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import { getBenchmarking } from "@/lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  Layers,
  MapPin,
  Building2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ExternalLink,
  ShieldAlert,
  BarChart3,
  Activity,
  Sparkles,
  Filter,
  X,
  Compass,
} from "lucide-react";

interface SectorBenchmark {
  sector: string;
  project_count: number;
  avg_cost_overrun_pct: number;
  avg_delay_months: number;
  avg_risk_score: number;
  delayed_pct: number;
}

interface MinistryBenchmark {
  ministry: string;
  project_count: number;
  avg_cost_overrun_pct: number;
  avg_delay_months: number;
  avg_risk_score: number;
}

interface StateBenchmark {
  state: string;
  project_count: number;
  avg_risk_score: number;
  critical_count: number;
  high_count: number;
}

interface BenchmarkingResponse {
  sector_benchmarks: SectorBenchmark[];
  ministry_benchmarks: MinistryBenchmark[];
  state_benchmarks: StateBenchmark[];
}

type SortField =
  | "sector"
  | "project_count"
  | "avg_cost_overrun_pct"
  | "avg_delay_months"
  | "avg_risk_score"
  | "delayed_pct"
  | "ministry"
  | "state"
  | "critical_count"
  | "high_count";

type SortDirection = "asc" | "desc";

// Helper to assign thematic icons and badges to sectors
function getSectorIcon(sector: string) {
  const s = sector.toLowerCase();
  if (s.includes("road") || s.includes("highway")) return "🛣️";
  if (s.includes("rail")) return "🚆";
  if (s.includes("power") || s.includes("energy") || s.includes("renewable")) return "⚡";
  if (s.includes("petroleum") || s.includes("oil") || s.includes("gas")) return "🛢️";
  if (s.includes("coal") || s.includes("mine") || s.includes("mining")) return "⛏️";
  if (s.includes("water") || s.includes("river") || s.includes("irrigation")) return "💧";
  if (s.includes("urban") || s.includes("smart") || s.includes("housing")) return "🏙️";
  if (s.includes("port") || s.includes("shipping") || s.includes("waterway")) return "🚢";
  if (s.includes("civil") || s.includes("aviation") || s.includes("airport")) return "✈️";
  if (s.includes("health") || s.includes("hospital") || s.includes("medical")) return "🏥";
  if (s.includes("telecom") || s.includes("communication") || s.includes("digital")) return "📡";
  if (s.includes("defence") || s.includes("defense")) return "🛡️";
  return "🏗️";
}

export default function BenchmarkingPage() {
  const [data, setData] = useState<BenchmarkingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"sectors" | "ministries" | "states">("sectors");
  const [search, setSearch] = useState("");

  // Chart View Controls
  const [chartView, setChartView] = useState<"divergence" | "quadrant" | "ministry">("divergence");
  const [metricFocus, setMetricFocus] = useState<"all" | "delay" | "cost" | "risk">("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("avg_delay_months");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Quick Filter Pill
  const [quickFilter, setQuickFilter] = useState<"all" | "high_delay" | "high_overrun" | "high_risk">("all");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError("");
      const res = await getBenchmarking();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load comparative benchmarking data.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Tab Switch
  const handleTabChange = (tab: "sectors" | "ministries" | "states") => {
    setActiveTab(tab);
    setSearch("");
    setQuickFilter("all");
    if (tab === "sectors") {
      setSortField("avg_delay_months");
      setSortDir("desc");
    } else if (tab === "ministries") {
      setSortField("avg_cost_overrun_pct");
      setSortDir("desc");
    } else {
      setSortField("critical_count");
      setSortDir("desc");
    }
  };

  // Sort toggle helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // National Baseline Calculations
  const nationalStats = useMemo(() => {
    if (!data?.sector_benchmarks || data.sector_benchmarks.length === 0) {
      return { totalProjects: 0, avgDelay: 0, avgOverrun: 0, avgRisk: 0, delayedPct: 0 };
    }
    const totalProjects = data.sector_benchmarks.reduce((acc, s) => acc + s.project_count, 0);
    const weightedDelay = data.sector_benchmarks.reduce((acc, s) => acc + s.avg_delay_months * s.project_count, 0) / (totalProjects || 1);
    const weightedOverrun = data.sector_benchmarks.reduce((acc, s) => acc + s.avg_cost_overrun_pct * s.project_count, 0) / (totalProjects || 1);
    const weightedRisk = data.sector_benchmarks.reduce((acc, s) => acc + s.avg_risk_score * s.project_count, 0) / (totalProjects || 1);
    const delayedCount = data.sector_benchmarks.reduce((acc, s) => acc + (s.delayed_pct / 100) * s.project_count, 0);

    return {
      totalProjects,
      avgDelay: Number(weightedDelay.toFixed(1)),
      avgOverrun: Number(weightedOverrun.toFixed(1)),
      avgRisk: Number(weightedRisk.toFixed(1)),
      delayedPct: Number(((delayedCount / (totalProjects || 1)) * 100).toFixed(1)),
    };
  }, [data]);

  // Sector Divergence Chart Data (Top 10 by project count)
  const topSectorsChart = useMemo(() => {
    if (!data?.sector_benchmarks) return [];
    return [...data.sector_benchmarks]
      .sort((a, b) => b.project_count - a.project_count)
      .slice(0, 10)
      .map((s) => ({
        fullName: s.sector,
        name: s.sector.length > 16 ? s.sector.slice(0, 16) + "…" : s.sector,
        costOverrun: s.avg_cost_overrun_pct,
        delayMonths: s.avg_delay_months,
        riskScore: s.avg_risk_score,
        delayedPct: s.delayed_pct,
        projects: s.project_count,
      }));
  }, [data]);

  // Scatter / Quadrant Data: Delay vs Cost Overrun
  const quadrantData = useMemo(() => {
    if (!data?.sector_benchmarks) return [];
    return data.sector_benchmarks.map((s) => ({
      name: s.sector,
      delay: s.avg_delay_months,
      costOverrun: s.avg_cost_overrun_pct,
      risk: s.avg_risk_score,
      projects: s.project_count,
    }));
  }, [data]);

  // Ministry Overrun Chart Data (Top 10)
  const topMinistriesChart = useMemo(() => {
    if (!data?.ministry_benchmarks) return [];
    return [...data.ministry_benchmarks]
      .sort((a, b) => b.avg_cost_overrun_pct - a.avg_cost_overrun_pct)
      .slice(0, 10)
      .map((m) => ({
        fullName: m.ministry,
        name: m.ministry.length > 22 ? m.ministry.slice(0, 22) + "…" : m.ministry,
        overrunPct: m.avg_cost_overrun_pct,
        delayMonths: m.avg_delay_months,
        riskScore: m.avg_risk_score,
        projects: m.project_count,
      }));
  }, [data]);

  // Filter & Sort Sectors
  const filteredSectors = useMemo(() => {
    if (!data?.sector_benchmarks) return [];
    let list = [...data.sector_benchmarks];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.sector.toLowerCase().includes(q));
    }

    if (quickFilter === "high_delay") {
      list = list.filter((s) => s.avg_delay_months >= 24);
    } else if (quickFilter === "high_overrun") {
      list = list.filter((s) => s.avg_cost_overrun_pct > 10);
    } else if (quickFilter === "high_risk") {
      list = list.filter((s) => s.avg_risk_score > 35);
    }

    list.sort((a, b) => {
      let vA = (a as any)[sortField];
      let vB = (b as any)[sortField];
      if (typeof vA === "string") {
        return sortDir === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortDir === "asc" ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
    });

    return list;
  }, [data, search, quickFilter, sortField, sortDir]);

  // Filter & Sort Ministries
  const filteredMinistries = useMemo(() => {
    if (!data?.ministry_benchmarks) return [];
    let list = [...data.ministry_benchmarks];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.ministry.toLowerCase().includes(q));
    }

    if (quickFilter === "high_delay") {
      list = list.filter((m) => m.avg_delay_months >= 24);
    } else if (quickFilter === "high_overrun") {
      list = list.filter((m) => m.avg_cost_overrun_pct > 10);
    } else if (quickFilter === "high_risk") {
      list = list.filter((m) => m.avg_risk_score > 35);
    }

    list.sort((a, b) => {
      let vA = (a as any)[sortField];
      let vB = (b as any)[sortField];
      if (typeof vA === "string") {
        return sortDir === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortDir === "asc" ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
    });

    return list;
  }, [data, search, quickFilter, sortField, sortDir]);

  // Filter & Sort States
  const filteredStates = useMemo(() => {
    if (!data?.state_benchmarks) return [];
    let list = [...data.state_benchmarks];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((st) => st.state.toLowerCase().includes(q));
    }

    if (quickFilter === "high_risk") {
      list = list.filter((st) => st.critical_count > 0 || st.high_count >= 5);
    }

    list.sort((a, b) => {
      let vA = (a as any)[sortField];
      let vB = (b as any)[sortField];
      if (typeof vA === "string") {
        return sortDir === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortDir === "asc" ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
    });

    return list;
  }, [data, search, quickFilter, sortField, sortDir]);

  // Export CSV Handler
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = `PRISM_Benchmarking_${activeTab}_April2026.csv`;

    if (activeTab === "sectors") {
      csvContent += "Sector,Project Count,Avg Cost Overrun (%),Avg Delay (Months),Composite Risk Score (%),Delayed Projects (%)\n";
      filteredSectors.forEach((s) => {
        csvContent += `"${s.sector}",${s.project_count},${s.avg_cost_overrun_pct},${s.avg_delay_months},${s.avg_risk_score},${s.delayed_pct}\n`;
      });
    } else if (activeTab === "ministries") {
      csvContent += "Ministry,Project Count,Avg Cost Overrun (%),Avg Delay (Months),Composite Risk Score (%)\n";
      filteredMinistries.forEach((m) => {
        csvContent += `"${m.ministry}",${m.project_count},${m.avg_cost_overrun_pct},${m.avg_delay_months},${m.avg_risk_score}\n`;
      });
    } else {
      csvContent += "State / UT,Total Projects,Critical Risk Assets,High Risk Assets,State Risk Score (%)\n";
      filteredStates.forEach((st) => {
        csvContent += `"${st.state}",${st.project_count},${st.critical_count},${st.high_count},${st.avg_risk_score}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Sort Icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.35, marginLeft: 4 }} />;
    }
    return sortDir === "asc" ? (
      <ArrowUp size={12} style={{ color: "var(--accent)", marginLeft: 4 }} />
    ) : (
      <ArrowDown size={12} style={{ color: "var(--accent)", marginLeft: 4 }} />
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <TopBar
        title="Comparative Benchmarking Intelligence"
        subtitle="Cross-sectoral divergence analysis, ministerial slippage rankings, and state risk exposure indexes"
      />

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 28px 80px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0" }}>
            <LoadingSpinner size={44} label="Synthesizing cross-sectoral benchmarking matrices..." />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : !data ? null : (
          <>
            {/* Executive Synthesis Strategic Banner */}
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "var(--radius-lg)",
                background: "linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(6, 182, 212, 0.04) 50%, rgba(15, 23, 42, 0.7) 100%)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                padding: "20px 24px",
                marginBottom: 24,
                boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ maxWidth: 860 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 10px",
                        borderRadius: 20,
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      <Sparkles size={12} />
                      PRISM Benchmark Synthesis
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      National MoSPI Baseline • April 2026
                    </span>
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>
                    Portfolio Analysis: Significant Variance in Execution Velocity Across Key Infrastructure
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.5, margin: 0 }}>
                    Across all <strong>1,981 central sector projects</strong>, national average timeline lag stands at{" "}
                    <strong style={{ color: "#f59e0b" }}>{nationalStats.avgDelay} months</strong> and net budget revision at{" "}
                    <strong style={{ color: "#38bdf8" }}>+{nationalStats.avgOverrun}%</strong>. Water Resources, Power, and Urban Development
                    lead in fiscal and timeline slippage, while Roads & Highways accounts for <strong>57%</strong> of monitored project volume.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={handleExportCSV}
                    className="btn btn-secondary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 16px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--text)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Download size={14} />
                    Export {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} (.CSV)
                  </button>
                </div>
              </div>
            </div>

            {/* Top Macro KPI Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* Card 1: Max Delay Sector */}
              {(() => {
                const maxDelay = [...data.sector_benchmarks].sort((a, b) => b.avg_delay_months - a.avg_delay_months)[0];
                return (
                  <div
                    className="card"
                    style={{
                      padding: "20px",
                      borderRadius: "var(--radius)",
                      background: "linear-gradient(180deg, rgba(244, 63, 94, 0.05) 0%, rgba(15, 23, 42, 0.7) 100%)",
                      border: "1px solid rgba(244, 63, 94, 0.2)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                        Highest Slippage Sector
                      </span>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "rgba(244, 63, 94, 0.12)",
                          color: "var(--critical)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Clock size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {maxDelay?.sector || "—"}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: "var(--critical)", fontFamily: "var(--font-display)" }}>
                        +{maxDelay?.avg_delay_months || 0} mo
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        ({(maxDelay?.avg_delay_months - nationalStats.avgDelay).toFixed(1)} mo above avg)
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                      {maxDelay?.project_count} monitored assets • {maxDelay?.delayed_pct}% delayed
                    </div>
                  </div>
                );
              })()}

              {/* Card 2: Peak Cost Escalation Ministry */}
              {(() => {
                const maxCost = [...data.ministry_benchmarks].sort((a, b) => b.avg_cost_overrun_pct - a.avg_cost_overrun_pct)[0];
                return (
                  <div
                    className="card"
                    style={{
                      padding: "20px",
                      borderRadius: "var(--radius)",
                      background: "linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(15, 23, 42, 0.7) 100%)",
                      border: "1px solid rgba(245, 158, 11, 0.2)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                        Peak Cost Escalation Ministry
                      </span>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "rgba(245, 158, 11, 0.12)",
                          color: "var(--high)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <TrendingUp size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {maxCost?.ministry || "—"}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: "var(--high)", fontFamily: "var(--font-display)" }}>
                        +{maxCost?.avg_cost_overrun_pct || 0}%
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        avg cost revision
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                      {maxCost?.project_count} projects • Avg +{maxCost?.avg_delay_months} mo delay
                    </div>
                  </div>
                );
              })()}

              {/* Card 3: Most Exposed State */}
              {(() => {
                const topState = [...data.state_benchmarks].sort(
                  (a, b) => b.critical_count + b.high_count - (a.critical_count + a.high_count)
                )[0];
                return (
                  <div
                    className="card"
                    style={{
                      padding: "20px",
                      borderRadius: "var(--radius)",
                      background: "linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, rgba(15, 23, 42, 0.7) 100%)",
                      border: "1px solid rgba(56, 189, 248, 0.2)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                        Most Exposed Jurisdiction
                      </span>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "rgba(56, 189, 248, 0.12)",
                          color: "#38bdf8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MapPin size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {topState?.state || "—"}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-display)" }}>
                        {topState?.critical_count || 0} Critical
                      </span>
                      <span style={{ fontSize: 12, color: "var(--high)", fontWeight: 600 }}>
                        + {topState?.high_count || 0} High Risk
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                      {topState?.project_count} total infrastructure assets in state
                    </div>
                  </div>
                );
              })()}

              {/* Card 4: National Infrastructure Baseline */}
              <div
                className="card"
                style={{
                  padding: "20px",
                  borderRadius: "var(--radius)",
                  background: "linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(15, 23, 42, 0.7) 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                    National Benchmark Baseline
                  </span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "var(--low)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Layers size={16} />
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginTop: 10 }}>
                  1,981 Projects • 22 Sectors
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 4 }}>
                  <div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#10b981", fontFamily: "var(--font-display)" }}>
                      {nationalStats.avgDelay} mo
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>Avg Delay</span>
                  </div>
                  <div style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-display)" }}>
                      +{nationalStats.avgOverrun}%
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>Avg Overrun</span>
                  </div>
                  <div style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b", fontFamily: "var(--font-display)" }}>
                      {nationalStats.avgRisk}%
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>Avg Risk Index</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                  Covering 30 States & UT jurisdictions
                </div>
              </div>
            </div>

            {/* Visual Studio Card (Interactive Charts & Matrices) */}
            <div
              className="card"
              style={{
                borderRadius: "var(--radius-lg)",
                padding: "24px",
                marginBottom: 28,
                border: "1px solid var(--border)",
                background: "rgba(10, 16, 32, 0.7)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Studio Header Toolbar */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 20,
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <BarChart3 size={16} style={{ color: "var(--accent)" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--accent)", letterSpacing: "0.06em" }}>
                      Interactive Analytical Studio
                    </span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "4px 0 0" }}>
                    {chartView === "divergence" && "Cross-Sectoral Execution Divergence (Top 10 Sectors by Volume)"}
                    {chartView === "quadrant" && "2×2 Quadrant Matrix: Schedule Slippage vs Cost Escalation"}
                    {chartView === "ministry" && "Ministerial Cost Revision Leaderboard (% Average Overrun)"}
                  </h3>
                </div>

                {/* View Switcher & Metric Toggles */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      background: "var(--surface-2)",
                      padding: 3,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setChartView("divergence")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: chartView === "divergence" ? 700 : 500,
                        cursor: "pointer",
                        border: "none",
                        background: chartView === "divergence" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                        color: chartView === "divergence" ? "#38bdf8" : "var(--text-muted)",
                      }}
                    >
                      Multi-Metric
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartView("quadrant")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: chartView === "quadrant" ? 700 : 500,
                        cursor: "pointer",
                        border: "none",
                        background: chartView === "quadrant" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                        color: chartView === "quadrant" ? "#38bdf8" : "var(--text-muted)",
                      }}
                    >
                      Quadrant Matrix
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartView("ministry")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: chartView === "ministry" ? 700 : 500,
                        cursor: "pointer",
                        border: "none",
                        background: chartView === "ministry" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                        color: chartView === "ministry" ? "#38bdf8" : "var(--text-muted)",
                      }}
                    >
                      Ministries
                    </button>
                  </div>

                  {chartView === "divergence" && (
                    <div
                      style={{
                        display: "flex",
                        background: "var(--surface-2)",
                        padding: 3,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setMetricFocus("all")}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: metricFocus === "all" ? 700 : 500,
                          cursor: "pointer",
                          border: "none",
                          background: metricFocus === "all" ? "rgba(255,255,255,0.1)" : "transparent",
                          color: metricFocus === "all" ? "var(--text)" : "var(--text-muted)",
                        }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetricFocus("delay")}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: metricFocus === "delay" ? 700 : 500,
                          cursor: "pointer",
                          border: "none",
                          background: metricFocus === "delay" ? "rgba(244, 63, 94, 0.2)" : "transparent",
                          color: metricFocus === "delay" ? "#f43f5e" : "var(--text-muted)",
                        }}
                      >
                        Delay Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetricFocus("cost")}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: metricFocus === "cost" ? 700 : 500,
                          cursor: "pointer",
                          border: "none",
                          background: metricFocus === "cost" ? "rgba(245, 158, 11, 0.2)" : "transparent",
                          color: metricFocus === "cost" ? "#f59e0b" : "var(--text-muted)",
                        }}
                      >
                        Cost Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetricFocus("risk")}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: metricFocus === "risk" ? 700 : 500,
                          cursor: "pointer",
                          border: "none",
                          background: metricFocus === "risk" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                          color: metricFocus === "risk" ? "#38bdf8" : "var(--text-muted)",
                        }}
                      >
                        Risk Only
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* View 1: Multi-Metric Bar Chart */}
              {chartView === "divergence" && (
                <div style={{ width: "100%", height: 380 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSectorsChart} margin={{ top: 10, right: 20, left: 10, bottom: 45 }}>
                      <defs>
                        <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
                        </linearGradient>
                        <linearGradient id="delayGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#e11d48" stopOpacity={0.6} />
                        </linearGradient>
                        <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#0284c7" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--text-muted)"
                        fontSize={11}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                        tickMargin={10}
                      />
                      <YAxis stroke="var(--text-muted)" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(15, 23, 42, 0.95)",
                          borderColor: "rgba(255, 255, 255, 0.12)",
                          borderRadius: 8,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                          fontSize: 12,
                        }}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]?.payload?.fullName) {
                            return payload[0].payload.fullName;
                          }
                          return label;
                        }}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 16, fontSize: 12 }} />
                      <ReferenceLine
                        y={nationalStats.avgDelay}
                        stroke="#f43f5e"
                        strokeDasharray="4 4"
                        strokeOpacity={0.6}
                        label={{ value: `Nat'l Avg Delay: ${nationalStats.avgDelay}m`, fill: "#f43f5e", fontSize: 10, position: "top" }}
                      />
                      {(metricFocus === "all" || metricFocus === "cost") && (
                        <Bar dataKey="costOverrun" name="Avg Cost Overrun (%)" fill="url(#costGradient)" radius={[4, 4, 0, 0]} />
                      )}
                      {(metricFocus === "all" || metricFocus === "delay") && (
                        <Bar dataKey="delayMonths" name="Avg Delay (Months)" fill="url(#delayGradient)" radius={[4, 4, 0, 0]} />
                      )}
                      {(metricFocus === "all" || metricFocus === "risk") && (
                        <Bar dataKey="riskScore" name="Composite Risk (%)" fill="url(#riskGradient)" radius={[4, 4, 0, 0]} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* View 2: 2x2 Quadrant Matrix (Scatter Plot) */}
              {chartView === "quadrant" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                    <span>X-Axis: Forecast Schedule Slippage (Months)</span>
                    <span>Y-Axis: Average Cost Escalation (%) • Bubble size = Project volume</span>
                  </div>
                  <div style={{ width: "100%", height: 380 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          type="number"
                          dataKey="delay"
                          name="Schedule Delay"
                          unit=" mo"
                          stroke="var(--text-muted)"
                          fontSize={11}
                        />
                        <YAxis
                          type="number"
                          dataKey="costOverrun"
                          name="Cost Overrun"
                          unit="%"
                          stroke="var(--text-muted)"
                          fontSize={11}
                        />
                        <ZAxis type="number" dataKey="projects" range={[60, 450]} name="Project Volume" />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div
                                style={{
                                  background: "rgba(15, 23, 42, 0.95)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  borderRadius: 8,
                                  padding: "10px 14px",
                                  fontSize: 12,
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                                }}
                              >
                                <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>
                                  {d.name}
                                </div>
                                <div style={{ color: "var(--text-sub)" }}>
                                  Monitored Projects: <strong style={{ color: "var(--text)" }}>{d.projects}</strong>
                                </div>
                                <div style={{ color: "var(--text-sub)" }}>
                                  Avg Delay: <strong style={{ color: "var(--critical)" }}>+{d.delay} months</strong>
                                </div>
                                <div style={{ color: "var(--text-sub)" }}>
                                  Avg Cost Escalation: <strong style={{ color: "var(--high)" }}>+{d.costOverrun}%</strong>
                                </div>
                                <div style={{ color: "var(--text-sub)" }}>
                                  Risk Score: <strong style={{ color: "#38bdf8" }}>{d.risk}%</strong>
                                </div>
                              </div>
                            );
                          }}
                        />
                        {/* Reference lines dividing 4 quadrants */}
                        <ReferenceLine x={20} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                        <ReferenceLine y={15} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                        <Scatter name="Sectors" data={quadrantData} fill="#38bdf8">
                          {quadrantData.map((entry, index) => {
                            const isCritical = entry.delay > 20 && entry.costOverrun > 15;
                            const isDelayed = entry.delay > 20 && entry.costOverrun <= 15;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={isCritical ? "#f43f5e" : isDelayed ? "#f59e0b" : "#38bdf8"}
                                fillOpacity={0.85}
                              />
                            );
                          })}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 11, marginTop: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f43f5e" }} />
                      Severe Delay + High Cost Escalation
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                      Timeline Bottleneck (High Delay)
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8" }} />
                      Optimal Execution Benchmark
                    </span>
                  </div>
                </div>
              )}

              {/* View 3: Ministry Horizontal Bar Chart */}
              {chartView === "ministry" && (
                <div style={{ width: "100%", height: 380 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topMinistriesChart}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" stroke="var(--text-muted)" fontSize={11} unit="%" />
                      <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={11} width={180} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(15, 23, 42, 0.95)",
                          borderColor: "rgba(255, 255, 255, 0.12)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: any, name: any, item: any) => [
                          `+${value}% (Avg Delay: +${item?.payload?.delayMonths} mo)`,
                          "Cost Escalation",
                        ]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                      />
                      <Bar dataKey="overrunPct" name="Cost Overrun %" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Granular Benchmark Leaderboard Section */}
            <div
              className="card"
              style={{
                borderRadius: "var(--radius-lg)",
                padding: 0,
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "rgba(10, 16, 32, 0.7)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Header Bar */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {/* Tabs */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleTabChange("sectors")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: activeTab === "sectors" ? 700 : 500,
                      cursor: "pointer",
                      border: activeTab === "sectors" ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: activeTab === "sectors" ? "rgba(6, 182, 212, 0.15)" : "var(--surface-2)",
                      color: activeTab === "sectors" ? "var(--accent)" : "var(--text-muted)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Layers size={14} />
                    Sector Benchmarks ({data.sector_benchmarks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange("ministries")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: activeTab === "ministries" ? 700 : 500,
                      cursor: "pointer",
                      border: activeTab === "ministries" ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: activeTab === "ministries" ? "rgba(6, 182, 212, 0.15)" : "var(--surface-2)",
                      color: activeTab === "ministries" ? "var(--accent)" : "var(--text-muted)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Building2 size={14} />
                    Ministry Leaderboard ({data.ministry_benchmarks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange("states")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: activeTab === "states" ? 700 : 500,
                      cursor: "pointer",
                      border: activeTab === "states" ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: activeTab === "states" ? "rgba(6, 182, 212, 0.15)" : "var(--surface-2)",
                      color: activeTab === "states" ? "var(--accent)" : "var(--text-muted)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <MapPin size={14} />
                    State Exposure Index ({data.state_benchmarks.length})
                  </button>
                </div>

                {/* Filter and Search Toolbar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {/* Quick Filters */}
                  {activeTab !== "states" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setQuickFilter("all")}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          border: "1px solid var(--border)",
                          background: quickFilter === "all" ? "rgba(255,255,255,0.08)" : "transparent",
                          color: quickFilter === "all" ? "var(--text)" : "var(--text-muted)",
                          cursor: "pointer",
                        }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickFilter("high_delay")}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          border: "1px solid var(--border)",
                          background: quickFilter === "high_delay" ? "rgba(244, 63, 94, 0.15)" : "transparent",
                          color: quickFilter === "high_delay" ? "#f43f5e" : "var(--text-muted)",
                          cursor: "pointer",
                        }}
                      >
                        Delay ≥24m
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickFilter("high_overrun")}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          border: "1px solid var(--border)",
                          background: quickFilter === "high_overrun" ? "rgba(245, 158, 11, 0.15)" : "transparent",
                          color: quickFilter === "high_overrun" ? "#f59e0b" : "var(--text-muted)",
                          cursor: "pointer",
                        }}
                      >
                        Overrun &gt;10%
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setQuickFilter(quickFilter === "high_risk" ? "all" : "high_risk")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        border: "1px solid var(--border)",
                        background: quickFilter === "high_risk" ? "rgba(244, 63, 94, 0.15)" : "transparent",
                        color: quickFilter === "high_risk" ? "#f43f5e" : "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      Has Critical Assets
                    </button>
                  )}

                  {/* Search input */}
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Search
                      size={14}
                      style={{ position: "absolute", left: 10, color: "var(--text-muted)", pointerEvents: "none" }}
                    />
                    <input
                      type="text"
                      placeholder={`Filter ${activeTab}…`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{
                        padding: "6px 28px 6px 30px",
                        borderRadius: 6,
                        fontSize: 12,
                        background: "var(--surface-2)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        outline: "none",
                        minWidth: 190,
                      }}
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        style={{
                          position: "absolute",
                          right: 8,
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Table Data Container */}
              <div style={{ overflowX: "auto" }}>
                {activeTab === "sectors" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          borderBottom: "1px solid var(--border)",
                          textAlign: "left",
                          color: "var(--text-muted)",
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        <th style={{ padding: "12px 18px", width: 50 }}># Rank</th>
                        <th
                          onClick={() => handleSort("sector")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Sector Name {renderSortIcon("sector")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("project_count")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Monitored Assets {renderSortIcon("project_count")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("avg_cost_overrun_pct")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Avg Cost Overrun {renderSortIcon("avg_cost_overrun_pct")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("avg_delay_months")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Avg Schedule Lag {renderSortIcon("avg_delay_months")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("avg_risk_score")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Composite Risk Index {renderSortIcon("avg_risk_score")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("delayed_pct")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Delayed Ratio {renderSortIcon("delayed_pct")}
                          </div>
                        </th>
                        <th style={{ padding: "12px 18px", textAlign: "right" }}>Inspect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSectors.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                            No sector benchmarks found matching &quot;{search}&quot;.
                          </td>
                        </tr>
                      ) : (
                        filteredSectors.map((s, idx) => {
                          const isTop3 = idx < 3;
                          return (
                            <tr
                              key={s.sector}
                              style={{
                                borderBottom: "1px solid var(--border)",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <td style={{ padding: "14px 18px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                                {isTop3 ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: 24,
                                      height: 24,
                                      borderRadius: 6,
                                      background: idx === 0 ? "rgba(245, 158, 11, 0.2)" : idx === 1 ? "rgba(148, 163, 184, 0.2)" : "rgba(217, 119, 6, 0.15)",
                                      color: idx === 0 ? "#fbbf24" : idx === 1 ? "#cbd5e1" : "#d97706",
                                      fontWeight: 800,
                                      fontSize: 11,
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                ) : (
                                  <span style={{ paddingLeft: 6 }}>{idx + 1}</span>
                                )}
                              </td>
                              <td style={{ padding: "14px 18px", fontWeight: 600, color: "var(--text)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ fontSize: 16 }}>{getSectorIcon(s.sector)}</span>
                                  <span>{s.sector}</span>
                                </div>
                              </td>
                              <td style={{ padding: "14px 18px", color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
                                {s.project_count.toLocaleString()} projects
                              </td>
                              <td style={{ padding: "14px 18px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    fontFamily: "var(--font-mono)",
                                    background:
                                      s.avg_cost_overrun_pct > 15
                                        ? "rgba(244, 63, 94, 0.12)"
                                        : s.avg_cost_overrun_pct > 0
                                        ? "rgba(245, 158, 11, 0.12)"
                                        : "rgba(16, 185, 129, 0.12)",
                                    color:
                                      s.avg_cost_overrun_pct > 15
                                        ? "var(--critical)"
                                        : s.avg_cost_overrun_pct > 0
                                        ? "var(--high)"
                                        : "var(--low)",
                                  }}
                                >
                                  {s.avg_cost_overrun_pct > 0 ? `+${s.avg_cost_overrun_pct}%` : `${s.avg_cost_overrun_pct}%`}
                                </span>
                              </td>
                              <td style={{ padding: "14px 18px" }}>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontFamily: "var(--font-mono)",
                                    color: s.avg_delay_months >= 24 ? "var(--critical)" : s.avg_delay_months > 12 ? "var(--high)" : "var(--text)",
                                  }}
                                >
                                  +{s.avg_delay_months} mo
                                </span>
                              </td>
                              <td style={{ padding: "14px 18px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div
                                    style={{
                                      width: 70,
                                      height: 6,
                                      background: "rgba(255,255,255,0.08)",
                                      borderRadius: 3,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.min(100, s.avg_risk_score)}%`,
                                        height: "100%",
                                        background:
                                          s.avg_risk_score > 40
                                            ? "linear-gradient(90deg, #f59e0b, #f43f5e)"
                                            : s.avg_risk_score > 25
                                            ? "linear-gradient(90deg, #0ea5e9, #f59e0b)"
                                            : "linear-gradient(90deg, #10b981, #0ea5e9)",
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                                    {s.avg_risk_score}%
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: "14px 18px" }}>
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: s.delayed_pct >= 50 ? "var(--critical)" : "var(--text-sub)",
                                    fontWeight: s.delayed_pct >= 50 ? 700 : 500,
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  {s.delayed_pct}%
                                </span>
                              </td>
                              <td style={{ padding: "14px 18px", textAlign: "right" }}>
                                <Link
                                  href={`/projects?sector=${encodeURIComponent(s.sector)}`}
                                  className="btn btn-secondary"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "5px 12px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    textDecoration: "none",
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                  }}
                                >
                                  <span>Inspect</span>
                                  <ExternalLink size={11} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === "ministries" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          borderBottom: "1px solid var(--border)",
                          textAlign: "left",
                          color: "var(--text-muted)",
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        <th style={{ padding: "12px 18px", width: 50 }}># Rank</th>
                        <th
                          onClick={() => handleSort("ministry")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Union Ministry {renderSortIcon("ministry")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("project_count")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Monitored Portfolio {renderSortIcon("project_count")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("avg_cost_overrun_pct")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Avg Cost Escalation {renderSortIcon("avg_cost_overrun_pct")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("avg_delay_months")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Avg Forecast Delay {renderSortIcon("avg_delay_months")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("avg_risk_score")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Risk Composite Score {renderSortIcon("avg_risk_score")}
                          </div>
                        </th>
                        <th style={{ padding: "12px 18px", textAlign: "right" }}>Portfolio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMinistries.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                            No ministries found matching &quot;{search}&quot;.
                          </td>
                        </tr>
                      ) : (
                        filteredMinistries.map((m, idx) => {
                          const isTop3 = idx < 3;
                          return (
                            <tr
                              key={m.ministry}
                              style={{
                                borderBottom: "1px solid var(--border)",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <td style={{ padding: "14px 18px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                                {isTop3 ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: 24,
                                      height: 24,
                                      borderRadius: 6,
                                      background: idx === 0 ? "rgba(245, 158, 11, 0.2)" : idx === 1 ? "rgba(148, 163, 184, 0.2)" : "rgba(217, 119, 6, 0.15)",
                                      color: idx === 0 ? "#fbbf24" : idx === 1 ? "#cbd5e1" : "#d97706",
                                      fontWeight: 800,
                                      fontSize: 11,
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                ) : (
                                  <span style={{ paddingLeft: 6 }}>{idx + 1}</span>
                                )}
                              </td>
                              <td style={{ padding: "14px 18px", fontWeight: 600, color: "var(--text)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Building2 size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                  <span>{m.ministry}</span>
                                </div>
                              </td>
                              <td style={{ padding: "14px 18px", color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
                                {m.project_count} projects
                              </td>
                              <td style={{ padding: "14px 18px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    fontFamily: "var(--font-mono)",
                                    background: m.avg_cost_overrun_pct > 15 ? "rgba(244, 63, 94, 0.12)" : "rgba(245, 158, 11, 0.12)",
                                    color: m.avg_cost_overrun_pct > 15 ? "var(--critical)" : "var(--high)",
                                  }}
                                >
                                  +{m.avg_cost_overrun_pct}%
                                </span>
                              </td>
                              <td style={{ padding: "14px 18px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                                +{m.avg_delay_months} mo
                              </td>
                              <td style={{ padding: "14px 18px" }}>
                                <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: m.avg_risk_score > 40 ? "var(--high)" : "var(--text)" }}>
                                  {m.avg_risk_score}%
                                </span>
                              </td>
                              <td style={{ padding: "14px 18px", textAlign: "right" }}>
                                <Link
                                  href={`/projects?ministry=${encodeURIComponent(m.ministry)}`}
                                  className="btn btn-secondary"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "5px 12px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    textDecoration: "none",
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                  }}
                                >
                                  <span>View</span>
                                  <ExternalLink size={11} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === "states" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          borderBottom: "1px solid var(--border)",
                          textAlign: "left",
                          color: "var(--text-muted)",
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        <th style={{ padding: "12px 18px", width: 50 }}># Rank</th>
                        <th
                          onClick={() => handleSort("state")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            State / UT Jurisdiction {renderSortIcon("state")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("project_count")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Total Projects {renderSortIcon("project_count")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("critical_count")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            Critical Risk Assets {renderSortIcon("critical_count")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("high_count")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            High Risk Assets {renderSortIcon("high_count")}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("avg_risk_score")}
                          style={{ padding: "12px 18px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            State Risk Index {renderSortIcon("avg_risk_score")}
                          </div>
                        </th>
                        <th style={{ padding: "12px 18px", textAlign: "right" }}>Map View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStates.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                            No jurisdictions found matching &quot;{search}&quot;.
                          </td>
                        </tr>
                      ) : (
                        filteredStates.map((st, idx) => {
                          const isTop3 = idx < 3;
                          return (
                            <tr
                              key={st.state}
                              style={{
                                borderBottom: "1px solid var(--border)",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <td style={{ padding: "14px 18px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                                {isTop3 ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: 24,
                                      height: 24,
                                      borderRadius: 6,
                                      background: idx === 0 ? "rgba(245, 158, 11, 0.2)" : idx === 1 ? "rgba(148, 163, 184, 0.2)" : "rgba(217, 119, 6, 0.15)",
                                      color: idx === 0 ? "#fbbf24" : idx === 1 ? "#cbd5e1" : "#d97706",
                                      fontWeight: 800,
                                      fontSize: 11,
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                ) : (
                                  <span style={{ paddingLeft: 6 }}>{idx + 1}</span>
                                )}
                              </td>
                              <td style={{ padding: "14px 18px", fontWeight: 600, color: "var(--text)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <MapPin size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                  <span>{st.state}</span>
                                </div>
                              </td>
                              <td style={{ padding: "14px 18px", color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>
                                {st.project_count} assets
                              </td>
                              <td style={{ padding: "14px 18px" }}>
                                {st.critical_count > 0 ? (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: 4,
                                      fontSize: 12,
                                      fontWeight: 700,
                                      fontFamily: "var(--font-mono)",
                                      background: "rgba(244, 63, 94, 0.15)",
                                      color: "var(--critical)",
                                    }}
                                  >
                                    {st.critical_count} critical
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>0</span>
                                )}
                              </td>
                              <td style={{ padding: "14px 18px" }}>
                                {st.high_count > 0 ? (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: 4,
                                      fontSize: 12,
                                      fontWeight: 700,
                                      fontFamily: "var(--font-mono)",
                                      background: "rgba(245, 158, 11, 0.15)",
                                      color: "var(--high)",
                                    }}
                                  >
                                    {st.high_count} high
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>0</span>
                                )}
                              </td>
                              <td style={{ padding: "14px 18px" }}>
                                <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                                  {st.avg_risk_score}%
                                </span>
                              </td>
                              <td style={{ padding: "14px 18px", textAlign: "right" }}>
                                <Link
                                  href={`/map?state=${encodeURIComponent(st.state)}`}
                                  className="btn btn-secondary"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "5px 12px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    textDecoration: "none",
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                  }}
                                >
                                  <span>Geo Map</span>
                                  <ExternalLink size={11} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Table Footer Stats */}
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <span>
                  Displaying{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {activeTab === "sectors"
                      ? filteredSectors.length
                      : activeTab === "ministries"
                      ? filteredMinistries.length
                      : filteredStates.length}
                  </strong>{" "}
                  {activeTab} records
                </span>
                <span>Click any column header to toggle ascending/descending order</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
