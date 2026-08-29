"use client";
import { useRouter } from "next/navigation";
import type { ProjectListItem } from "@/lib/types";
import RiskBadge from "@/components/ui/RiskBadge";

interface Props { projects: ProjectListItem[]; loading?: boolean; }

function fmt(n: number | null | undefined, decimals = 0) {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function ProjectTable({ projects, loading }: Props) {
  const router = useRouter();
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead style={{ borderBottom: "1px solid var(--border-2)" }}>
          <tr>
            <th>Project Name</th>
            <th>Ministry</th>
            <th>Location</th>
            <th className="num">Financial Scale</th>
            <th className="num">AI Risk Score</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [...Array(6)].map((_, i) => (
              <tr key={`skel-${i}`}>
                <td colSpan={6}>
                  <div className="skeleton animate-pulse" style={{ height: 32, borderRadius: 4, width: "100%" }} />
                </td>
              </tr>
            ))
          ) : projects.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 32, opacity: 0.5 }}>📂</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>No projects found matching current filters. Try clearing your filters.</span>
                </div>
              </td>
            </tr>
          ) : (
            projects.map(p => (
              <tr
                key={p.id}
                id={`project-row-${p.id}`}
                onClick={() => router.push(`/projects/${p.id}`)}
                style={{ cursor: "pointer" }}
              >
                <td style={{ maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)", fontWeight: 700 }}>
                  {p.project_name}
                </td>
                <td style={{ maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.ministry}</td>
                <td>{p.state}</td>
                <td className="num tabular">
                  {p.revised_cost_cr != null ? `₹${fmt(p.revised_cost_cr, 0)} Cr` : "—"}
                </td>
                <td className="num tabular">
                  {p.risk_tier ? (
                    <RiskBadge tier={p.risk_tier} suffix={p.composite_risk_score != null ? ` (${(p.composite_risk_score * 100).toFixed(0)}%)` : ""} />
                  ) : "—"}
                </td>
                <td className="num tabular" style={{ color: (p.burn_progress_gap ?? 0) > 15 ? "var(--critical)" : "var(--text-sub)" }}>
                  {p.physical_progress_pct != null ? `${p.physical_progress_pct.toFixed(0)}% Done` : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
