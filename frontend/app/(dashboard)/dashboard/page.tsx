"use client";
import { useEffect, useState } from "react";
import { getPortfolioSummary, listProjects } from "@/lib/api";
import type { PortfolioSummary, ProjectListItem, ProjectFilters } from "@/lib/api";
import TopBar from "@/components/layout/TopBar";
import KpiCard from "@/components/ui/KpiCard";
import RiskDistribution from "@/components/charts/RiskDistribution";
import AlertFeed from "@/components/features/AlertFeed";
import ProjectTable from "@/components/tables/ProjectTable";

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
          <KpiCard label="Total Projects" value={summary?.total_projects ?? "—"} sub="Active central sector projects" color="#06b6d4" loading={loading} />
          <KpiCard 
            label="Critical Risk" 
            value={summary?.critical_count ?? "—"} 
            sub="Require immediate intervention" 
            color="#f43f5e" 
            loading={loading} 
            subBadge={summary && <span style={{ color: "var(--critical)", fontSize: 13, fontWeight: 500 }}>↑ +2</span>} 
          />
          <KpiCard label="Total Exposure" value={summary ? `₹${(summary.total_exposure_cr / 100).toFixed(0)}K Cr` : "—"} sub="High+Critical revised costs" color="#f59e0b" loading={loading} />
          <KpiCard label="Projects Delayed" value={summary?.total_delayed_count ?? "—"} sub={summary?.avg_delay_duration_months ? `Avg ${summary.avg_delay_duration_months}mo delay` : "Delay probability >50%"} color="#a855f7" loading={loading} />
        </div>

        {/* Middle row */}
        <div className="animate-levitate responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24, animationDelay: "150ms" }}>

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 16 }}>Risk Distribution</div>
            {summary ? <RiskDistribution summary={summary} /> : (
              <div style={{ height: 220, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 16, paddingBottom: 24 }}>
                <div className="skeleton animate-pulse" style={{ width: 30, height: "60%" }} />
                <div className="skeleton animate-pulse" style={{ width: 30, height: "85%" }} />
                <div className="skeleton animate-pulse" style={{ width: 30, height: "40%" }} />
                <div className="skeleton animate-pulse" style={{ width: 30, height: "70%" }} />
              </div>
            )}
          </div>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 12 }}>Early Warning Feed</div>
            <AlertFeed maxItems={5} compact />
          </div>
        </div>

        {/* Critical Projects Table */}
        <div className="card animate-levitate" style={{ padding: 0, overflow: "hidden", animationDelay: "300ms" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Critical & High Risk Projects</div>
              <input type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input" style={{ width: 240, padding: "6px 12px", fontSize: 13 }} />
            </div>
            <a href="/projects" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>View all →</a>
          </div>
          <ProjectTable projects={filteredProjects} loading={loading} />
        </div>
      </div>
    </div>
  );
}
