"use client";
import { useEffect, useState, useMemo } from "react";
import { listProjects, getPortfolioSummary } from "@/lib/api";
import type { ProjectListItem, PortfolioSummary } from "@/lib/types";
import TopBar from "@/components/layout/TopBar";
import KpiCard from "@/components/ui/KpiCard";
import RiskBadge from "@/components/ui/RiskBadge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { aggregateDistrictData, aggregateStateData, getStateCorridor, projectMatchesState } from "@/lib/districtData";

const COLORS = ["#f43f5e", "#f59e0b", "#3b82f6", "#10b981"];

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsState, setAnalyticsState] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"states" | "districts">("states");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hoveredSlice, setHoveredSlice] = useState<{ name: string; value: number; color: string; pct: string; index: number } | null>(null);
  const [escalationLimit, setEscalationLimit] = useState<number>(5);

  // Comprehensive state-level aggregation across all authentic MoSPI projects
  const allStatesData = useMemo(() => {
    return aggregateStateData(projects);
  }, [projects]);

  // Projects filtered for selected state (or all projects if ALL)
  const filteredProjects = useMemo(() => {
    if (analyticsState === "ALL") return projects;
    return projects.filter((p) => projectMatchesState(p.state, analyticsState));
  }, [projects, analyticsState]);

  // Sub-state district aggregation for selected state
  const analyticsDistrictData = useMemo(() => {
    return aggregateDistrictData(filteredProjects);
  }, [filteredProjects]);

  // Filtered states list based on search query
  const filteredStatesList = useMemo(() => {
    if (!searchQuery.trim()) return allStatesData;
    const q = searchQuery.toLowerCase();
    return allStatesData.filter(
      (s) =>
        s.state.toLowerCase().includes(q) ||
        getStateCorridor(s.state).toLowerCase().includes(q)
    );
  }, [allStatesData, searchQuery]);

  // Filtered districts list based on search query
  const filteredDistrictsList = useMemo(() => {
    if (!searchQuery.trim()) return analyticsDistrictData;
    const q = searchQuery.toLowerCase();
    return analyticsDistrictData.filter(
      (d) =>
        d.district.toLowerCase().includes(q) ||
        d.places.some((p) => p.toLowerCase().includes(q))
    );
  }, [analyticsDistrictData, searchQuery]);

  useEffect(() => {
    Promise.all([
      listProjects({ limit: 2000 }).catch(() => []),
      getPortfolioSummary().catch(() => null),
    ])
      .then(([p, s]) => {
        const projs = (p as ProjectListItem[]) || [];
        setProjects(projs);
        setSummary(s);
      })
      .finally(() => setLoading(false));
  }, []);

  // Ministry short name dictionary for clean chart formatting
  const getMinistryShortName = (fullName: string) => {
    if (!fullName) return "Other";
    if (fullName.includes("Road Transport") || fullName.includes("Highways")) return "Roads & Highways";
    if (fullName.includes("Railways")) return "Railways";
    if (fullName.includes("Power")) return "Power";
    if (fullName.includes("Petroleum") || fullName.includes("Natural Gas")) return "Petroleum & Gas";
    if (fullName.includes("Housing") || fullName.includes("Urban")) return "Urban Affairs";
    if (fullName.includes("Telecommunications") || fullName.includes("Telecom")) return "Telecom";
    if (fullName.includes("Coal")) return "Coal";
    if (fullName.includes("Water Resources") || fullName.includes("River") || fullName.includes("Ganga") || fullName.includes("Jal Shakti")) return "Jal Shakti";
    if (fullName.includes("Civil Aviation") || fullName.includes("Aviation")) return "Civil Aviation";
    if (fullName.includes("Ports") || fullName.includes("Shipping")) return "Ports & Shipping";
    if (fullName.includes("Steel")) return "Steel";
    if (fullName.includes("Atomic")) return "Atomic Energy";
    if (fullName.includes("Chemicals") || fullName.includes("Fertilizers")) return "Chemicals & Fert.";
    if (fullName.includes("Health")) return "Health & Family";
    if (fullName.includes("Renewable")) return "Renewable Energy";
    const cleaned = fullName.replace(/^Ministry of\s+/i, "").replace(/^Department of\s+/i, "").trim();
    return cleaned.length > 18 ? cleaned.slice(0, 16) + "…" : cleaned;
  };

  // Sector breakdown
  const sectorMap: Record<string, { count: number; risk: number; cost: number }> = {};
  const ministryMap: Record<string, { count: number; cost: number }> = {};
  const stateMap: Record<string, { count: number; highRiskCount: number }> = {};

  projects.forEach((p) => {
    // Sector
    if (!sectorMap[p.sector]) sectorMap[p.sector] = { count: 0, risk: 0, cost: 0 };
    sectorMap[p.sector].count++;
    if (p.composite_risk_score != null) sectorMap[p.sector].risk += p.composite_risk_score;
    sectorMap[p.sector].cost += p.revised_cost_cr || p.original_cost_cr || 0;

    // Ministry
    if (!ministryMap[p.ministry]) ministryMap[p.ministry] = { count: 0, cost: 0 };
    ministryMap[p.ministry].count++;
    ministryMap[p.ministry].cost += p.revised_cost_cr || p.original_cost_cr || 0;

    // State
    if (!stateMap[p.state]) stateMap[p.state] = { count: 0, highRiskCount: 0 };
    stateMap[p.state].count++;
    if (p.risk_tier === "critical" || p.risk_tier === "high") stateMap[p.state].highRiskCount++;
  });

  const sectorData = Object.entries(sectorMap)
    .map(([s, d]) => ({
      sector: s,
      count: d.count,
      avgRisk: d.count > 0 ? Math.round((d.risk / d.count) * 100) : 0,
      totalCost: Math.round(d.cost),
    }))
    .sort((a, b) => b.avgRisk - a.avgRisk)
    .slice(0, 10);

  const ministryData = Object.entries(ministryMap)
    .map(([m, d]) => ({
      ministry: getMinistryShortName(m),
      count: d.count,
      totalCost: Math.round(d.cost),
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 8);

  const pieData = summary
    ? [
        { name: "Critical Risk", value: summary.critical_count },
        { name: "High Risk", value: summary.high_count },
        { name: "Medium Risk", value: summary.medium_count },
        { name: "Low Risk (Safe)", value: summary.low_count },
      ]
    : [];

  return (
    <div>
      <TopBar title="Analytics &amp; PAIMANA Portfolio Intelligence" subtitle="Comprehensive financial analytics, capital allocation variance, and sector risk intelligence" />
      <div className="responsive-container">
        {/* Portfolio KPI Overview Header */}
        <div className="responsive-grid-4" style={{ marginBottom: 24 }}>
          <KpiCard label="PAIMANA Projects Tracked" value={summary?.total_projects ? summary.total_projects.toLocaleString("en-IN") : "1,981"} color="#06b6d4" loading={loading} sub="Across 17 Ministries &amp; 22 Sectors" />
          <KpiCard label="High + Critical Risk" value={summary ? summary.high_count + summary.critical_count : "—"} color="#f43f5e" loading={loading} sub="Early intervention required" />
          <KpiCard label="Safe Projects (Low Risk)" value={summary?.low_count ?? "—"} color="#10b981" loading={loading} sub="On-schedule trajectory" />
          <KpiCard label="Avg Schedule Delay" value={summary?.avg_delay_duration_months ? `~${summary.avg_delay_duration_months.toFixed(1)} mo` : "—"} color="#f59e0b" loading={loading} sub="Predicted portfolio delay" />
        </div>

        {/* PORTFOLIO & FINANCIAL ANALYTICS DASHBOARD */}
        <div className="animate-fade">
          <div className="responsive-grid-2" style={{ marginBottom: 24 }}>
            {/* Sector Risk Breakdown */}
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 16, textAlign: "center" }}>
                Average Risk Score by Infrastructure Sector (PAIMANA Portfolio)
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sectorData} layout="vertical" margin={{ left: 8, right: 20 }}>
                  <defs>
                    <linearGradient id="grad-sector-bar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0891b2" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border-2)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => v + "%"} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="sector" width={140} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [v + "%", "Avg Risk Score"]} />
                  <Bar dataKey="avgRisk" fill="url(#grad-sector-bar)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Distribution Donut */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                    Portfolio Risk Classification
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    AI-classified project distribution
                  </div>
                </div>
                <span className="badge" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", fontSize: 10, padding: "2px 8px" }}>
                  4 Tiers
                </span>
              </div>

              {loading ? (
                <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                  Loading distribution...
                </div>
              ) : (
                <>
                  <div style={{ position: "relative", width: "100%", height: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {/* Ambient Radar Glow */}
                    <div
                      style={{
                        position: "absolute",
                        width: 140,
                        height: 140,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(244,63,94,0.05) 50%, transparent 70%)",
                        pointerEvents: "none",
                      }}
                    />

                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <defs>
                          <linearGradient id="grad-critical" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                            <stop offset="100%" stopColor="#be123c" stopOpacity={1} />
                          </linearGradient>
                          <linearGradient id="grad-high" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                            <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                          </linearGradient>
                          <linearGradient id="grad-medium" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity={1} />
                          </linearGradient>
                          <linearGradient id="grad-low" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={66}
                          outerRadius={92}
                          paddingAngle={4}
                          cornerRadius={4}
                          stroke="var(--surface)"
                          strokeWidth={3}
                          dataKey="value"
                          onMouseEnter={(_, index) => {
                            const d = pieData[index];
                            if (d) {
                              const total = pieData.reduce((acc, curr) => acc + curr.value, 0) || 1981;
                              const colors = ["#f43f5e", "#fbbf24", "#38bdf8", "#34d399"];
                              setHoveredSlice({
                                name: d.name,
                                value: d.value,
                                color: colors[index % colors.length],
                                pct: ((d.value / total) * 100).toFixed(1),
                                index,
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredSlice(null)}
                        >
                          <Cell key="cell-0" fill="url(#grad-critical)" />
                          <Cell key="cell-1" fill="url(#grad-high)" />
                          <Cell key="cell-2" fill="url(#grad-medium)" />
                          <Cell key="cell-3" fill="url(#grad-low)" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Central Hero Metric with Dynamic Morphing on Hover (No floating tooltip collision) */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                        pointerEvents: "none",
                        width: 120,
                      }}
                    >
                      {hoveredSlice ? (
                        <div style={{ animation: "fadeIn 0.15s ease" }}>
                          <div
                            style={{
                              fontSize: 22,
                              fontWeight: 800,
                              color: hoveredSlice.color,
                              letterSpacing: "-0.02em",
                              lineHeight: 1,
                              fontFamily: "var(--font-mono, monospace)",
                              textShadow: `0 0 12px ${hoveredSlice.color}50`,
                            }}
                          >
                            {hoveredSlice.value.toLocaleString("en-IN")}
                          </div>
                          <div
                            style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              color: "var(--text)",
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              marginTop: 4,
                            }}
                          >
                            {hoveredSlice.name}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: hoveredSlice.color,
                              marginTop: 2,
                            }}
                          >
                            {hoveredSlice.pct}% Share
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div
                            style={{
                              fontSize: 22,
                              fontWeight: 800,
                              color: "var(--text)",
                              letterSpacing: "-0.02em",
                              lineHeight: 1,
                              fontFamily: "var(--font-mono, monospace)",
                            }}
                          >
                            {(pieData.reduce((acc, curr) => acc + curr.value, 0) || (summary?.total_projects || 1981)).toLocaleString("en-IN")}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "var(--text-muted)",
                              letterSpacing: "0.10em",
                              textTransform: "uppercase",
                              marginTop: 3,
                            }}
                          >
                            Monitored
                          </div>
                          <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
                            100% Portfolio
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Executive 2x2 Risk Breakdown Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                    {pieData.map((d, i) => {
                      const meta = [
                        { border: "#f43f5e", bg: "rgba(244,63,94,0.06)", text: "#f43f5e", label: "Critical Risk", dot: "linear-gradient(135deg, #f43f5e, #be123c)" },
                        { border: "#f59e0b", bg: "rgba(245,158,11,0.06)", text: "#f59e0b", label: "High Risk", dot: "linear-gradient(135deg, #fbbf24, #d97706)" },
                        { border: "#0ea5e9", bg: "rgba(14,165,233,0.06)", text: "#38bdf8", label: "Medium Risk", dot: "linear-gradient(135deg, #38bdf8, #0284c7)" },
                        { border: "#10b981", bg: "rgba(16,185,129,0.06)", text: "#34d399", label: "Low (Stable)", dot: "linear-gradient(135deg, #34d399, #059669)" },
                      ][i] || { border: "#64748b", bg: "rgba(100,116,139,0.06)", text: "#94a3b8", label: d.name, dot: "#64748b" };
                      const total = pieData.reduce((acc, curr) => acc + curr.value, 0) || 1981;
                      const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0";
                      const isHovered = hoveredSlice?.index === i;
                      return (
                        <div
                          key={d.name}
                          onMouseEnter={() => {
                            const colors = ["#f43f5e", "#fbbf24", "#38bdf8", "#34d399"];
                            setHoveredSlice({
                              name: d.name,
                              value: d.value,
                              color: colors[i % colors.length],
                              pct,
                              index: i,
                            });
                          }}
                          onMouseLeave={() => setHoveredSlice(null)}
                          style={{
                            background: isHovered ? `${meta.border}15` : meta.bg,
                            border: `1px solid ${isHovered ? meta.border : meta.border + "28"}`,
                            borderRadius: 6,
                            padding: "8px 10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            transform: isHovered ? "scale(1.02)" : "scale(1)",
                            boxShadow: isHovered ? `0 4px 12px ${meta.border}25` : "none",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.dot, flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 600, color: isHovered ? "var(--text)" : "var(--text-muted)" }}>{meta.label}</span>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: meta.text }}>{pct}%</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", fontFamily: "var(--font-mono, monospace)" }}>
                              {d.value.toLocaleString("en-IN")}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>assets</span>
                          </div>
                          <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: meta.dot, borderRadius: 2 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Risk Trend Trajectory */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                  Risk Trend Trajectory &amp; Historical Volatility (Past 3-6 Months)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Identifies projects with rapidly accelerating slippage vs stable recovery
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="badge" style={{ background: "rgba(244,63,94,0.1)", color: "var(--critical)", border: "1px solid rgba(244,63,94,0.2)" }}>
                  ● Fast-Deteriorating ({projects.filter(p => p.risk_trend === "rapidly_deteriorating").length})
                </span>
                <span className="badge" style={{ background: "rgba(245,158,11,0.1)", color: "var(--high)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  ● Early Warning ({projects.filter(p => p.risk_trend === "deteriorating").length})
                </span>
                <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "var(--low)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  ● On-Track / Stable ({projects.filter(p => p.risk_trend === "stable" || p.risk_trend === "recovering").length})
                </span>
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="data-table" style={{ minWidth: 780 }}>
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Sector</th>
                    <th>State</th>
                    <th>Timeline Drift</th>
                    <th>Risk Index</th>
                    <th>Trend Trajectory</th>
                    <th>Action Needed</th>
                  </tr>
                </thead>
              <tbody>
                {projects
                  .filter(p => p.risk_trend === "rapidly_deteriorating" || p.risk_trend === "deteriorating")
                  .slice(0, 5)
                  .map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: "var(--text)", maxWidth: 260 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.project_name}>
                          {p.project_name}
                        </div>
                      </td>
                      <td>{p.sector}</td>
                      <td>{p.state}</td>
                      <td style={{ color: "var(--critical)", fontWeight: 700 }}>
                        +{((p.predicted_delay_months || 0) * 0.25).toFixed(1)} mo/cycle
                      </td>
                      <td>
                        <RiskBadge tier={p.risk_tier} />
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: p.risk_trend === "rapidly_deteriorating" ? "rgba(244,63,94,0.15)" : "rgba(245,158,11,0.15)",
                          color: p.risk_trend === "rapidly_deteriorating" ? "var(--critical)" : "var(--high)",
                          border: `1px solid ${p.risk_trend === "rapidly_deteriorating" ? "rgba(244,63,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                        }}>
                          {p.risk_trend === "rapidly_deteriorating" ? "▲ Severe Slippage" : "▲ Warning Signal"}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`/projects/${p.id}`}
                          style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
                        >
                          View Mitigation Plan →
                        </a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

          {/* Financial Variance & Capital Allocation */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>
              Financial Variance &amp; Capital Allocation (PAIMANA Portfolio)
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              Top spending ministries and their cumulative capital expenditure
            </div>
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={ministryData} margin={{ left: 16, right: 20, top: 10, bottom: 40 }}>
                <defs>
                  <linearGradient id="grad-ministry-bar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-2)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="ministry"
                  interval={0}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  angle={-22}
                  textAnchor="end"
                  axisLine={false}
                  tickLine={false}
                  height={50}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L Cr` : v > 0 ? `₹${(v / 1000).toFixed(0)}k Cr` : "₹0"}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const costCr = Number(item.totalCost) || 0;
                      const lakhCr = (costCr / 100000).toFixed(2);
                      return (
                        <div
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "10px 14px",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{item.ministry}</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "#38bdf8" }}>
                              ₹{costCr.toLocaleString("en-IN")} Cr
                            </span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({lakhCr} Lakh Cr)</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            {item.count} Tracked Infrastructure Projects
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalCost" fill="url(#grad-ministry-bar)" radius={[5, 5, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Highest Cost Escalation Projects — Official MoSPI April 2026 Dataset */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text)" }}>
                    Highest Cost Escalation Projects
                  </span>
                  <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)", fontSize: 11, padding: "2px 8px", fontWeight: 700 }}>
                    Official MoSPI April 2026 Dataset
                  </span>
                  <span className="badge" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.25)", fontSize: 11, padding: "2px 8px" }}>
                    Table 6: All Ongoing Projects (Pan-India)
                  </span>
                  <span className="badge" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.25)", fontSize: 11, padding: "2px 8px" }}>
                    1,981 Projects Baseline
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Ranked strictly by capital cost overrun (Anticipated / Revised Cost − Original Sanctioned Cost) directly from <strong style={{ color: "var(--text)" }}>FlashReport_April_2026_All_Ongoing_Projects_Structured.csv</strong>.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace", background: "var(--surface-2)", padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>
                  April 2026 CSV
                </span>
                <select
                  value={escalationLimit}
                  onChange={(e) => setEscalationLimit(Number(e.target.value))}
                  className="select"
                  style={{ padding: "4px 10px", fontSize: 11, height: 30, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)" }}
                >
                  <option value={5}>Top 5 Projects</option>
                  <option value={10}>Top 10 Projects</option>
                  <option value={15}>Top 15 Projects</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ minWidth: 920 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Project Name</th>
                    <th>Ministry</th>
                    <th>Sector</th>
                    <th>State / Scope</th>
                    <th>Report Month</th>
                    <th>Original Cost</th>
                    <th>Revised Cost</th>
                    <th>Cost Overrun</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects
                    .filter((p) => (p.revised_cost_cr || 0) > (p.original_cost_cr || 0))
                    .sort((a, b) => {
                      const escA = (a.revised_cost_cr || 0) - (a.original_cost_cr || 0);
                      const escB = (b.revised_cost_cr || 0) - (b.original_cost_cr || 0);
                      return escB - escA;
                    })
                    .slice(0, escalationLimit)
                    .map((p, rank) => {
                      const esc = (p.revised_cost_cr || 0) - (p.original_cost_cr || 0);
                      const escPct = p.original_cost_cr ? ((esc / p.original_cost_cr) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={p.id}>
                          <td style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: 12 }}>
                            #{rank + 1}
                          </td>
                          <td style={{ fontWeight: 600, color: "var(--text)", maxWidth: 280 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.project_name}>
                              {p.project_name}
                            </div>
                          </td>
                          <td style={{ maxWidth: 220, fontSize: 12 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.ministry}>
                              {p.ministry}
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            <span style={{ padding: "2px 6px", borderRadius: 4, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11 }}>
                              {p.sector || "Infrastructure"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            <span style={{
                              fontWeight: p.state === "PAN India" ? 700 : 500,
                              color: p.state === "PAN India" ? "#38bdf8" : "var(--text)"
                            }}>
                              {p.state}
                            </span>
                          </td>
                          <td>
                            <span className="badge" style={{ background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.2)", fontSize: 10, padding: "1px 6px" }}>
                              {p.report_month || "April 2026"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                            ₹{p.original_cost_cr?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—"} Cr
                          </td>
                          <td style={{ fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
                            ₹{p.revised_cost_cr?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—"} Cr
                          </td>
                          <td style={{ color: "var(--critical)", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                            +₹{esc.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr
                            <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.85 }}>({escPct}%)</span>
                          </td>
                          <td>
                            <a
                              href={`/projects/${p.id}`}
                              style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
                            >
                              View Details →
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

          {/* Priority Escalation & Rapid Deployment Targets (All 28 States & UTs) */}
          <div className="card">
            {/* Header & Controls Strip */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    overflow: "hidden",
                    flexShrink: 0,
                    boxShadow: "0 0 12px rgba(6,182,212,0.3)",
                    border: "1px solid rgba(6,182,212,0.25)",
                    background: "var(--surface-2)",
                  }}
                >
                  <img
                    src="/logo.jpg"
                    alt="PRISM Logo"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                      Priority Escalation &amp; Rapid Deployment Targets (All 28 States &amp; UTs)
                    </div>
                    <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", fontSize: 10, padding: "2px 8px" }}>
                      {viewMode === "states" ? `${allStatesData.length} States & UTs Tracked` : `${analyticsState} Sub-State Scope`}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {viewMode === "states"
                      ? "Authentic MoSPI portfolio intelligence across all 28 States, 8 Union Territories & Interstate Corridors"
                      : `Sub-state district intelligence for ${analyticsState} (${filteredProjects.length} Tracked Projects across ${analyticsDistrictData.length} Districts)`}
                  </div>
                </div>
              </div>

              {/* View Mode Toggle Pill */}
              <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 6, padding: 2, border: "1px solid var(--border)" }}>
                <button
                  onClick={() => {
                    setViewMode("states");
                    setAnalyticsState("ALL");
                  }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: viewMode === "states" ? "var(--accent)" : "transparent",
                    color: viewMode === "states" ? "#ffffff" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  All States ({allStatesData.length})
                </button>
                <button
                  onClick={() => {
                    setViewMode("districts");
                    if (analyticsState === "ALL" && allStatesData.length > 0) {
                      setAnalyticsState(allStatesData[0].state);
                    }
                  }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: viewMode === "districts" ? "var(--accent)" : "transparent",
                    color: viewMode === "districts" ? "#ffffff" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  District Deep-Dive
                </button>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                padding: "8px 12px",
                background: "var(--surface-2)",
                borderRadius: 6,
                border: "1px solid var(--border)",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {/* Search Bar with SVG icon */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px", maxWidth: 360 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder={viewMode === "states" ? "Search state or corridor..." : `Search districts in ${analyticsState}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 5,
                    color: "var(--text)",
                    fontSize: 12,
                  }}
                />
              </div>

              {/* State Filter Selector without emoji */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 1 auto" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Filter State:</span>
                <select
                  value={analyticsState}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnalyticsState(val);
                    if (val === "ALL") {
                      setViewMode("states");
                    } else {
                      setViewMode("districts");
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    maxWidth: 320,
                  }}
                >
                  <option value="ALL">PAN-INDIA: ALL 28 STATES &amp; UTS — {projects.length} Projects</option>
                  {allStatesData.map((s) => (
                    <option key={s.state} value={s.state}>
                      {s.state} ({s.projectCount} Projects)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Breadcrumb strip when drilled into a specific state */}
            {viewMode === "districts" && analyticsState !== "ALL" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  padding: "8px 14px",
                  background: "rgba(59, 130, 246, 0.08)",
                  borderRadius: 6,
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => {
                      setAnalyticsState("ALL");
                      setViewMode("states");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--accent)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    ← Back to All 28 States &amp; UTs Overview
                  </button>
                  <span style={{ color: "var(--border)", fontSize: 12 }}>|</span>
                  <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
                    Active Jurisdiction: {analyticsState} ({filteredProjects.length} Projects across {analyticsDistrictData.length} Districts)
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Strategic Corridor: <span style={{ color: "var(--text)" }}>{getStateCorridor(analyticsState)}</span>
                </div>
              </div>
            )}

            {/* Visual Scrollbar & Counter Helper Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                padding: "0 2px",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="18 8 22 12 18 16" />
                  <polyline points="6 8 2 12 6 16" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
                <span>Tip: Scroll horizontally to view all columns (Risk Tier, Outlay, Progress, Actions)</span>
              </div>
              <div>
                {viewMode === "states" ? `${filteredStatesList.length} States & UTs Listed` : `${filteredDistrictsList.length} Districts Listed`}
              </div>
            </div>

            {/* Scrollable Table Container with Custom High-Visibility Scrollbar */}
            <div className="table-scroll-wrapper custom-scrollbar">
              {viewMode === "states" ? (
                <table className="data-table" style={{ minWidth: 1040, width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 170, width: "18%" }}>State / Strategic Jurisdiction</th>
                      <th style={{ minWidth: 260, width: "27%" }}>Key Places / Strategic Corridors</th>
                      <th style={{ minWidth: 110, width: "12%" }}>Tracked Assets</th>
                      <th style={{ minWidth: 95, width: "10%" }}>Risk Tier</th>
                      <th style={{ minWidth: 120, width: "12%" }}>Total Outlay</th>
                      <th style={{ minWidth: 140, width: "13%" }}>Avg Physical Progress</th>
                      <th style={{ minWidth: 120, width: "8%", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStatesList.map((s) => (
                      <tr key={s.state}>
                        <td style={{ fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }}>
                              <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3l9 7H3z" />
                            </svg>
                            <span>{s.state}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 360 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={getStateCorridor(s.state)}>
                            {getStateCorridor(s.state)}
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: "var(--surface-2)", color: "var(--text)", whiteSpace: "nowrap" }}>
                            {s.projectCount} Project{s.projectCount > 1 ? "s" : ""}
                          </span>
                        </td>
                        <td>
                          <RiskBadge tier={s.criticalCount > 0 ? "critical" : s.highCount > 0 ? "high" : s.mediumCount > 0 ? "medium" : "low"} />
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--text)", fontSize: 12, whiteSpace: "nowrap" }}>
                          ₹{s.totalCostCr.toLocaleString("en-IN")} Cr
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 64, height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${s.avgProgress}%`, height: "100%", background: "#10b981" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{s.avgProgress}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, whiteSpace: "nowrap" }}>
                            <button
                              onClick={() => {
                                setAnalyticsState(s.state);
                                setViewMode("districts");
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--accent)",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              View Districts →
                            </button>
                            <a
                              href={`/map`}
                              style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textDecoration: "none" }}
                            >
                              Map
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStatesList.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                          No states matching &quot;{searchQuery}&quot; found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="data-table" style={{ minWidth: 940, width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 160, width: "20%" }}>District / Strategic Hub</th>
                      <th style={{ minWidth: 280, width: "32%" }}>Key Places / Corridors</th>
                      <th style={{ minWidth: 110, width: "14%" }}>Tracked Assets</th>
                      <th style={{ minWidth: 95, width: "10%" }}>Risk Tier</th>
                      <th style={{ minWidth: 140, width: "14%" }}>Avg Physical Progress</th>
                      <th style={{ minWidth: 115, width: "10%", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDistrictsList.map((d) => (
                      <tr key={d.district}>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>{d.district}</td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 300 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.places.join(", ")}>
                            {d.places.join(", ")}
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: "var(--surface-2)", color: "var(--text)" }}>
                            {d.projectCount} Project{d.projectCount > 1 ? "s" : ""}
                          </span>
                        </td>
                        <td>
                          <RiskBadge tier={d.criticalCount > 0 ? "critical" : d.highCount > 0 ? "high" : d.mediumCount > 0 ? "medium" : "low"} />
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 64, height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${d.avgProgress}%`, height: "100%", background: "#10b981" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{d.avgProgress}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <a
                            href={`/map`}
                            style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
                          >
                            Explore on Map →
                          </a>
                        </td>
                      </tr>
                    ))}
                    {filteredDistrictsList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                          No districts matching &quot;{searchQuery}&quot; found in {analyticsState}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}