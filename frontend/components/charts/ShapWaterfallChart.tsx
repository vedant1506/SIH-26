"use client";
import React, { useState, useEffect } from "react";
import type { SHAPValue } from "@/lib/types";

interface Props {
  values: SHAPValue[];
  baselineScore?: number;
  riskTier?: string | null;
  modelVersion?: string | null;
}

// ── Feature Metadata & Plain Language Configuration ───────────
interface FeatureMeta {
  title: string;
  shortTitle: string;
  category: "Schedule" | "Financial" | "Physical" | "Cost" | "General";
  categoryColor: string;
  icon: (color: string) => React.ReactNode;
  formatMetric: (v: SHAPValue) => { valueText: string; statusBadge: string; statusColor: string };
  explainPositive: (v: SHAPValue) => {
    whatHappened: string;
    riskImpact: string;
    actionAdvice: string;
  };
  explainNegative: (v: SHAPValue) => {
    whatHappened: string;
    riskImpact: string;
    actionAdvice: string;
  };
}

const FEATURE_CATALOG: Record<string, FeatureMeta> = {
  time_elapsed_ratio: {
    title: "Scheduled Timeline Elapsed",
    shortTitle: "Timeline Elapsed",
    category: "Schedule",
    categoryColor: "#f59e0b",
    icon: (color) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    formatMetric: (v) => {
      const ratio = v.feature_value != null ? Number(v.feature_value) : null;
      if (ratio == null) return { valueText: v.label, statusBadge: "Timeline Data", statusColor: "#94a3b8" };
      const pct = (ratio * 100).toFixed(1);
      if (ratio >= 1.0) {
        return { valueText: `${pct}% of timeline elapsed`, statusBadge: `OVERDUE (+${((ratio - 1) * 100).toFixed(0)}% past deadline)`, statusColor: "#f43f5e" };
      } else if (ratio >= 0.85) {
        return { valueText: `${pct}% of timeline elapsed`, statusBadge: "CRITICAL RUNWAY (<15% remaining)", statusColor: "#f97316" };
      } else if (ratio >= 0.50) {
        return { valueText: `${pct}% of timeline elapsed`, statusBadge: "ADVANCED STAGE", statusColor: "#eab308" };
      }
      return { valueText: `${pct}% of timeline elapsed`, statusBadge: "EARLY / MID STAGE", statusColor: "#10b981" };
    },
    explainPositive: (v) => {
      const ratio = v.feature_value != null ? Number(v.feature_value) : 1.0;
      const isPastDeadline = ratio >= 1.0;
      return {
        whatHappened: isPastDeadline
          ? `The project has consumed ${(ratio * 100).toFixed(1)}% of its scheduled timeframe — meaning its contractual completion deadline has officially passed while construction remains unfinished.`
          : `A substantial portion (${(ratio * 100).toFixed(1)}%) of the scheduled project window has elapsed, leaving very little buffer for remaining civil works.`,
        riskImpact: "When a project operates beyond or near its completion deadline, delay costs compound rapidly due to contractor standby claims, prolonged PMU overhead, and inflation of input materials.",
        actionAdvice: "Mandate an emergency review with the nodal Ministry to execute an approved revised completion baseline and impose contractual delivery milestones.",
      };
    },
    explainNegative: (v) => {
      const ratio = v.feature_value != null ? Number(v.feature_value) : 0.3;
      return {
        whatHappened: `Only ${(ratio * 100).toFixed(1)}% of the sanctioned project schedule has been consumed to date.`,
        riskImpact: "Adequate schedule buffer remains, providing the project team operational runway to overcome site-level bottlenecks without immediate breach of the final delivery date.",
        actionAdvice: "Front-load critical path activities, environmental clearances, and right-of-way handovers while schedule buffer is abundant.",
      };
    },
  },

  schedule_performance_index: {
    title: "Schedule Performance Index (SPI)",
    shortTitle: "Execution Velocity (SPI)",
    category: "Schedule",
    categoryColor: "#3b82f6",
    icon: (color) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4" />
        <path d="m4.93 4.93 2.83 2.83" />
        <path d="M2 12h4" />
        <path d="m4.93 19.07 2.83-2.83" />
        <path d="M12 18v4" />
        <path d="m19.07 19.07-2.83-2.83" />
        <path d="M18 12h4" />
        <path d="m19.07 4.93-2.83 2.83" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    formatMetric: (v) => {
      const spi = v.feature_value != null ? Number(v.feature_value) : null;
      if (spi == null) return { valueText: v.label, statusBadge: "SPI Assessment", statusColor: "#94a3b8" };
      if (spi < 0.10) {
        return { valueText: `SPI: ${spi.toFixed(3)}`, statusBadge: "CRITICAL STAGNATION (<10% required pace)", statusColor: "#f43f5e" };
      } else if (spi < 0.50) {
        return { valueText: `SPI: ${spi.toFixed(3)}`, statusBadge: `SEVERE SCHEDULE DEFICIT (${((1 - spi) * 100).toFixed(0)}% lag)`, statusColor: "#f43f5e" };
      } else if (spi < 0.80) {
        return { valueText: `SPI: ${spi.toFixed(3)}`, statusBadge: `BEHIND SCHEDULE (${((1 - spi) * 100).toFixed(0)}% lag)`, statusColor: "#f97316" };
      } else if (spi < 1.0) {
        return { valueText: `SPI: ${spi.toFixed(3)}`, statusBadge: "SLIGHT SCHEDULE LAG", statusColor: "#eab308" };
      }
      return { valueText: `SPI: ${spi.toFixed(3)}`, statusBadge: "ON / AHEAD OF SCHEDULE", statusColor: "#10b981" };
    },
    explainPositive: (v) => {
      const spi = v.feature_value != null ? Number(v.feature_value) : 0.5;
      const deliverVal = (spi * 100).toFixed(0);
      return {
        whatHappened: `The project has an SPI of ${spi.toFixed(3)}. In project economics, for every ₹100 of work that was planned to be finished by today, only ~₹${deliverVal} of physical output has actually been delivered.`,
        riskImpact: spi < 0.10
          ? "SPI below 0.10 indicates acute paralysis or site stagnation. The project is effectively dormant while administrative clock ticks."
          : "Work output pace is lagging significantly behind the planned baseline, creating a massive delivery backlog that will inevitably cause target date slippage.",
        actionAdvice: "Conduct a joint site inspection with the PMC to diagnose primary work stoppers (utility shifting, land encumbrances, or contractor liquidity shortages).",
      };
    },
    explainNegative: (v) => {
      const spi = v.feature_value != null ? Number(v.feature_value) : 1.0;
      return {
        whatHappened: `The project maintains a healthy SPI of ${spi.toFixed(3)}, indicating on-ground progress closely mirrors or leads the planned project trajectory.`,
        riskImpact: "Consistent work delivery velocity dampens project uncertainty and significantly protects against cost and time overruns.",
        actionAdvice: "Ensure uninterrupted release of running account bills so the contractor can sustain this delivery momentum.",
      };
    },
  },

  burn_progress_gap: {
    title: "Financial Burn vs Physical Work Gap",
    shortTitle: "Burn vs Work Gap",
    category: "Financial",
    categoryColor: "#06b6d4",
    icon: (color) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    formatMetric: (v) => {
      const gap = v.feature_value != null ? Number(v.feature_value) : null;
      if (gap == null) return { valueText: v.label, statusBadge: "Financial Metric", statusColor: "#94a3b8" };
      const absGap = Math.abs(gap).toFixed(1);
      if (gap > 15) {
        return { valueText: `Expenditure is ${absGap}% ahead of physical work`, statusBadge: "OVERSPENDING RISK (Cash ahead of physical output)", statusColor: "#f43f5e" };
      } else if (gap > 5) {
        return { valueText: `Expenditure is ${absGap}% ahead of physical work`, statusBadge: "MODERATE FISCAL LEAD", statusColor: "#f97316" };
      } else if (gap < -15) {
        return { valueText: `Expenditure is ${absGap}% slower than physical progress`, statusBadge: "STALLED BILLING / UNPAID INVOICES", statusColor: "#eab308" };
      } else if (gap < -5) {
        return { valueText: `Expenditure is ${absGap}% slower than physical progress`, statusBadge: "CONSERVATIVE EXPENDITURE", statusColor: "#10b981" };
      }
      return { valueText: "Expenditure aligned with physical progress", statusBadge: "BALANCED SPENDING", statusColor: "#10b981" };
    },
    explainPositive: (v) => {
      const gap = v.feature_value != null ? Math.abs(Number(v.feature_value)).toFixed(1) : "significant";
      return {
        whatHappened: `Cumulative money spent is ${gap}% higher than the physical percentage of work executed on site.`,
        riskImpact: "Capital is leaving the treasury faster than tangible infrastructure is materializing. This is a classic indicator of unearned contractor advances, inflated billing, or poor construction productivity.",
        actionAdvice: "Freeze advance disbursements. Direct the Chief Vigilance/Audit officer to reconcile the physical Measurement Book (MB) with all released payments.",
      };
    },
    explainNegative: (v) => {
      const gap = v.feature_value != null ? Math.abs(Number(v.feature_value)).toFixed(1) : "contained";
      return {
        whatHappened: `Cumulative spending is ${gap}% lower than or well-aligned with certified physical progress.`,
        riskImpact: "The project is not bleeding capital ahead of work completion. Treasury exposure is protected against premature contractor fund absorption.",
        actionAdvice: "Verify that running bills are being vetted and paid on time to prevent contractor cashflow starvation from triggering site slowdowns.",
      };
    },
  },

  physical_progress_pct: {
    title: "Physical Construction Progress",
    shortTitle: "Physical Progress",
    category: "Physical",
    categoryColor: "#10b981",
    icon: (color) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4" />
        <path d="M10 10h4" />
        <path d="M10 14h4" />
        <path d="M10 18h4" />
      </svg>
    ),
    formatMetric: (v) => {
      const p = v.feature_value != null ? Number(v.feature_value) : null;
      if (p == null) return { valueText: v.label, statusBadge: "Physical Status", statusColor: "#94a3b8" };
      if (p >= 80) {
        return { valueText: `${p.toFixed(1)}% physical completion`, statusBadge: "FINAL COMMISSIONING STAGE", statusColor: "#10b981" };
      } else if (p >= 50) {
        return { valueText: `${p.toFixed(1)}% physical completion`, statusBadge: "ADVANCED CIVIL EXECUTION", statusColor: "#06b6d4" };
      } else if (p >= 20) {
        return { valueText: `${p.toFixed(1)}% physical completion`, statusBadge: "INTERMEDIATE PROGRESS", statusColor: "#eab308" };
      }
      return { valueText: `${p.toFixed(1)}% physical completion`, statusBadge: "EARLY WORK / HIGH EXPOSURE", statusColor: "#f43f5e" };
    },
    explainPositive: (v) => {
      const p = v.feature_value != null ? Number(v.feature_value).toFixed(1) : "low";
      return {
        whatHappened: `Actual physical construction completion is certified at only ${p}%.`,
        riskImpact: "Because the project is still in earlier construction phases, it remains exposed to severe execution risks, subterranean surprises, material cost volatility, and weather halts.",
        actionAdvice: "Enforce daily progress tracking and ensure contractor has mobilized full fleet machinery and required skilled workforce.",
      };
    },
    explainNegative: (v) => {
      const p = v.feature_value != null ? Number(v.feature_value).toFixed(1) : "significant";
      return {
        whatHappened: `Certified physical completion has reached ${p}%.`,
        riskImpact: "Major civil and structural risks are largely behind the project. Substantial physical completion serves as an empirical anchor that strongly stabilizes the AI risk assessment.",
        actionAdvice: "Shift monitoring focus to statutory testing, pre-commissioning protocols, and operational licensing.",
      };
    },
  },

  cost_variation_pct: {
    title: "Sanctioned Cost Variation",
    shortTitle: "Budget Revision",
    category: "Cost",
    categoryColor: "#a855f7",
    icon: (color) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    formatMetric: (v) => {
      const rev = v.feature_value != null ? Number(v.feature_value) : null;
      if (rev == null) return { valueText: v.label, statusBadge: "Budget Variation", statusColor: "#94a3b8" };
      if (rev > 25) {
        return { valueText: `+${rev.toFixed(1)}% budget escalation`, statusBadge: "MAJOR COST OVERRUN (>25% hike)", statusColor: "#f43f5e" };
      } else if (rev > 0) {
        return { valueText: `+${rev.toFixed(1)}% budget escalation`, statusBadge: "APPROVED REVISION", statusColor: "#f97316" };
      }
      return { valueText: "0.0% budget revision", statusBadge: "WITHIN ORIGINAL SANCTION", statusColor: "#10b981" };
    },
    explainPositive: (v) => {
      const rev = v.feature_value != null ? Number(v.feature_value).toFixed(1) : "unspecified";
      return {
        whatHappened: `Approved project cost has undergone an upward revision of +${rev}% above original sanction.`,
        riskImpact: "Budget escalation signals flawed initial DPR estimation, scope expansion, or prolonged contractual disputes that divert public funding and invite scrutiny.",
        actionAdvice: "Freeze scope additions and audit Revised Cost Estimates (RCE) to cap additional financial liabilities.",
      };
    },
    explainNegative: (v) => {
      return {
        whatHappened: "The project has adhered to its original sanctioned budget with zero or negative cost variation.",
        riskImpact: "Fiscal adherence demonstrates sound financial governance, keeping fiscal risk contained and avoiding inter-ministerial expenditure committee hurdles.",
        actionAdvice: "Continue stringent change-order governance to ensure upcoming civil works do not exceed sanctioned limits.",
      };
    },
  },

  burn_rate_pct: {
    title: "Budget Expenditure Utilization Rate",
    shortTitle: "Budget Utilization",
    category: "Financial",
    categoryColor: "#06b6d4",
    icon: (color) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    formatMetric: (v) => {
      const br = v.feature_value != null ? Number(v.feature_value) : null;
      if (br == null) return { valueText: v.label, statusBadge: "Utilization", statusColor: "#94a3b8" };
      return {
        valueText: `${br.toFixed(1)}% budget spent`,
        statusBadge: br > 80 ? "HIGH FISCAL CONSUMPTION" : "MODERATE UTILIZATION",
        statusColor: br > 80 ? "#f97316" : "#10b981",
      };
    },
    explainPositive: (v) => {
      const br = v.feature_value != null ? Number(v.feature_value).toFixed(1) : "High";
      return {
        whatHappened: `${br}% of total sanctioned funds have been expended.`,
        riskImpact: "High fiscal consumption leaves minimal contingency reserves for closing phases.",
        actionAdvice: "Audit remaining project deliverables against remaining sanctioned balance.",
      };
    },
    explainNegative: (v) => {
      const br = v.feature_value != null ? Number(v.feature_value).toFixed(1) : "Moderate";
      return {
        whatHappened: `Budget utilization stands at an orderly ${br}%.`,
        riskImpact: "Fiscal liquidity is preserved to support upcoming milestones.",
        actionAdvice: "Maintain standard quarterly fund drawdown scheduling.",
      };
    },
  },
};

// Fallback for unknown feature keys
function getFeatureMeta(featureKey: string): FeatureMeta {
  if (FEATURE_CATALOG[featureKey]) {
    return FEATURE_CATALOG[featureKey];
  }
  const cleanTitle = featureKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: cleanTitle,
    shortTitle: cleanTitle,
    category: "General",
    categoryColor: "#94a3b8",
    icon: (color) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    formatMetric: (v) => ({
      valueText: v.label || cleanTitle,
      statusBadge: "AI Feature Attribution",
      statusColor: "#94a3b8",
    }),
    explainPositive: (v) => ({
      whatHappened: `The AI attribution engine flagged "${v.label || cleanTitle}" as a contributing risk escalator.`,
      riskImpact: "This parameter exhibits values consistent with project delay or fiscal pressure in our trained historical infrastructure database.",
      actionAdvice: "Review this operational parameter with the resident engineer during the next monthly review.",
    }),
    explainNegative: (v) => ({
      whatHappened: `The metric "${v.label || cleanTitle}" is functioning favorably.`,
      riskImpact: "This parameter demonstrates healthy performance, partially dampening overall composite project risk.",
      actionAdvice: "Sustain current operational practices supporting this metric.",
    }),
  };
}

export default function ShapWaterfallChart({ values, baselineScore, riskTier }: Props) {
  const [filterMode, setFilterMode] = useState<"all" | "increasing" | "reducing">("all");
  const [activeTab, setActiveTab] = useState<"lineByLine" | "compactWaterfall">("compactWaterfall");
  const [allExpanded, setAllExpanded] = useState<boolean>(true);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("prism_shap_tab");
      if (saved === "lineByLine" || saved === "compactWaterfall") {
        setActiveTab(saved);
      }
    } catch (e) {}
  }, []);

  const switchTab = (tab: "lineByLine" | "compactWaterfall") => {
    setActiveTab(tab);
    try {
      localStorage.setItem("prism_shap_tab", tab);
    } catch (e) {}
  };

  if (!values || values.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 240,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 12,
          border: "1px dashed var(--border)",
          color: "var(--text-muted)",
          fontSize: 13,
          gap: 10,
          padding: 24,
        }}
      >
        <div style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(6,182,212,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#06b6d4",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <span style={{ fontWeight: 500 }}>No SHAP Feature Attributions Computed Yet</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Run an AI risk prediction to compute live mathematical risk weight vectors for this project.
        </span>
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

  // Calculate totals and max impact for scaling
  const parsedData = filtered.map((v) => {
    const rawVal = typeof v.value === "number" ? v.value : parseFloat(String(v.value)) || 0;
    const absVal = Math.abs(rawVal);
    const impactPct = (absVal * 100).toFixed(1);
    const meta = getFeatureMeta(v.feature);
    const metricInfo = meta.formatMetric(v);
    const explanation = v.direction === "positive" ? meta.explainPositive(v) : meta.explainNegative(v);

    let severityLabel = "MODERATE IMPACT";
    let severityColor = "#eab308";
    if (absVal >= 0.20) {
      severityLabel = v.direction === "positive" ? "CRITICAL RISK FACTOR" : "STRONG STABILIZING FACTOR";
      severityColor = v.direction === "positive" ? "#f43f5e" : "#10b981";
    } else if (absVal >= 0.10) {
      severityLabel = v.direction === "positive" ? "HIGH RISK FACTOR" : "MODERATE DAMPENER";
      severityColor = v.direction === "positive" ? "#f97316" : "#10b981";
    } else if (absVal < 0.05) {
      severityLabel = "MINOR IMPACT";
      severityColor = "#94a3b8";
    }

    return {
      rawItem: v,
      feature: v.feature,
      meta,
      metricInfo,
      explanation,
      value: v.direction === "positive" ? absVal : -absVal,
      absVal,
      impactPct,
      direction: v.direction,
      severityLabel,
      severityColor,
    };
  }).sort((a, b) => b.absVal - a.absVal);

  // Maximum value for proportional width calculation (at least 0.30 for nice aesthetic proportion)
  const maxAbsVal = Math.max(0.30, ...values.map((v) => Math.abs(typeof v.value === "number" ? v.value : parseFloat(String(v.value)) || 0)));

  // Top positive driver & top dampener
  const topRiskDriver = increasing.length > 0 ? increasing.slice().sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0] : null;
  const topDampener = reducing.length > 0 ? reducing.slice().sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0] : null;

  // Total positive and negative sums
  const totalPositivePct = (increasing.reduce((acc, curr) => acc + Math.abs(curr.value), 0) * 100).toFixed(1);
  const totalNegativePct = (reducing.reduce((acc, curr) => acc + Math.abs(curr.value), 0) * 100).toFixed(1);
  const netDiff = (parseFloat(totalPositivePct) - parseFloat(totalNegativePct)).toFixed(1);
  const netIsPositive = parseFloat(netDiff) >= 0;

  const isLineExpanded = (featureKey: string) => {
    if (expandedMap[featureKey] !== undefined) {
      return expandedMap[featureKey];
    }
    return allExpanded;
  };

  const toggleExpand = (featureKey: string) => {
    setExpandedMap((prev) => {
      const current = isLineExpanded(featureKey);
      return { ...prev, [featureKey]: !current };
    });
  };

  const expandAll = () => {
    setAllExpanded(true);
    setExpandedMap({});
  };

  const collapseAll = () => {
    setAllExpanded(false);
    setExpandedMap({});
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
      {/* ── 1. Top Executive KPI Summary Strip ───────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {/* Card 1: Risk Escalators */}
        <div
          style={{
            background: "rgba(244,63,94,0.06)",
            border: "1px solid rgba(244,63,94,0.22)",
            borderRadius: 10,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(244,63,94,0.15)",
              color: "#f43f5e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Risk Escalators
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#f43f5e", fontFamily: "var(--font-display, inherit)" }}>
                +{increasing.length}
              </span>
              <span style={{ fontSize: 11, color: "#f43f5e", fontWeight: 600 }}>
                (+{totalPositivePct}% upward push)
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Risk Dampeners */}
        <div
          style={{
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.22)",
            borderRadius: 10,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(16,185,129,0.15)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Risk Dampeners
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#10b981", fontFamily: "var(--font-display, inherit)" }}>
                -{reducing.length}
              </span>
              <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>
                (-{totalNegativePct}% risk reduction)
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Top Risk Catalyst */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-2)",
            borderRadius: 10,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(234,179,8,0.12)",
              color: "#eab308",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Primary Risk Driver
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#f8fafc",
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={topRiskDriver?.label || "None"}
            >
              {topRiskDriver ? getFeatureMeta(topRiskDriver.feature).shortTitle : "None"}
              {topRiskDriver && (
                <span style={{ color: "#f43f5e", marginLeft: 4 }}>
                  (+{(Math.abs(topRiskDriver.value) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Net Balance */}
        <div
          style={{
            background: netIsPositive ? "rgba(244,63,94,0.04)" : "rgba(16,185,129,0.04)",
            border: `1px solid ${netIsPositive ? "rgba(244,63,94,0.2)" : "rgba(16,185,129,0.2)"}`,
            borderRadius: 10,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: netIsPositive ? "rgba(244,63,94,0.12)" : "rgba(16,185,129,0.12)",
              color: netIsPositive ? "#f43f5e" : "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Net Attribution Bias
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: netIsPositive ? "#f43f5e" : "#10b981",
                  fontFamily: "var(--font-display, inherit)",
                }}
              >
                {netIsPositive ? `+${netDiff}% Net Escalation` : `${netDiff}% Net Dampening`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Filter & View Switcher Bar ──────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          background: "rgba(255,255,255,0.02)",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
        }}
      >
        {/* Left: Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", marginRight: 4, fontWeight: 500 }}>
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: filterMode === "all" ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: filterMode === "all" ? "rgba(6,182,212,0.15)" : "transparent",
              color: filterMode === "all" ? "#06b6d4" : "var(--text-sub)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: filterMode === "all" ? 600 : 400,
              transition: "all 0.15s ease",
            }}
          >
            All Factors ({values.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("increasing")}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: filterMode === "increasing" ? "1px solid rgba(244,63,94,0.5)" : "1px solid var(--border)",
              background: filterMode === "increasing" ? "rgba(244,63,94,0.15)" : "transparent",
              color: filterMode === "increasing" ? "#f43f5e" : "var(--text-sub)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: filterMode === "increasing" ? 600 : 400,
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f43f5e" }} />
            Risk Escalators ({increasing.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("reducing")}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: filterMode === "reducing" ? "1px solid rgba(16,185,129,0.5)" : "1px solid var(--border)",
              background: filterMode === "reducing" ? "rgba(16,185,129,0.15)" : "transparent",
              color: filterMode === "reducing" ? "#10b981" : "var(--text-sub)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: filterMode === "reducing" ? 600 : 400,
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
            Risk Dampeners ({reducing.length})
          </button>
        </div>

        {/* Right: View Mode Toggle & Expand/Collapse All */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {activeTab === "lineByLine" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <button
                type="button"
                onClick={expandAll}
                style={{
                  background: allExpanded && Object.keys(expandedMap).length === 0 ? "rgba(255,255,255,0.08)" : "transparent",
                  border: "1px solid var(--border-2)",
                  borderRadius: 5,
                  color: allExpanded && Object.keys(expandedMap).length === 0 ? "var(--text)" : "var(--text-sub)",
                  cursor: "pointer",
                  padding: "4px 9px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 500,
                  transition: "all 0.15s ease",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
                Expand all
              </button>
              <button
                type="button"
                onClick={collapseAll}
                style={{
                  background: !allExpanded && Object.keys(expandedMap).length === 0 ? "rgba(255,255,255,0.08)" : "transparent",
                  border: "1px solid var(--border-2)",
                  borderRadius: 5,
                  color: !allExpanded && Object.keys(expandedMap).length === 0 ? "var(--text)" : "var(--text-sub)",
                  cursor: "pointer",
                  padding: "4px 9px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: 500,
                  transition: "all 0.15s ease",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 11 12 6 7 11" />
                  <polyline points="17 18 12 13 7 18" />
                </svg>
                Collapse all
              </button>
            </div>
          )}

          {/* Tab buttons */}
          <div
            style={{
              display: "flex",
              background: "rgba(0,0,0,0.3)",
              padding: 3,
              borderRadius: 6,
              border: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => switchTab("compactWaterfall")}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "none",
                background: activeTab === "compactWaterfall" ? "var(--surface-3)" : "transparent",
                color: activeTab === "compactWaterfall" ? "var(--text)" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: activeTab === "compactWaterfall" ? 600 : 400,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Compact Graph
            </button>
            <button
              type="button"
              onClick={() => switchTab("lineByLine")}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "none",
                background: activeTab === "lineByLine" ? "var(--surface-3)" : "transparent",
                color: activeTab === "lineByLine" ? "var(--text)" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: activeTab === "lineByLine" ? 600 : 400,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Line-by-Line Breakdown
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. LINE-BY-LINE GRAPH BREAKDOWN (PRIMARY USER REQUIREMENT) ── */}
      {activeTab === "lineByLine" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {parsedData.map((item, idx) => {
            const isExpanded = isLineExpanded(item.feature);
            const isEscalator = item.direction === "positive";
            const barPct = Math.min(100, Math.round((item.absVal / maxAbsVal) * 100));

            return (
              <div
                key={item.feature}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-2)",
                  borderRadius: 10,
                  overflow: "hidden",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  borderLeft: `4px solid ${isEscalator ? "#f43f5e" : "#10b981"}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
              >
                {/* ── Header Row of the Line ── */}
                <div
                  onClick={() => toggleExpand(item.feature)}
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    background: "rgba(255,255,255,0.015)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    {/* Left: Line Index, Icon, Title & Metric */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono, monospace)",
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--text-muted)",
                          padding: "2px 7px",
                          borderRadius: 4,
                          letterSpacing: "0.05em",
                        }}
                      >
                        LINE {String(idx + 1).padStart(2, "0")}
                      </span>

                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: isEscalator ? "rgba(244,63,94,0.12)" : "rgba(16,185,129,0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {item.meta.icon(isEscalator ? "#f43f5e" : "#10b981")}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                            {item.meta.title}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: `${item.meta.categoryColor}18`,
                              color: item.meta.categoryColor,
                              letterSpacing: "0.05em",
                            }}
                          >
                            {item.meta.category}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                          Current measurement:{" "}
                          <strong style={{ color: item.metricInfo.statusColor }}>
                            {item.metricInfo.valueText}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Right: Impact Badge & Value Pill */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: isEscalator ? "rgba(244,63,94,0.14)" : "rgba(16,185,129,0.14)",
                          border: `1px solid ${isEscalator ? "rgba(244,63,94,0.3)" : "rgba(16,185,129,0.3)"}`,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: isEscalator ? "#f43f5e" : "#10b981" }}>
                          {isEscalator ? "▲" : "▼"} {isEscalator ? "+" : "-"}{item.impactPct}%
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: isEscalator ? "#fda4af" : "#a7f3d0" }}>
                          {isEscalator ? "Risk Escalator" : "Risk Dampener"}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: `${item.severityColor}18`,
                          color: item.severityColor,
                          border: `1px solid ${item.severityColor}33`,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.severityLabel}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(item.feature);
                        }}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid var(--border-2)",
                          borderRadius: 6,
                          color: "var(--text)",
                          cursor: "pointer",
                          padding: "4px 8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 500,
                          transition: "all 0.15s ease",
                        }}
                        title={isExpanded ? "Collapse explanation" : "Expand explanation"}
                      >
                        <span style={{ fontSize: 11, color: "var(--text-sub)" }}>
                          {isExpanded ? "Hide Details" : "Show Details"}
                        </span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s ease",
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* ── Visual Bar Representation for this specific Line ── */}
                  <div style={{ marginTop: 4 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      <span>Impact Magnitude on Risk Model:</span>
                      <span style={{ fontWeight: 600, color: isEscalator ? "#f43f5e" : "#10b981" }}>
                        {isEscalator ? "+" : "-"}{item.impactPct}% of total prediction weight
                      </span>
                    </div>

                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: 14,
                        background: "rgba(0,0,0,0.35)",
                        borderRadius: 7,
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {/* Grid tick marks */}
                      <div
                        style={{
                          position: "absolute",
                          left: "25%",
                          top: 0,
                          bottom: 0,
                          width: 1,
                          background: "rgba(255,255,255,0.08)",
                          zIndex: 1,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: 0,
                          bottom: 0,
                          width: 1,
                          background: "rgba(255,255,255,0.08)",
                          zIndex: 1,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: "75%",
                          top: 0,
                          bottom: 0,
                          width: 1,
                          background: "rgba(255,255,255,0.08)",
                          zIndex: 1,
                        }}
                      />

                      {/* Bar Fill */}
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${barPct}%`,
                          background: isEscalator
                            ? "linear-gradient(90deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%)"
                            : "linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)",
                          borderRadius: 7,
                          boxShadow: isEscalator ? "0 0 10px rgba(244,63,94,0.4)" : "0 0 10px rgba(16,185,129,0.4)",
                          transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: "#475569",
                        marginTop: 3,
                        padding: "0 2px",
                      }}
                    >
                      <span>0% (Negligible)</span>
                      <span>10% (Moderate)</span>
                      <span>20% (High)</span>
                      <span>30%+ (Critical)</span>
                    </div>
                  </div>
                </div>

                {/* ── Line-by-Line Plain Language Explanation Box ── */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "14px 16px",
                      background: "rgba(0,0,0,0.22)",
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                      {/* Sub-col 1: What this line means */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: "#38bdf8" }}>ℹ️</span> What this line means in reality:
                        </div>
                        <div style={{ color: "#cbd5e1" }}>
                          {item.explanation.whatHappened}
                        </div>
                      </div>

                      {/* Sub-col 2: Why it affects the AI risk score */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: isEscalator ? "#f43f5e" : "#10b981" }}>
                            {isEscalator ? "⚠️" : "🛡️"}
                          </span>{" "}
                          Why the AI model weighted this ({isEscalator ? "+" : "-"}{item.impactPct}%):
                        </div>
                        <div style={{ color: "#cbd5e1" }}>
                          {item.explanation.riskImpact}
                        </div>
                      </div>
                    </div>

                    {/* Action Step for this line */}
                    <div
                      style={{
                        marginTop: 4,
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: isEscalator ? "rgba(244,63,94,0.06)" : "rgba(16,185,129,0.06)",
                        border: `1px solid ${isEscalator ? "rgba(244,63,94,0.2)" : "rgba(16,185,129,0.2)"}`,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <span style={{ color: isEscalator ? "#f43f5e" : "#10b981", fontSize: 14, lineHeight: 1.2 }}>
                        🎯
                      </span>
                      <div style={{ fontSize: 12 }}>
                        <strong style={{ color: isEscalator ? "#fda4af" : "#a7f3d0" }}>
                          Recommended Officer Action:
                        </strong>{" "}
                        <span style={{ color: "#e2e8f0" }}>{item.explanation.actionAdvice}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── 4. COMPACT WATERFALL VIEW (FOR HIGH-LEVEL VISUAL COMPARISON) ── */
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            Relative positive (risk escalation) vs negative (risk mitigation) force applied by each project feature:
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {parsedData.map((item, i) => {
              const isEscalator = item.direction === "positive";
              const barWidthPct = Math.min(100, Math.round((item.absVal / maxAbsVal) * 100));

              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "220px 1fr 90px",
                    alignItems: "center",
                    gap: 14,
                    padding: "8px 0",
                    borderBottom: i < parsedData.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  {/* Label */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: isEscalator ? "#f43f5e" : "#10b981",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={item.meta.title}
                    >
                      {item.meta.shortTitle}
                    </span>
                  </div>

                  {/* Horizontal Bar Track */}
                  <div
                    style={{
                      position: "relative",
                      height: 22,
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: 4,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barWidthPct}%`,
                        background: isEscalator
                          ? "linear-gradient(90deg, rgba(244,63,94,0.7), #f43f5e)"
                          : "linear-gradient(90deg, rgba(16,185,129,0.7), #10b981)",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        paddingRight: 8,
                        transition: "width 0.3s ease",
                      }}
                    >
                      {barWidthPct > 25 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                          {isEscalator ? "+" : "-"}{item.impactPct}%
                        </span>
                      )}
                    </div>

                    {barWidthPct <= 25 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: isEscalator ? "#f43f5e" : "#10b981",
                          marginLeft: 8,
                        }}
                      >
                        {isEscalator ? "+" : "-"}{item.impactPct}%
                      </span>
                    )}
                  </div>

                  {/* Value / Badge */}
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: isEscalator ? "#f43f5e" : "#10b981",
                        background: isEscalator ? "rgba(244,63,94,0.1)" : "rgba(16,185,129,0.1)",
                        padding: "3px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {isEscalator ? "Escalator" : "Dampener"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. Executive Takeaway Box ──────────────────────────────────── */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border-2)",
          borderRadius: 10,
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 13,
          color: "var(--text-sub)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "var(--text)" }}>
          <span style={{ color: "#facc15", display: "inline-flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
            </svg>
          </span>
          <span>Executive Attribution Takeaway:</span>
        </div>
        <div style={{ lineHeight: 1.6, fontSize: 13, color: "#cbd5e1" }}>
          {topRiskDriver ? (
            <span>
              The dominant factor driving project vulnerability is{" "}
              <strong style={{ color: "#f43f5e" }}>
                {getFeatureMeta(topRiskDriver.feature).title}
              </strong>{" "}
              ({topRiskDriver.label}), adding an upward risk pressure of{" "}
              <strong style={{ color: "#f43f5e" }}>
                +{(Math.abs(topRiskDriver.value) * 100).toFixed(1)}%
              </strong>.
            </span>
          ) : (
            <span>No critical risk catalysts detected in this asset.</span>
          )}
          {topDampener && (
            <span style={{ marginLeft: 6 }}>
              This risk is partially offset by{" "}
              <strong style={{ color: "#10b981" }}>
                {getFeatureMeta(topDampener.feature).title}
              </strong>{" "}
              ({topDampener.label}), which dampens the risk score by{" "}
              <strong style={{ color: "#10b981" }}>
                -{(Math.abs(topDampener.value) * 100).toFixed(1)}%
              </strong>.
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
