"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import { getEarlyWarnings } from "@/lib/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";

interface EarlyWarningItem {
  project_id: string;
  project_name: string;
  ministry: string;
  sector: string;
  state: string;
  physical_progress_pct: number;
  expected_progress_pct: number;
  progress_gap_pct: number;
  time_elapsed_pct: number;
  burn_progress_gap: number;
  burn_rate_pct?: number;
  cumulative_expenditure_cr?: number;
  target_doc_display?: string;
  delay_probability: number;
  delay_duration_months: number;
  cost_overrun_probability: number;
  composite_risk_score: number;
  risk_tier: string;
  severity: "critical" | "high" | "medium" | "low";
  triggers: string[];
  likely_driver: string;
  recommended_action: string;
  scheduled_completion: string | null;
  revised_completion: string | null;
  project_cost_cr: number;
}

interface EarlyWarningResponse {
  total: number;
  warnings: EarlyWarningItem[];
  severity_counts: {
    critical: number;
    high: number;
    medium: number;
    low?: number;
  };
}

export default function EarlyWarningPage() {
  const [data, setData] = useState<EarlyWarningResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"risk" | "progress_gap" | "delay" | "cost">("risk");

  // Client-side pagination to eliminate freezing and unresponsive script warnings
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(50);

  useEffect(() => {
    fetchEarlyWarnings();
  }, []);

  // Reset to first page whenever search, filter, or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, severityFilter, sectorFilter, sortBy, pageSize]);

  async function fetchEarlyWarnings() {
    try {
      setLoading(true);
      setError("");
      const res = await getEarlyWarnings({ limit: 2500 });
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load early warning signals.");
    } finally {
      setLoading(false);
    }
  }

  const sectors = useMemo(() => {
    if (!data?.warnings) return [];
    const set = new Set<string>();
    data.warnings.forEach((w) => {
      if (w.sector) set.add(w.sector);
    });
    return Array.from(set).sort();
  }, [data]);

  const filteredWarnings = useMemo(() => {
    if (!data?.warnings) return [];
    return data.warnings
      .filter((w) => {
        if (
          severityFilter !== "all" &&
          w.severity?.toLowerCase() !== severityFilter.toLowerCase()
        ) {
          return false;
        }
        if (sectorFilter !== "all" && w.sector !== sectorFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const match =
            w.project_name.toLowerCase().includes(q) ||
            w.ministry.toLowerCase().includes(q) ||
            w.sector.toLowerCase().includes(q) ||
            w.state.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "risk") {
          const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          const diff = (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
          if (diff !== 0) return diff;
          return b.composite_risk_score - a.composite_risk_score;
        }
        if (sortBy === "progress_gap") {
          if (b.progress_gap_pct !== a.progress_gap_pct) return b.progress_gap_pct - a.progress_gap_pct;
          return b.project_cost_cr - a.project_cost_cr;
        }
        if (sortBy === "delay") return b.delay_probability - a.delay_probability;
        if (sortBy === "cost") return b.project_cost_cr - a.project_cost_cr;
        return 0;
      });
  }, [data, severityFilter, sectorFilter, search, sortBy]);

  const totalExposure = useMemo(() => {
    if (!data?.warnings) return 0;
    return data.warnings.reduce((sum, w) => sum + (w.project_cost_cr || 0), 0);
  }, [data]);

  // Paginated window
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredWarnings.length / pageSize));
  const startIndex = pageSize === "all" ? 0 : (currentPage - 1) * pageSize;
  const endIndex = pageSize === "all" ? filteredWarnings.length : Math.min(startIndex + pageSize, filteredWarnings.length);
  const paginatedWarnings = useMemo(() => {
    if (pageSize === "all") return filteredWarnings;
    return filteredWarnings.slice(startIndex, endIndex);
  }, [filteredWarnings, startIndex, endIndex, pageSize]);

  return (
    <div>
      <TopBar
        title="Early Warning Intelligence Radar"
        subtitle="Authoritative April 2026 MoSPI PAIMANA trajectory deviation detection & proactive risk flags across 1,981 central infrastructure projects"
      />

      <div className="responsive-container" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* KPI Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <div className="card" style={{ borderLeft: "4px solid var(--accent)" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total Monitored Portfolio
            </span>
            <div style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 2px 0", color: "var(--text)" }}>
              {data?.total ? data.total.toLocaleString("en-IN") : "—"}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>MoSPI central infrastructure assets</span>
          </div>

          <div className="card" style={{ borderLeft: "4px solid var(--critical, #f43f5e)" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Critical Deteriorations
            </span>
            <div style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 2px 0", color: "var(--critical, #f43f5e)" }}>
              {data?.severity_counts?.critical ?? "—"}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Level-1 MoSPI escalation triggered</span>
          </div>

          <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              High-Risk Warnings
            </span>
            <div style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 2px 0", color: "#f59e0b" }}>
              {data?.severity_counts?.high ?? "—"}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Severe burn-gap or AI delay prob &gt;70%</span>
          </div>

          <div className="card" style={{ borderLeft: "4px solid #3b82f6" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Capital At Immediate Risk
            </span>
            <div style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 2px 0", color: "#3b82f6" }}>
              ₹{(totalExposure / 1000).toFixed(1)}k Cr
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Cumulative cost of monitored infrastructure</span>
          </div>
        </div>

        {/* Filters and Controls */}
        <div
          className="card"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
          }}
        >
          {/* Left search */}
          <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Search project name, ministry, state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                background: "var(--surface-2, #1e293b)",
                border: "1px solid var(--border-2, #334155)",
                borderRadius: 6,
                padding: "8px 12px",
                color: "var(--text)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {/* Severity tabs with dynamic counts & themed status colors */}
          <div
            style={{
              display: "flex",
              background: "var(--surface-2, #1e293b)",
              padding: "3px 4px",
              borderRadius: 8,
              border: "1px solid var(--border-2, #334155)",
              fontSize: 12,
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {[
              { id: "all", label: "All", count: data?.total ?? 0, color: "var(--text)" },
              { id: "critical", label: "Critical", count: data?.severity_counts?.critical ?? 0, color: "#f43f5e" },
              { id: "high", label: "High", count: data?.severity_counts?.high ?? 0, color: "#f59e0b" },
              { id: "medium", label: "Medium", count: data?.severity_counts?.medium ?? 0, color: "#38bdf8" },
              { id: "low", label: "Low / Nominal", count: data?.severity_counts?.low ?? 0, color: "#10b981" },
            ].map((tab) => {
              const isActive = severityFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSeverityFilter(tab.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: isActive ? `1px solid ${tab.color}` : "1px solid transparent",
                    background: isActive
                      ? tab.id === "critical"
                        ? "rgba(244, 63, 94, 0.16)"
                        : tab.id === "high"
                        ? "rgba(245, 158, 11, 0.16)"
                        : tab.id === "medium"
                        ? "rgba(56, 189, 248, 0.16)"
                        : tab.id === "low"
                        ? "rgba(16, 185, 129, 0.16)"
                        : "rgba(255, 255, 255, 0.12)"
                      : "transparent",
                    color: isActive ? tab.color : "var(--text-muted)",
                    cursor: "pointer",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: 10,
                        background: isActive ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.06)",
                        opacity: isActive ? 1 : 0.7,
                      }}
                    >
                      {tab.count.toLocaleString("en-IN")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sector select with explicit dark dropdown styles */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            style={{
              background: "var(--surface-2, #1e293b)",
              border: "1px solid var(--border-2, #334155)",
              borderRadius: 6,
              padding: "7px 12px",
              color: "var(--text, #f8fafc)",
              fontSize: 12,
              fontWeight: 500,
              outline: "none",
              cursor: "pointer",
              colorScheme: "dark",
            }}
          >
            <option value="all" style={{ background: "#0f172a", color: "#f8fafc" }}>
              All Sectors ({sectors.length})
            </option>
            {sectors.map((s) => (
              <option key={s} value={s} style={{ background: "#0f172a", color: "#f8fafc" }}>
                {s}
              </option>
            ))}
          </select>

          {/* Sort select with explicit dark dropdown styles */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: "var(--surface-2, #1e293b)",
              border: "1px solid var(--border-2, #334155)",
              borderRadius: 6,
              padding: "7px 12px",
              color: "var(--text, #f8fafc)",
              fontSize: 12,
              fontWeight: 500,
              outline: "none",
              cursor: "pointer",
              colorScheme: "dark",
            }}
          >
            <option value="risk" style={{ background: "#0f172a", color: "#f8fafc" }}>
              Sort by: Risk Severity (Critical First)
            </option>
            <option value="progress_gap" style={{ background: "#0f172a", color: "#f8fafc" }}>
              Sort by: Schedule Gap (Highest)
            </option>
            <option value="delay" style={{ background: "#0f172a", color: "#f8fafc" }}>
              Sort by: AI Delay Probability
            </option>
            <option value="cost" style={{ background: "#0f172a", color: "#f8fafc" }}>
              Sort by: Total Project Cost
            </option>
          </select>
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchEarlyWarnings} />
        ) : filteredWarnings.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ color: "var(--accent)", display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 700 }}>No Early Warning Signals Match Filters</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 440, margin: "0 auto 16px" }}>
              No infrastructure assets match the active filters ({severityFilter !== "all" ? `Severity: ${severityFilter.toUpperCase()}` : ""}{sectorFilter !== "all" ? `, Sector: ${sectorFilter}` : ""}{search ? `, Query: "${search}"` : ""}).
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch("");
                setSeverityFilter("all");
                setSectorFilter("all");
              }}
              style={{ fontSize: 12, padding: "6px 16px" }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(255,255,255,0.02)",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Flagged Assets ({filteredWarnings.length.toLocaleString("en-IN")})
                {filteredWarnings.length > 0 && pageSize !== "all" && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
                    — Showing {startIndex + 1}–{endIndex} of {filteredWarnings.length.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPageSize(val === "all" ? "all" : Number(val));
                    }}
                    style={{
                      background: "var(--surface-2, #1e293b)",
                      border: "1px solid var(--border-2, #334155)",
                      borderRadius: 4,
                      padding: "3px 8px",
                      color: "var(--text)",
                      fontSize: 12,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value="all">All ({filteredWarnings.length})</option>
                  </select>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  MoSPI April 2026 Authoritative Dataset
                </span>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th style={{ padding: "12px 16px" }}>Project & Location</th>
                    <th style={{ padding: "12px 16px" }}>Progress vs Scheduled</th>
                    <th style={{ padding: "12px 16px" }}>Financial Burn</th>
                    <th style={{ padding: "12px 16px" }}>Deterioration Triggers</th>
                    <th style={{ padding: "12px 16px" }}>Likely Driver & Action</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedWarnings.map((item) => {
                    const sevColor =
                      item.severity === "critical"
                        ? "var(--critical, #f43f5e)"
                        : item.severity === "high"
                        ? "#f59e0b"
                        : item.severity === "medium"
                        ? "#38bdf8"
                        : "#10b981";

                    return (
                      <tr
                        key={item.project_id}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* Project & Location */}
                        <td style={{ padding: "14px 16px", maxWidth: 280 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                background: `${sevColor}20`,
                                color: sevColor,
                                border: `1px solid ${sevColor}40`,
                              }}
                            >
                              {item.severity === "low" ? "Nominal" : item.severity}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              ₹{item.project_cost_cr.toLocaleString("en-IN")} Cr
                            </span>
                          </div>
                          <Link
                            href={`/projects/${item.project_id}`}
                            style={{
                              fontWeight: 600,
                              color: "var(--text)",
                              textDecoration: "none",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: "1.35",
                            }}
                          >
                            {item.project_name}
                          </Link>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                            {item.state} · {item.sector}
                          </div>
                        </td>

                        {/* Progress vs Scheduled */}
                        <td style={{ padding: "14px 16px", minWidth: 165 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: "#3b82f6", fontWeight: 700 }}>
                              Actual: {item.physical_progress_pct}%
                            </span>
                            <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                              Expected: {item.expected_progress_pct}%
                            </span>
                          </div>
                          {/* Dual progress bar */}
                          <div
                            style={{
                              width: "100%",
                              height: 6,
                              background: "rgba(255,255,255,0.08)",
                              borderRadius: 3,
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, item.expected_progress_pct))}%`,
                                height: "100%",
                                background: "#64748b",
                                position: "absolute",
                                opacity: 0.45,
                              }}
                            />
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, item.physical_progress_pct))}%`,
                                height: "100%",
                                background: item.progress_gap_pct <= 0 ? "#10b981" : item.progress_gap_pct > 25 ? "#f43f5e" : "#3b82f6",
                                position: "absolute",
                              }}
                            />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color:
                                  item.progress_gap_pct > 25
                                    ? "var(--critical, #f43f5e)"
                                    : item.progress_gap_pct > 0
                                    ? "#f59e0b"
                                    : "#10b981",
                              }}
                            >
                              {item.progress_gap_pct > 0
                                ? `Lag: -${item.progress_gap_pct}% behind`
                                : item.progress_gap_pct < -0.5
                                ? `Lead: +${Math.abs(item.progress_gap_pct)}% ahead`
                                : "On schedule"}
                            </span>
                          </div>
                          {item.target_doc_display && (
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                              {item.target_doc_display}
                            </div>
                          )}
                        </td>

                        {/* Financial Burn */}
                        <td style={{ padding: "14px 16px", minWidth: 155 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            {item.burn_progress_gap > 5 ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "rgba(245, 158, 11, 0.15)",
                                  color: "#f59e0b",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                }}
                              >
                                +{item.burn_progress_gap}% Fast Burn
                              </span>
                            ) : item.burn_progress_gap < -5 ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "rgba(56, 189, 248, 0.15)",
                                  color: "#38bdf8",
                                  border: "1px solid rgba(56, 189, 248, 0.3)",
                                }}
                              >
                                {item.burn_progress_gap}% Billing Lag
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "rgba(16, 185, 129, 0.15)",
                                  color: "#10b981",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                }}
                              >
                                Balanced ({item.burn_progress_gap >= 0 ? "+" : ""}{item.burn_progress_gap}%)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>
                            ₹{(item.cumulative_expenditure_cr ?? 0).toLocaleString("en-IN")} Cr spent
                            {item.burn_rate_pct != null && (
                              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> ({item.burn_rate_pct}%)</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                            Timeline: {item.time_elapsed_pct}% · Delay: +{item.delay_duration_months}m
                          </div>
                        </td>

                        {/* Deterioration Triggers */}
                        <td style={{ padding: "14px 16px", maxWidth: 260 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {item.triggers.map((trig, idx) => {
                              const isCritical =
                                trig.toLowerCase().includes("escalation") ||
                                trig.toLowerCase().includes("breach") ||
                                trig.toLowerCase().includes("extended timeline");
                              const isWarn =
                                trig.toLowerCase().includes("front-loaded") ||
                                trig.toLowerCase().includes("schedule lag") ||
                                trig.toLowerCase().includes("deficit") ||
                                trig.toLowerCase().includes("delay prob");
                              const isInfo =
                                trig.toLowerCase().includes("billing lag") ||
                                trig.toLowerCase().includes("zero mobilization") ||
                                trig.toLowerCase().includes("pre-construction");
                              const borderC = isCritical ? "#f43f5e" : isWarn ? "#f59e0b" : isInfo ? "#38bdf8" : "#10b981";

                              return (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: 11,
                                    background: "rgba(255,255,255,0.03)",
                                    padding: "3px 7px",
                                    borderRadius: 4,
                                    color: "var(--text)",
                                    borderLeft: `2.5px solid ${borderC}`,
                                    lineHeight: "1.3",
                                  }}
                                >
                                  {trig}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Likely Driver & Action */}
                        <td style={{ padding: "14px 16px", maxWidth: 260 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--text)",
                              marginBottom: 5,
                              display: "inline-block",
                              background: "rgba(255, 255, 255, 0.05)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            {item.likely_driver}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              lineHeight: 1.35,
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 5,
                            }}
                          >
                            <span style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                              </svg>
                            </span>
                            <span>{item.recommended_action}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <Link
                              href={`/projects/${item.project_id}`}
                              className="btn btn-secondary"
                              style={{ padding: "5px 10px", fontSize: 11, textDecoration: "none" }}
                            >
                              Analyze
                            </Link>
                            <Link
                              href={`/actions?project_id=${item.project_id}&project_name=${encodeURIComponent(item.project_name)}&title=${encodeURIComponent(`Intervene: ${item.likely_driver}`)}&description=${encodeURIComponent(`Recommended Action: ${item.recommended_action}. (Trigger: ${item.triggers.join(', ')})`)}&priority=${item.severity}&action=new`}
                              className="btn btn-primary"
                              style={{
                                padding: "5px 11px",
                                fontSize: 11,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              title="Assign Intervention Workflow"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14"/>
                              </svg>
                              Intervene
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredWarnings.length > 0 && pageSize !== "all" && totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  borderTop: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.01)",
                  flexWrap: "wrap",
                  gap: 12,
                  fontSize: 12,
                }}
              >
                <div style={{ color: "var(--text-muted)" }}>
                  Showing <strong style={{ color: "var(--text)" }}>{startIndex + 1}</strong> to{" "}
                  <strong style={{ color: "var(--text)" }}>{endIndex}</strong> of{" "}
                  <strong style={{ color: "var(--text)" }}>{filteredWarnings.length.toLocaleString("en-IN")}</strong> projects
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="btn btn-secondary"
                    style={{
                      padding: "4px 8px",
                      fontSize: 11,
                      opacity: currentPage === 1 ? 0.4 : 1,
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    « First
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-secondary"
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      opacity: currentPage === 1 ? 0.4 : 1,
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    ‹ Prev
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "0 4px" }}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      const isCurrent = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          style={{
                            minWidth: 28,
                            height: 28,
                            padding: "0 6px",
                            borderRadius: 4,
                            border: isCurrent ? "1px solid var(--accent, #3b82f6)" : "1px solid var(--border)",
                            background: isCurrent ? "var(--accent, #3b82f6)" : "transparent",
                            color: isCurrent ? "#fff" : "var(--text-muted)",
                            fontSize: 11,
                            fontWeight: isCurrent ? 700 : 500,
                            cursor: "pointer",
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn btn-secondary"
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      opacity: currentPage === totalPages ? 0.4 : 1,
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    }}
                  >
                    Next ›
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="btn btn-secondary"
                    style={{
                      padding: "4px 8px",
                      fontSize: 11,
                      opacity: currentPage === totalPages ? 0.4 : 1,
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    }}
                  >
                    Last »
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
