"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { RiskPrediction } from "@/lib/types";
import { format } from "date-fns";

export default function RiskTrendChart({ predictions }: { predictions: RiskPrediction[] }) {
  if (!predictions || predictions.length < 2) {
    return <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: 40 }}>Need at least 2 predictions to show trend</div>;
  }
  const data = [...predictions].reverse().map(p => ({
    date: format(new Date(p.predicted_at), "MMM d"),
    score: Math.round(p.composite_risk_score * 100),
    tier: p.risk_tier,
  }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip
          formatter={(val) => [`${val}%`, "Risk Score"]}
          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
        />
        <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
