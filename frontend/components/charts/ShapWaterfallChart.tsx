"use client";
import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { SHAPValue } from "@/lib/types";

interface Props {
  values: SHAPValue[];
  baselineScore?: number;
}

export default function ShapWaterfallChart({ values, baselineScore }: Props) {
  const [filterMode, setFilterMode] = useState<"all" | "increasing" | "reducing">("all");

  if (!values || values.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 220,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 10,
          border: "1px dashed var(--border)",
          color: "var(--text-muted)",
          fontSize: 13,
          gap: 8,
        }}
      >
        <span style={{ color: "var(--accent)", display: "flex", alignItems: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </span>
        <span>No SHAP feature attributions generated for this prediction yet.</span>
      </div>
    );
  }

  // Separate drivers into risk increasing and risk reducing
  const increasing = values.filter((v) => v.direction === "positive");
  const reducing = values.filter((v) => v.direction === "negative");

  // Filtered dataset
  const filtered = values.filter((v) => {
    if (filterMode === "increasing") return v.direction === "positive";
    if (filterMode === "reducing") return v.direction === "negative";
    return true;
  });

  const chartData = filtered.map((v) => {
    const rawVal = typeof v.value === "number" ? v.value : parseFloat(String(v.value)) || 0;
    const signedVal = v.direction === "positive" ? Math.abs(rawVal) : -Math.abs(rawVal);
    return {
      feature: v.feature,
      label: v.label || v.feature.replace(/_/g, " "),
      shortLabel: v.label.length > 40 ? v.label.slice(0, 38) + "…" : v.label,
      value: signedVal,
      absVal: Math.abs(rawVal),
      direction: v.direction,
      impactPct: (Math.abs(rawVal) * 100).toFixed(1),
    };
  }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  // Top positive driver
  const topRiskDriver = increasing.length > 0 ? increasing[0] : null;
  // Top dampener
  const topDampener = reducing.length > 0 ? reducing[0] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header Controls & Filter Pills */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: "#f43f5e",
                display: "inline-block",
              }}
            />
            <strong style={{ color: "#f43f5e" }}>+{increasing.length}</strong> Risk Escalators
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: "#10b981",
                display: "inline-block",
              }}
            />
            <strong style={{ color: "#10b981" }}>-{reducing.length}</strong> Risk Dampeners
          </span>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.05)",
            padding: "2px 4px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            fontSize: 11,
          }}
        >
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              border: "none",
              background: filterMode === "all" ? "var(--accent)" : "transparent",
              color: filterMode === "all" ? "#fff" : "var(--text-muted)",
              cursor: "pointer",
              fontWeight: filterMode === "all" ? 600 : 400,
            }}
          >
            All ({values.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("increasing")}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              border: "none",
              background: filterMode === "increasing" ? "#f43f5e" : "transparent",
              color: filterMode === "increasing" ? "#fff" : "var(--text-muted)",
              cursor: "pointer",
              fontWeight: filterMode === "increasing" ? 600 : 400,
            }}
          >
            Risks ({increasing.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("reducing")}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              border: "none",
              background: filterMode === "reducing" ? "#10b981" : "transparent",
              color: filterMode === "reducing" ? "#fff" : "var(--text-muted)",
              cursor: "pointer",
              fontWeight: filterMode === "reducing" ? 600 : 400,
            }}
          >
            Dampeners ({reducing.length})
          </button>
        </div>
      </div>

      {/* Main Bar Chart */}
      <div style={{ width: "100%", height: Math.max(190, chartData.length * 44) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: 30, top: 8, bottom: 8 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(0)}%`}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="shortLabel"
              width={260}
              tick={{ fill: "var(--text)", fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(val, _name, item) => [
                `${item?.payload?.direction === "positive" ? "+" : "-"}${item?.payload?.impactPct}% risk weight (${item?.payload?.direction === "positive" ? "Risk Escalator" : "Risk Dampener"})`,
                "TreeSHAP Impact",
              ]}
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.label || ""}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--text)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
            <Bar dataKey="value" radius={[4, 4, 4, 4]} maxBarSize={20}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.direction === "positive" ? "#f43f5e" : "#10b981"}
                  fillOpacity={0.88}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Key Insights Summary Box */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--text)" }}>
          <span style={{ color: "#facc15", display: "inline-flex", alignItems: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
            </svg>
          </span>
          <span>SHAP Attribution Executive Takeaway:</span>
        </div>
        <div>
          {topRiskDriver ? (
            <span>
              Primary risk catalyst is <strong style={{ color: "#f43f5e" }}>{topRiskDriver.label}</strong> (+{(topRiskDriver.value * 100).toFixed(1)}% push towards delay).
            </span>
          ) : (
            <span>No significant negative risk factors identified for this asset.</span>
          )}
          {topDampener && (
            <span style={{ marginLeft: 6 }}>
              Offset partially by <strong style={{ color: "#10b981" }}>{topDampener.label}</strong> (-{(Math.abs(topDampener.value) * 100).toFixed(1)}%).
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
