"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import type { SHAPValue } from "@/lib/types";

interface Props { values: SHAPValue[]; }

export default function ShapWaterfall({ values }: Props) {
  if (!values || values.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#64748b", fontSize: 13 }}>
        No SHAP values available. Run a prediction first.
      </div>
    );
  }

  const data = values.slice(0, 7).map(v => ({
    label: v.label.length > 42 ? v.label.slice(0, 42) + "…" : v.label,
    value: v.direction === "positive" ? Math.abs(v.value) : -Math.abs(v.value),
    direction: v.direction,
  })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 16, fontSize: 11, color: "#64748b" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f43f5e", display: "inline-block" }} /> Increases risk
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981", display: "inline-block" }} /> Reduces risk
        </span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 4, bottom: 4 }}>
          <XAxis type="number" tickFormatter={v => `${Math.abs(v * 100).toFixed(0)}%`} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={260} tick={{ fill: "var(--text-sub)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(val) => [`${Math.abs(Number(val) * 100).toFixed(1)}% risk impact`, ""]}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-2)", borderRadius: 8, fontSize: 12, color: "var(--text)", boxShadow: "var(--shadow)" }}
            labelStyle={{ color: "var(--text)", fontSize: 12, marginBottom: 4 }}
            itemStyle={{ color: "var(--text)" }}
          />
          <ReferenceLine x={0} stroke="var(--border-2)" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.direction === "positive" ? "#f43f5e" : "#10b981"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
