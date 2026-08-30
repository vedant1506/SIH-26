"use client";
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { PortfolioSummary } from "@/lib/types";

const TIERS = [
  { key: "critical_count", label: "Critical", color: "#f43f5e" },
  { key: "high_count",     label: "High",     color: "#f59e0b" },
  { key: "medium_count",   label: "Medium",   color: "#3b82f6" },
  { key: "low_count",      label: "Low",      color: "#10b981" },
];

export default function RiskDistribution({ summary }: { summary: PortfolioSummary }) {
  const data = TIERS.map(t => ({ name: t.label, value: summary[t.key as keyof PortfolioSummary] as number, color: t.color }));
  
  if (data.every(d => d.value === 0)) return <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 40 }}>No prediction data yet</div>;
  
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        {/* Anti-Gravity Data Suspension: No grids, no axis lines, no ticks */}
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--text-sub)", fontSize: 11, fontWeight: 500 }} />
        <YAxis axisLine={false} tickLine={false} tick={false} />
        <Tooltip
          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
          contentStyle={{ background: "var(--surface)", backdropFilter: "blur(12px)", border: "1px solid var(--border-2)", borderRadius: 8, fontSize: 12, color: "var(--text)", boxShadow: "var(--shadow)" }}
          itemStyle={{ color: "var(--text)" }}
        />
        <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={40}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} style={{ filter: `drop-shadow(0 0 12px ${d.color}66)` }} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
