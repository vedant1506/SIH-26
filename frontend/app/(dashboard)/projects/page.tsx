"use client";
import { useEffect, useState, useCallback } from "react";
import { listProjects } from "@/lib/api";
import type { ProjectListItem } from "@/lib/types";
import TopBar from "@/components/layout/TopBar";
import ProjectFilters from "@/components/tables/ProjectFilters";
import ProjectTable from "@/components/tables/ProjectTable";

interface Filters { ministry?: string; sector?: string; state?: string; risk_tier?: string; project_scale?: string; search?: string; }

export default function ProjectsPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjects({ ...filters, skip: page * pageSize, limit: pageSize });
      setProjects(data);
    } catch { setProjects([]); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 0 on filter change
  useEffect(() => { setPage(0); }, [filters]);

  const exportCSV = () => {
    if (!projects.length) return;
    const headers = ["Project Name", "Ministry", "Sector", "State", "Scale", "Revised Cost (Cr)", "Progress (%)", "Risk Score", "Risk Tier"];
    const rows = projects.map(p => [
      `"${p.project_name?.replace(/"/g, '""')}"`,
      `"${p.ministry}"`,
      `"${p.sector}"`,
      `"${p.state}"`,
      `"${p.project_scale}"`,
      p.revised_cost_cr ?? p.original_cost_cr ?? "",
      p.physical_progress_pct ?? "",
      p.composite_risk_score != null ? (p.composite_risk_score * 100).toFixed(0) : "",
      `"${p.risk_tier}"`
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "risk_matrix_export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <TopBar title="Project Risk Matrix" subtitle="Filterable risk matrix · All central sector infrastructure projects" />
      <div style={{ padding: "24px 24px 32px" }}>
        <div className="card" style={{ marginBottom: 16, padding: "16px 20px" }}>
          <ProjectFilters filters={filters} onChange={setFilters} />
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Projects</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button onClick={exportCSV} className="btn" style={{ fontSize: 12, padding: "4px 12px", background: "var(--surface-2)", border: "1px solid var(--border-2)", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                ↓ Export Matrix (CSV)
              </button>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{loading ? "Loading…" : `${projects.length} results on this page`}</div>
            </div>
          </div>
          <ProjectTable projects={projects} loading={loading} />
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", gap: 24, background: "var(--surface-2)" }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading} className="btn btn-sm" style={{ opacity: page === 0 ? 0.5 : 1 }}>
              &larr; Previous
            </button>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
              Page {page + 1}
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={projects.length < pageSize || loading} className="btn btn-sm" style={{ opacity: projects.length < pageSize ? 0.5 : 1 }}>
              Next &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
