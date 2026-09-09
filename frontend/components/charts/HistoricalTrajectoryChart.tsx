"use client";
import React from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  Customized,
} from "recharts";
import type { Project, RiskPrediction } from "@/lib/types";

interface Props {
  project: Project;
  prediction?: RiskPrediction | null;
}

function monthsBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(15,23,42,0.96)",
      border: "1px solid rgba(148,163,184,0.18)",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      minWidth: 170,
    }}>
      <div style={{ color: "#94a3b8", marginBottom: 6, fontSize: 11, fontWeight: 600 }}>
        Timeline: {Number(label).toFixed(1)}% elapsed
      </div>
      {payload.map((p: any) => {
        if (p.value === null || p.value === undefined) return null;
        const labels: Record<string, string> = {
          scheduled: "Scheduled Plan",
          actual: "Physical Progress",
          burn: "Expenditure Burn",
        };
        const colors: Record<string, string> = {
          scheduled: "#64748b",
          actual: "#60a5fa",
          burn: "#fbbf24",
        };
        return (
          <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
            <span style={{ color: colors[p.dataKey] ?? "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[p.dataKey], display: "inline-block" }} />
              {labels[p.dataKey] ?? p.dataKey}
            </span>
            <span style={{ color: "#f1f5f9", fontWeight: 700 }}>{Number(p.value).toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

export default function HistoricalTrajectoryChart({ project, prediction }: Props) {
  const currentProgress = project.physical_progress_pct ?? 0;
  const timeElapsedRatio = project.time_elapsed_ratio ?? 0;
  const timeElapsedPct = timeElapsedRatio * 100;
  const originalCost = project.original_cost_cr ?? 100;
  const revisedCost = project.revised_cost_cr ?? originalCost;
  const expenditure = project.cumulative_expenditure_cr ?? 0;
  const burnRate = project.burn_rate_pct ??
    (revisedCost > 0 ? (expenditure / revisedCost) * 100 : 0);
  const delayMonths = prediction?.delay_duration_months ?? 0;

  const startDate = project.original_start_date;
  const scheduledEnd = project.scheduled_completion_date;

  let totalMonths = 0;
  if (startDate && scheduledEnd) {
    totalMonths = Math.max(monthsBetween(startDate, scheduledEnd), 1);
  }

  let elapsedMonths = totalMonths > 0 ? timeElapsedPct / 100 * totalMonths : 0;
  if (startDate) {
    const ref = new Date("2026-04-01");
    const start = new Date(startDate);
    const derived = (ref.getFullYear() - start.getFullYear()) * 12 + (ref.getMonth() - start.getMonth());
    if (derived > 0) elapsedMonths = derived;
  }

  const projectedExtraElapsed = delayMonths > 0 && totalMonths > 0
    ? ((totalMonths + delayMonths) / totalMonths) * 100
    : timeElapsedPct;

  const xMax = Math.max(112, timeElapsedPct + 8, projectedExtraElapsed + 4);

  const q1X = 25;
  const midX = 50;

  const spi = timeElapsedRatio > 0 ? currentProgress / (timeElapsedRatio * 100) : 1;
  const spiShape = spi > 0.8 ? 1.0 : spi > 0.4 ? 1.5 : spi > 0.1 ? 2.5 : 4.0;

  function actualProgressAt(x: number): number {
    if (timeElapsedPct <= 0 || x <= 0) return 0;
    if (x >= timeElapsedPct) return currentProgress;
    const fraction = x / timeElapsedPct;
    return Math.min(currentProgress, currentProgress * Math.pow(fraction, spiShape));
  }

  function actualBurnAt(x: number): number {
    if (timeElapsedPct <= 0 || x <= 0) return 0;
    if (x >= timeElapsedPct) return burnRate;
    const fraction = x / timeElapsedPct;
    return Math.min(burnRate, burnRate * Math.pow(fraction, Math.max(spiShape * 0.6, 1.0)));
  }

  const xPositions = new Set<number>([0, q1X, midX, Math.round(timeElapsedPct * 10) / 10, 100]);
  for (let x = 10; x <= Math.min(xMax, 100); x += 10) xPositions.add(x);
  if (delayMonths > 0 && totalMonths > 0) {
    xPositions.add(Math.round(projectedExtraElapsed * 10) / 10);
  }
  const sortedX = Array.from(xPositions).sort((a, b) => a - b);

  const data = sortedX.map((x) => {
    const isBeforeCurrent = x <= timeElapsedPct;
    const isAtCurrent = Math.abs(x - timeElapsedPct) < 0.5;
    const isProjected = x > timeElapsedPct && x > 100 && delayMonths > 0;
    return {
      x: Math.round(x * 10) / 10,
      scheduled: x <= 100 ? Math.round(x * 10) / 10 : null,
      actual: isBeforeCurrent || isAtCurrent
        ? Math.round(actualProgressAt(x) * 10) / 10
        : isProjected ? 100 : null,
      burn: isBeforeCurrent || isAtCurrent
        ? Math.round(actualBurnAt(x) * 10) / 10
        : null,
    };
  });

  // Build ticks — filter out values too close together to avoid crowding
  const rawTicks = Array.from(new Set([
    0, q1X, midX, Math.round(timeElapsedPct), 100,
    ...(delayMonths > 0 && totalMonths > 0 ? [Math.round(projectedExtraElapsed)] : [])
  ])).sort((a, b) => a - b);

  // Remove ticks within 6 units of each other (keep lower priority ones)
  const ticks: number[] = [];
  for (const t of rawTicks) {
    if (!ticks.length || t - ticks[ticks.length - 1] >= 6) {
      ticks.push(t);
    }
  }

  function xLabel(val: number): string {
    if (val === 0) return "Start";
    if (val === q1X) return "Q1 · 25%";
    if (val === midX) return "Mid · 50%";
    if (val > 100 && delayMonths > 0) return `+${delayMonths.toFixed(0)}m`;
    if (val === 100) return "End";
    if (Math.abs(val - Math.round(timeElapsedPct)) < 1) return `Now · ${Math.round(timeElapsedPct)}%`;
    return `${val}%`;
  }

  const scheduleDivergence = timeElapsedPct - currentProgress;
  const burnGap = burnRate - currentProgress;

  // SPI color
  const spiColor = spi < 0.10 ? "#f43f5e" : spi < 0.50 ? "#f59e0b" : spi < 0.80 ? "#fbbf24" : "#10b981";
  const spiLabel = spi < 0.10 ? "CRITICAL" : spi < 0.50 ? "Severe" : spi < 0.80 ? "Delayed" : "On Track";

  // Annotation pills rendered above chart via absolute positioning
  const q1Progress = Math.round(actualProgressAt(q1X) * 10) / 10;
  const midProgress = Math.round(actualProgressAt(midX) * 10) / 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Legend row ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8, marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.02em" }}>
          Scheduled Benchmark vs Actual Execution Trajectory
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#94a3b8" }}>
          {[
            { color: "#64748b", dash: true, label: "Scheduled" },
            { color: "#60a5fa", dash: false, label: "Physical Progress" },
            { color: "#fbbf24", dash: false, label: "Expenditure Burn" },
          ].map(({ color, dash, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="20" height="10" style={{ flexShrink: 0 }}>
                {dash
                  ? <line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
                  : <line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth="2.5" />
                }
              </svg>
              <span style={{ color: "#cbd5e1", fontWeight: 500 }}>{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Chart ─────────────────────────────────────────────────────── */}
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 28, left: 4, bottom: 28 }}>
            <defs>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="gradBurn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.10} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="1 4"
              stroke="rgba(148,163,184,0.10)"
              vertical={false}
            />

            <XAxis
              dataKey="x"
              type="number"
              domain={[0, Math.ceil(xMax)]}
              ticks={ticks}
              tickFormatter={xLabel}
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
              axisLine={{ stroke: "rgba(148,163,184,0.15)" }}
              tickLine={{ stroke: "rgba(148,163,184,0.15)" }}
              interval={0}
              height={36}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              domain={[0, 110]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={38}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Scheduled End vertical */}
            <ReferenceLine
              x={100}
              stroke="rgba(100,116,139,0.22)"
              strokeDasharray="4 3"
              label={{
                value: "End",
                position: "insideTopRight",
                fill: "#475569",
                fontSize: 10,
                fontWeight: 600,
                dy: -4,
              }}
            />

            {/* NOW vertical */}
            <ReferenceLine
              x={Math.round(timeElapsedPct * 10) / 10}
              stroke="rgba(148,163,184,0.25)"
              strokeDasharray="3 3"
              label={{
                value: `▼ ${Math.round(timeElapsedPct)}%`,
                position: "insideTopLeft",
                fill: "#94a3b8",
                fontSize: 9,
                fontWeight: 700,
                dy: -4,
                dx: 3,
              }}
            />

            {/* Scheduled benchmark */}
            <Line
              type="linear"
              dataKey="scheduled"
              stroke="#475569"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              name="scheduled"
              connectNulls
              legendType="none"
            />

            {/* Actual progress — area fill + line */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#gradActual)"
              dot={false}
              connectNulls={false}
              name="actual"
              activeDot={{ r: 5, fill: "#60a5fa", stroke: "#1e40af", strokeWidth: 2 }}
              legendType="none"
            />

            {/* Burn rate — area fill + line */}
            <Area
              type="monotone"
              dataKey="burn"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#gradBurn)"
              dot={false}
              connectNulls={false}
              name="burn"
              activeDot={{ r: 5, fill: "#fbbf24", stroke: "#92400e", strokeWidth: 2 }}
              legendType="none"
            />

            {/* Q1 milestone dot (only if project has passed Q1) */}
            {timeElapsedPct > q1X + 2 && (
              <ReferenceDot
                x={q1X}
                y={q1Progress}
                r={4}
                fill="#60a5fa"
                stroke="rgba(15,23,42,0.9)"
                strokeWidth={2}
              />
            )}

            {/* Mid milestone dot */}
            {timeElapsedPct > midX + 2 && (
              <ReferenceDot
                x={midX}
                y={midProgress}
                r={4}
                fill="#60a5fa"
                stroke="rgba(15,23,42,0.9)"
                strokeWidth={2}
              />
            )}

            {/* Current state — progress dot */}
            <ReferenceDot
              x={Math.round(timeElapsedPct * 10) / 10}
              y={Math.round(currentProgress * 10) / 10}
              r={6}
              fill="#3b82f6"
              stroke="rgba(15,23,42,0.9)"
              strokeWidth={2.5}
            />

            {/* Current state — burn dot */}
            <ReferenceDot
              x={Math.round(timeElapsedPct * 10) / 10}
              y={Math.round(burnRate * 10) / 10}
              r={6}
              fill="#f59e0b"
              stroke="rgba(15,23,42,0.9)"
              strokeWidth={2.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Metrics strip ─────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1,
        background: "rgba(148,163,184,0.08)",
        borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.10)",
        overflow: "hidden",
        marginTop: 10,
      }}>
        {/* Schedule Divergence */}
        <div style={{ padding: "12px 16px", background: "rgba(15,23,42,0.6)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", marginBottom: 4 }}>
            Schedule Divergence
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: scheduleDivergence > 10 ? "#f43f5e" : scheduleDivergence > 0 ? "#f59e0b" : "#10b981", marginBottom: 3 }}>
            {scheduleDivergence > 0
              ? `−${scheduleDivergence.toFixed(1)}% behind`
              : scheduleDivergence < -5
              ? `+${Math.abs(scheduleDivergence).toFixed(1)}% ahead`
              : "On schedule"}
          </div>
          <div style={{ fontSize: 10, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
            <span>SPI</span>
            <span style={{
              background: spiColor + "22",
              color: spiColor,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 4,
              fontSize: 10,
              border: `1px solid ${spiColor}44`,
            }}>
              {spi.toFixed(3)} · {spiLabel}
            </span>
          </div>
        </div>

        {/* Expenditure vs Progress */}
        <div style={{ padding: "12px 16px", background: "rgba(15,23,42,0.6)", borderLeft: "1px solid rgba(148,163,184,0.08)", borderRight: "1px solid rgba(148,163,184,0.08)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", marginBottom: 4 }}>
            Expenditure vs Progress
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: burnGap > 15 ? "#f59e0b" : burnGap < -15 ? "#f43f5e" : "#10b981", marginBottom: 3 }}>
            {burnGap > 15 ? `+${burnGap.toFixed(1)}% overspend` : burnGap < -15 ? "Low burn · stagnation" : "Optimal burn"}
          </div>
          <div style={{ fontSize: 10, color: "#475569" }}>
            Burn <span style={{ color: "#fbbf24", fontWeight: 600 }}>{burnRate.toFixed(1)}%</span>
            &nbsp;·&nbsp;
            Progress <span style={{ color: "#60a5fa", fontWeight: 600 }}>{currentProgress.toFixed(1)}%</span>
          </div>
        </div>

        {/* Projected Slippage */}
        <div style={{ padding: "12px 16px", background: "rgba(15,23,42,0.6)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#475569", marginBottom: 4 }}>
            Projected Slippage
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: delayMonths > 12 ? "#f43f5e" : delayMonths > 0 ? "#f59e0b" : "#10b981", marginBottom: 3 }}>
            {delayMonths > 0 ? `+${delayMonths.toFixed(1)} Months` : "Zero delay"}
          </div>
          <div style={{ fontSize: 10, color: "#475569" }}>
            {totalMonths > 0
              ? <><span style={{ color: "#94a3b8", fontWeight: 600 }}>{Math.round(timeElapsedPct)}%</span> of <span style={{ color: "#94a3b8", fontWeight: 600 }}>{totalMonths}m</span> elapsed</>
              : <><span style={{ color: "#94a3b8", fontWeight: 600 }}>{Math.round(timeElapsedPct)}%</span> timeline elapsed</>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
