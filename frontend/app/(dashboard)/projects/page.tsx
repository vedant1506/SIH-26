"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { listProjects, getPortfolioSummary } from "@/lib/api";
import type { ProjectListItem, PortfolioSummary } from "@/lib/types";
import TopBar from "@/components/layout/TopBar";
import ProjectFilters from "@/components/tables/ProjectFilters";
import ProjectTable from "@/components/tables/ProjectTable";
import { toast } from "sonner";

interface Filters {
  ministry?: string;
  sector?: string;
  state?: string;
  risk_tier?: string;
  project_scale?: string;
  search?: string;
  delayed?: string;
}

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>(() => {
    const risk_tier = searchParams.get("risk_tier") || searchParams.get("tier") || undefined;
    const ministry = searchParams.get("ministry") || undefined;
    const sector = searchParams.get("sector") || undefined;
    const state = searchParams.get("state") || undefined;
    const project_scale = searchParams.get("scale") || searchParams.get("project_scale") || undefined;
    const search = searchParams.get("search") || undefined;
    const delayed = searchParams.get("delayed") || undefined;
    return { risk_tier, ministry, sector, state, project_scale, search, delayed };
  });

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    getPortfolioSummary().then(setSummary).catch(() => {});
  }, []);

  // Sync state when query parameters change
  useEffect(() => {
    const risk_tier = searchParams.get("risk_tier") || searchParams.get("tier") || undefined;
    const ministry = searchParams.get("ministry") || undefined;
    const sector = searchParams.get("sector") || undefined;
    const state = searchParams.get("state") || undefined;
    const project_scale = searchParams.get("scale") || searchParams.get("project_scale") || undefined;
    const search = searchParams.get("search") || undefined;
    const delayed = searchParams.get("delayed") || undefined;
    setFilters({ risk_tier, ministry, sector, state, project_scale, search, delayed });
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjects({ ...filters, skip: page * pageSize, limit: pageSize });
      // Strict filter membership:
      // The filter must only perform: project.actualRiskTier === selectedRiskTier.
      // If a risk_tier filter is active, exclude any project whose actual authoritative risk_tier does not match.
      // The project's own authoritative risk data must remain untouched.
      const targetTier = filters.risk_tier ? filters.risk_tier.toLowerCase().trim() : null;
      const verifiedProjects = targetTier
        ? data.filter((p) => (p.risk_tier || "").toLowerCase().trim() === targetTier)
        : data;
      setProjects(verifiedProjects);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 0 on filter change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  useEffect(() => {
    if (filters.sector) {
      document.title = `${filters.sector} Projects | PRISM`;
    } else if (filters.ministry) {
      document.title = `${filters.ministry} Portfolio | PRISM`;
    } else if (filters.delayed === "true" || filters.delayed === "1") {
      document.title = "Delayed Projects | PRISM";
    } else if (filters.risk_tier?.toLowerCase() === "critical") {
      document.title = "Critical Projects | PRISM";
    } else {
      document.title = "Project Risk Matrix | PRISM";
    }
  }, [filters.sector, filters.ministry, filters.delayed, filters.risk_tier]);

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
    // Update URL shallowly so user can copy/bookmark or go back
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    router.replace(qs ? `/projects?${qs}` : "/projects");
  };

  const exportCSV = () => {
    if (!projects.length) {
      toast.error("No projects available to export");
      return;
    }
    const headers = [
      "Project Name",
      "Ministry",
      "Sector",
      "State",
      "Scale",
      "Revised Cost (Cr)",
      "Progress (%)",
      "Risk Score",
      "Risk Tier",
      "Delay Prob (%)",
    ];
    const rows = projects.map((p) => [
      `"${p.project_name?.replace(/"/g, '""')}"`,
      `"${p.ministry}"`,
      `"${p.sector}"`,
      `"${p.state}"`,
      `"${p.project_scale}"`,
      p.revised_cost_cr ?? p.original_cost_cr ?? "",
      p.physical_progress_pct ?? "",
      p.composite_risk_score != null ? (p.composite_risk_score * 100).toFixed(0) : "",
      `"${p.risk_tier}"`,
      p.delay_probability != null ? (p.delay_probability * 100).toFixed(0) : "",
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `risk_matrix_${filters.delayed ? "delayed" : filters.risk_tier || "all"}_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${projects.length} projects to CSV`);
  };

  const isSectorFiltered = !!filters.sector;
  const isMinistryFiltered = !!filters.ministry;
  const isCriticalFiltered = filters.risk_tier?.toLowerCase() === "critical";
  const isHighFiltered = filters.risk_tier?.toLowerCase() === "high";
  const isMediumFiltered = filters.risk_tier?.toLowerCase() === "medium";
  const isLowFiltered = filters.risk_tier?.toLowerCase() === "low";
  const isDelayedFiltered = filters.delayed === "true" || filters.delayed === "1" || filters.delayed === "yes";

  const criticalTotal = summary?.critical_count ?? 141;
  const highTotal = summary?.high_count ?? 1256;
  const mediumTotal = summary?.medium_count ?? 521;
  const lowTotal = summary?.low_count ?? 63;
  const delayedTotal = summary?.total_delayed_count ?? 1805;
  const allTotal = summary?.total_projects ?? 1981;

  const totalEstimate = isCriticalFiltered ? criticalTotal
    : isHighFiltered ? highTotal
    : isMediumFiltered ? mediumTotal
    : isLowFiltered ? lowTotal
    : isDelayedFiltered ? delayedTotal
    : allTotal;

  const pageTitle = isSectorFiltered
    ? `${filters.sector} Sector Projects`
    : isMinistryFiltered
    ? `${filters.ministry} Portfolio`
    : isDelayedFiltered
    ? "Delayed Infrastructure Projects"
    : isCriticalFiltered
    ? "Critical Risk Projects"
    : isHighFiltered
    ? "High Risk Projects"
    : isMediumFiltered
    ? "Medium Risk Projects"
    : isLowFiltered
    ? "Low Risk Projects"
    : "Project Risk Matrix";

  const pageSubtitle = isSectorFiltered
    ? `Viewing monitored central sector projects under ${filters.sector} · MoSPI April 2026 Baseline`
    : isMinistryFiltered
    ? `Viewing monitored central sector projects under ${filters.ministry} · MoSPI April 2026 Baseline`
    : isDelayedFiltered
    ? `${delayedTotal} Delayed Projects · Schedule Delay Probability > 50% · MoSPI April 2026 Baseline`
    : isCriticalFiltered
    ? `${criticalTotal} Critical Risk Projects · Require Immediate Intervention · MoSPI April 2026 Baseline`
    : isHighFiltered
    ? `${highTotal} High Risk Projects · MoSPI April 2026 Baseline`
    : isMediumFiltered
    ? `${mediumTotal} Medium Risk Projects · MoSPI April 2026 Baseline`
    : isLowFiltered
    ? `${lowTotal} Low Risk Projects · MoSPI April 2026 Baseline`
    : `Filterable risk matrix · ${allTotal.toLocaleString()} central sector projects · MoSPI April 2026 Baseline`;

  return (
    <div>
      <TopBar
        title={pageTitle}
        subtitle={pageSubtitle}
      />
      <div className="responsive-container">
        {/* Delayed Projects Banner if filtered */}
        {isDelayedFiltered && (
          <div
            style={{
              marginBottom: 16,
              padding: "14px 20px",
              background: "rgba(168, 85, 247, 0.08)",
              border: "1px solid rgba(168, 85, 247, 0.28)",
              borderRadius: "var(--radius-lg, 12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              boxShadow: "0 4px 16px rgba(168, 85, 247, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "rgba(168, 85, 247, 0.16)",
                  border: "1px solid rgba(168, 85, 247, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#a855f7",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#a855f7", letterSpacing: "0.02em" }}>
                  Viewing {delayedTotal} Delayed Infrastructure Projects (MoSPI April 2026 Baseline)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Showing central sector projects with delay probability exceeding 50% or documented timeline slippage against original commissioning milestones.
                </div>
              </div>
            </div>
            <button
              onClick={() => handleFilterChange({ ...filters, delayed: undefined })}
              className="btn btn-sm"
              style={{
                background: "rgba(168, 85, 247, 0.16)",
                border: "1px solid rgba(168, 85, 247, 0.35)",
                color: "#a855f7",
                fontWeight: 600,
                fontSize: 12,
                whiteSpace: "nowrap",
                cursor: "pointer",
                padding: "6px 14px",
              }}
            >
              Clear Filter (Show All {allTotal.toLocaleString()})
            </button>
          </div>
        )}

        {/* Critical Risk Banner if filtered */}
        {isCriticalFiltered && !isDelayedFiltered && (
          <div
            style={{
              marginBottom: 16,
              padding: "14px 20px",
              background: "rgba(244, 63, 94, 0.08)",
              border: "1px solid rgba(244, 63, 94, 0.28)",
              borderRadius: "var(--radius-lg, 12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              boxShadow: "0 4px 16px rgba(244, 63, 94, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "rgba(244, 63, 94, 0.16)",
                  border: "1px solid rgba(244, 63, 94, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f43f5e",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f43f5e", letterSpacing: "0.02em" }}>
                  Viewing {criticalTotal} Critical Risk Projects
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  These projects exhibit high probability of multi-year delay and severe cost escalation, requiring immediate ministry intervention.
                </div>
              </div>
            </div>
            <button
              onClick={() => handleFilterChange({ ...filters, risk_tier: undefined })}
              className="btn btn-sm"
              style={{
                background: "rgba(244, 63, 94, 0.16)",
                border: "1px solid rgba(244, 63, 94, 0.35)",
                color: "#f43f5e",
                fontWeight: 600,
                fontSize: 12,
                whiteSpace: "nowrap",
                cursor: "pointer",
                padding: "6px 14px",
              }}
            >
              Clear Filter (Show All {allTotal.toLocaleString()})
            </button>
          </div>
        )}

        {/* Sector Filter Banner if filtered */}
        {isSectorFiltered && (
          <div
            style={{
              marginBottom: 16,
              padding: "14px 20px",
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.28)",
              borderRadius: "var(--radius-lg, 12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              boxShadow: "0 4px 16px rgba(56, 189, 248, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "rgba(56, 189, 248, 0.16)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#38bdf8",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h18M3 9h18M3 15h18M3 21h18M9 3v18M15 3v18"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", letterSpacing: "0.02em" }}>
                  Active Sector Filter: {filters.sector}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Displaying central sector infrastructure projects filtered for {filters.sector}.
                </div>
              </div>
            </div>
            <button
              onClick={() => handleFilterChange({ ...filters, sector: undefined })}
              className="btn btn-sm"
              style={{
                background: "rgba(56, 189, 248, 0.16)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                color: "#38bdf8",
                fontWeight: 600,
                fontSize: 12,
                whiteSpace: "nowrap",
                cursor: "pointer",
                padding: "6px 14px",
              }}
            >
              Clear Sector Filter
            </button>
          </div>
        )}

        <div className="card" style={{ marginBottom: 16, padding: "16px 20px" }}>
          <ProjectFilters filters={filters} onChange={handleFilterChange} />
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              background: "var(--surface-2)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
              }}
            >
              {isSectorFiltered
                ? `${filters.sector} Projects List`
                : isMinistryFiltered
                ? `${filters.ministry} Portfolio`
                : isDelayedFiltered
                ? "Delayed Projects List"
                : isCriticalFiltered
                ? "Critical Portfolio Projects"
                : "All Projects"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={exportCSV}
                className="btn"
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  background: "var(--surface)",
                  border: "1px solid var(--border-2)",
                  color: "var(--text)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                ↓ Export Matrix (CSV)
              </button>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                {loading
                  ? "Loading…"
                  : isSectorFiltered
                  ? `Showing ${projects.length} Projects in ${filters.sector}`
                  : isMinistryFiltered
                  ? `Showing ${projects.length} Projects in ${filters.ministry}`
                  : isDelayedFiltered
                  ? `Showing ${page * pageSize + 1}–${page * pageSize + projects.length} of ${delayedTotal} Delayed Projects`
                  : isCriticalFiltered
                  ? `Showing ${page * pageSize + 1}–${page * pageSize + projects.length} of ${criticalTotal} Critical Projects`
                  : isHighFiltered
                  ? `Showing ${page * pageSize + 1}–${page * pageSize + projects.length} of ${highTotal} High Risk Projects`
                  : isMediumFiltered
                  ? `Showing ${page * pageSize + 1}–${page * pageSize + projects.length} of ${mediumTotal} Medium Risk Projects`
                  : isLowFiltered
                  ? `Showing ${page * pageSize + 1}–${page * pageSize + projects.length} of ${lowTotal} Low Risk Projects`
                  : `Showing ${page * pageSize + 1}–${page * pageSize + projects.length} of ${allTotal.toLocaleString()} Projects`}
              </div>
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <ProjectTable projects={projects} loading={loading} />
          </div>

          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              background: "var(--surface-2)",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Page {page + 1} of {Math.ceil(totalEstimate / pageSize)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="btn btn-sm"
                style={{ opacity: page === 0 ? 0.5 : 1, cursor: page === 0 ? "not-allowed" : "pointer" }}
              >
                &larr; Previous
              </button>
              <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
                {page + 1}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={projects.length < pageSize || loading || (page + 1) * pageSize >= totalEstimate}
                className="btn btn-sm"
                style={{
                  opacity: projects.length < pageSize || (page + 1) * pageSize >= totalEstimate ? 0.5 : 1,
                  cursor: projects.length < pageSize ? "not-allowed" : "pointer",
                }}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "var(--text-muted)" }}>Loading projects...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
