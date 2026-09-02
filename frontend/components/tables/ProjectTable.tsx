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
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                  </svg>
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
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                      <RiskBadge tier={p.risk_tier} suffix={p.composite_risk_score != null ? ` (${(p.composite_risk_score * 100).toFixed(0)}%)` : ""} />
                      {p.delay_probability != null && p.delay_probability > 0.5 && (
                        <span style={{ fontSize: 10, color: "#a855f7", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {(p.delay_probability * 100).toFixed(0)}% delay risk
                        </span>
                      )}
                    </div>
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
