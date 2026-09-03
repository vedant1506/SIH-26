"use client";
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, LabelList, CartesianGrid } from "recharts";
import type { PortfolioSummary } from "@/lib/types";
import Link from "next/link";

const TIERS = [
  { key: "critical_count", tier: "critical", label: "Critical", color: "#f43f5e", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.25)", action: "Immediate Escalation" },
  { key: "high_count",     tier: "high",     label: "High",     color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", action: "Active Slippage" },
  { key: "medium_count",   tier: "medium",   label: "Medium",   color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", action: "Watchlist Monitoring" },
  { key: "low_count",      tier: "low",      label: "Low",      color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", action: "On-Track Safe" },
];

export default function RiskDistribution({ summary }: { summary: PortfolioSummary }) {
  const total = summary.total_projects || (summary.critical_count + summary.high_count + summary.medium_count + summary.low_count) || 1;

  const data = TIERS.map(t => {
    const val = (summary[t.key as keyof PortfolioSummary] as number) || 0;
    const pct = ((val / total) * 100).toFixed(1);
    return {
      name: t.label,
      tier: t.tier,
      value: val,
      pct: `${pct}%`,
      color: t.color,
      bg: t.bg,
      border: t.border,
      action: t.action,
    };
  });

  if (data.every(d => d.value === 0)) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 40 }}>
        No prediction data yet
      </div>
    );
  }

  // Custom label renderer on top of each bar
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === undefined || value === null) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#f8fafc"
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fontFamily="var(--font-geist-mono), monospace"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  const elevatedPct = ((((summary.critical_count || 0) + (summary.high_count || 0)) / total) * 100).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1 }}>
      {/* Visual Bar Chart - Expands to fill available vertical space with zero dead gap */}
      <div style={{ flex: 1, minHeight: 280, width: "100%", position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 28, right: 16, left: 16, bottom: 8 }}>
            <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
              dy={8}
            />
            <YAxis hide domain={[0, "dataMax + 140"]} />
            <Tooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div style={{
                      background: "rgba(15, 23, 42, 0.95)",
                      backdropFilter: "blur(12px)",
                      border: `1px solid ${d.border}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{d.name} Risk</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: d.color }}>
                        {d.value.toLocaleString()} Projects ({d.pct})
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{d.action}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 4, 4]} barSize={48}>
              <LabelList dataKey="value" content={renderCustomBarLabel} />
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.color}
                  style={{
                    filter: `drop-shadow(0 0 16px ${d.color}66)`,
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Portfolio Risk Composition Ribbon bridging the chart to the metrics */}
      <div style={{ margin: "14px 0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Portfolio Risk Ratio</span>
          <span style={{ color: "var(--critical)", fontWeight: 700 }}>
            {elevatedPct}% High + Critical Exposure
          </span>
        </div>
        <div style={{ width: "100%", height: 7, borderRadius: 999, background: "var(--surface-2)", display: "flex", overflow: "hidden", gap: 2 }}>
          <div style={{ width: `${((summary.critical_count || 0) / total) * 100}%`, background: "#f43f5e", borderRadius: "999px 0 0 999px" }} title={`Critical: ${summary.critical_count}`} />
          <div style={{ width: `${((summary.high_count || 0) / total) * 100}%`, background: "#f59e0b" }} title={`High: ${summary.high_count}`} />
          <div style={{ width: `${((summary.medium_count || 0) / total) * 100}%`, background: "#3b82f6" }} title={`Medium: ${summary.medium_count}`} />
          <div style={{ width: `${((summary.low_count || 0) / total) * 100}%`, background: "#10b981", borderRadius: "0 999px 999px 0" }} title={`Low: ${summary.low_count}`} />
        </div>
      </div>

      {/* Structured Tier Cards Grid filling the bottom formation */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
        paddingTop: 12,
        borderTop: "1px solid var(--border)",
      }}>
        {data.map((d) => (
          <Link
            key={d.tier}
            href={`/projects?risk_tier=${d.tier}`}
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "10px 10px 8px",
              borderRadius: 8,
              background: d.bg,
              border: `1px solid ${d.border}`,
              textDecoration: "none",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: d.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {d.name}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>
                {d.pct}
              </span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", fontFamily: "var(--font-geist-mono), monospace" }}>
              {d.value.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {d.action}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
