"use client";
import { useEffect, useState } from "react";
import { getPortfolioSummary, listProjects } from "@/lib/api";
import type { ProjectFilters } from "@/lib/api";
import type { PortfolioSummary, ProjectListItem } from "@/lib/types";
import TopBar from "@/components/layout/TopBar";
import KpiCard from "@/components/ui/KpiCard";
import RiskDistribution from "@/components/charts/RiskDistribution";
import AlertFeed from "@/components/features/AlertFeed";
import ProjectTable from "@/components/tables/ProjectTable";

// SVG Icons for KPI Cards
const IconProjects = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const IconAlert = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconRupee = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="18" y2="3"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="6" y1="13" x2="13" y2="21"/><path d="M6 8a6 6 0 010 0h6a3 3 0 010 6H6"/></svg>;
const IconClock = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

export default function DashboardPage() {
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  
  const [summary, setSummary] = useState<any | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      getPortfolioSummary(filters).catch(() => null),
      listProjects({ ...filters, limit: 50 }).catch(() => []),
    ]).then(([s, p]) => {
      if (s) setSummary(s);
      if (p) setProjects(p as any[]);
    }).catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [filters]);

  const status = error ? "error" : loading ? "inferencing" : "synced";
  const filteredProjects = projects.filter(p => ((p.project_name || p.name || "").toLowerCase().includes(searchQuery.toLowerCase())));


  return (
    <div>
      <TopBar 
        title="National Portfolio Command Center" 
        subtitle="Real-time infrastructure risk intelligence · India" 
        status={status}
      />
      <div style={{ padding: "24px 24px 32px" }}>
        
        {/* KPI Cards */}
        <div className="animate-levitate responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24, animationDelay: "0ms" }}>
          <KpiCard
            label="Total Projects"
            value={summary?.total_projects ?? 0}
            sub="Active central sector projects"
            color="#06b6d4"
            loading={loading}
            icon={<IconProjects />}
            href="/projects"
          />
          <KpiCard
            label="Critical Risk"
            value={summary?.critical_count ?? 0}
            sub="Require immediate intervention"
            color="#f43f5e"
            loading={loading}
            icon={<IconAlert />}
            href="/projects?risk_tier=critical"
          />
          <KpiCard
            label="Total Exposure"
            value={summary ? `₹${(summary.total_exposure_cr).toFixed(0)} Cr` : "—"}
            sub="High+Critical revised cost exposure"
            color="#f59e0b"
            loading={loading}
            icon={<IconRupee />}
            href="/projects?risk_tier=high"
          />
          <KpiCard
            label="Projects Delayed"
            value={summary?.total_delayed_count ?? 0}
            sub={summary?.avg_delay_duration_months ? `Avg ${Number(summary.avg_delay_duration_months).toFixed(1)} mo delay` : "Delay probability >50%"}
            color="#a855f7"
            loading={loading}
            icon={<IconClock />}
            href="/projects?delayed=true"
            target="_blank"
          />
        </div>

        {/* Middle row */}
        <div className="animate-levitate responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24, animationDelay: "150ms" }}>

          <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="section-label">Portfolio Risk Distribution</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", background: "var(--surface-2)", padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)" }}>
                {summary?.total_projects ? `${summary.total_projects.toLocaleString()} Projects` : "1,981 Projects"}
              </span>
            </div>
            {summary ? <RiskDistribution summary={summary} /> : (
              <div style={{ height: 280, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16, paddingBottom: 24 }}>
                <div className="skeleton" style={{ width: 40, height: "60%" }} />
                <div className="skeleton" style={{ width: 40, height: "85%" }} />
                <div className="skeleton" style={{ width: 40, height: "40%" }} />
                <div className="skeleton" style={{ width: 40, height: "70%" }} />
              </div>
            )}
          </div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="section-label">Early Warning Feed</div>
              <a href="/alerts" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                View all alerts
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>
            <AlertFeed maxItems={5} compact />
          </div>
        </div>

        {/* Critical Projects Table */}
        <div className="card animate-levitate" style={{ padding: 0, overflow: "hidden", animationDelay: "300ms" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="section-label">Critical &amp; High Risk Projects</div>
              <input type="text" placeholder="Search projects…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input" style={{ width: 220, padding: "6px 12px", fontSize: 12 }} />
            </div>
            <a href="/projects" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>View all
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
          <ProjectTable projects={filteredProjects} loading={loading} />
        </div>
      </div>
    </div>
  );
}
