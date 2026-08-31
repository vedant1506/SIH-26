"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { RiskPrediction } from "@/lib/types";
import { format } from "date-fns";

export default function RiskTrendChart({ predictions }: { predictions: RiskPrediction[] }) {
  if (!predictions || predictions.length < 2) {
    return <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: 40 }}>Need at least 2 predictions to show trend</div>;
  }
  const data = [...predictions].reverse().map(p => ({
    date: format(new Date(p.predicted_at), "MMM yy"),
    score: Math.round(p.composite_risk_score * 100),
    tier: p.risk_tier,
  }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip
          formatter={(val) => [`${val}%`, "Risk Score"]}
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-2)", borderRadius: 8, fontSize: 12, color: "var(--text)", boxShadow: "var(--shadow)" }}
          itemStyle={{ color: "var(--text)" }}
          labelStyle={{ color: "var(--text-muted)" }}
        />
        <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ fill: "var(--accent)", r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
