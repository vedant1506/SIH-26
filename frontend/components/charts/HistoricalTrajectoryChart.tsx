"use client";
import React from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceDot,
} from "recharts";
import type { Project, RiskPrediction } from "@/lib/types";

interface Props {
  project: Project;
  prediction?: RiskPrediction | null;
}

export default function HistoricalTrajectoryChart({ project, prediction }: Props) {
  const currentProgress = project.physical_progress_pct ?? 0;
  const timeElapsed = (project.time_elapsed_ratio ?? 0) * 100;
  const originalCost = project.original_cost_cr ?? 100;
  const revisedCost = project.revised_cost_cr ?? originalCost;
  const expenditure = project.cumulative_expenditure_cr ?? ((project.burn_rate_pct ?? 0) * originalCost) / 100;
  const burnRate = project.burn_rate_pct ?? (originalCost > 0 ? (expenditure / originalCost) * 100 : 0);

  // Generate synthetic trajectory milestone points from project timeline
  // Linear scheduled benchmark vs actual curve
  const points = [
    { stage: "Start (0%)", scheduledProgress: 0, actualProgress: 0, plannedSpend: 0, actualSpend: 0 },
    { stage: "Q1 Milestone", scheduledProgress: 25, actualProgress: Math.min(25, currentProgress * 0.4), plannedSpend: 20, actualSpend: Math.min(burnRate * 0.35, 30) },
    { stage: "Mid-Term", scheduledProgress: 50, actualProgress: Math.min(50, currentProgress * 0.75), plannedSpend: 50, actualSpend: Math.min(burnRate * 0.7, 65) },
    { stage: "Current State", scheduledProgress: Math.min(100, Math.round(timeElapsed)), actualProgress: Math.round(currentProgress), plannedSpend: Math.min(100, Math.round(timeElapsed)), actualSpend: Math.round(burnRate) },
    { stage: "Scheduled End", scheduledProgress: 100, actualProgress: null, plannedSpend: 100, actualSpend: null },
  ];

  // If delayed, add projected completion point
  const delayMonths = prediction?.delay_duration_months ?? 0;
  if (delayMonths > 0) {
    points.push({
      stage: `Projected (+${delayMonths.toFixed(0)}m)`,
      scheduledProgress: 100,
      actualProgress: 100,
      plannedSpend: 100,
      actualSpend: Math.round((revisedCost / Math.max(originalCost, 1)) * 100),
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Scheduled Linear Benchmark vs Actual Physical Progress & Expenditure Burn
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 2, background: "#64748b", display: "inline-block" }} /> Scheduled
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 3, background: "#3b82f6", display: "inline-block" }} /> Physical Progress
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 3, background: "#f59e0b", display: "inline-block" }} /> Expenditure Burn
          </span>
        </div>
      </div>

      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.6} />
            <XAxis dataKey="stage" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              domain={[0, Math.max(120, Math.round((revisedCost / Math.max(originalCost, 1)) * 100))]}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
            />
            <Tooltip
              formatter={(val, name) => [
                `${val}%`,
                name === "actualProgress"
                  ? "Physical Progress"
                  : name === "actualSpend"
                  ? "Expenditure Burn"
                  : "Scheduled Plan",
              ]}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--text)",
              }}
            />
            <Line
              type="monotone"
              dataKey="scheduledProgress"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              name="scheduledProgress"
            />
            <Line
              type="monotone"
              dataKey="actualProgress"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: "#3b82f6" }}
              connectNulls={false}
              name="actualProgress"
            />
            <Line
              type="monotone"
              dataKey="actualSpend"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#f59e0b" }}
              connectNulls={false}
              name="actualSpend"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trajectory divergence readout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 10,
          fontSize: 11,
        }}
      >
        <div>
          <span style={{ color: "var(--text-muted)", display: "block" }}>Schedule Divergence</span>
          <strong style={{ color: timeElapsed > currentProgress + 10 ? "#f43f5e" : "#10b981", fontSize: 13 }}>
            {timeElapsed > currentProgress ? `-${(timeElapsed - currentProgress).toFixed(1)}% behind` : "On schedule"}
          </strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)", display: "block" }}>Expenditure vs Progress</span>
          <strong style={{ color: burnRate > currentProgress + 10 ? "#f59e0b" : "#10b981", fontSize: 13 }}>
            {burnRate > currentProgress ? `+${(burnRate - currentProgress).toFixed(1)}% burn gap` : "Optimal burn"}
          </strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)", display: "block" }}>Projected Slippage</span>
          <strong style={{ color: delayMonths > 0 ? "#f43f5e" : "#10b981", fontSize: 13 }}>
            {delayMonths > 0 ? `+${delayMonths.toFixed(1)} Months` : "Zero projected delay"}
          </strong>
        </div>
      </div>
    </div>
  );
}
