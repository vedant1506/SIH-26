interface Props {
  burnRate: number | null;
  physicalProgress: number | null;
  gap: number | null;
  timeElapsedRatio?: number | null;
}

const TOOLTIPS: Record<string, string> = {
  burnRate: "Budget Spent (Burn Rate): What % of the total approved money has been paid out so far. Formula: Cumulative Expenditure ÷ Revised Cost × 100.",
  progress: "Physical Progress: How much actual construction work is completed on the ground, as reported by the contractor to MoSPI.",
  gap: "Burn-Progress Gap: Difference between money spent % and work done %. Negative (−ve) means spending is slower than physical progress. Positive (+ve) means money is spent faster than work progresses — a warning sign. NOTE: A very negative gap with low absolute progress may indicate project stagnation (mobilization failure), not efficiency.",
};

function Tooltip({ text }: { text: string }) {
  return (
    <span
      title={text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: "rgba(148,163,184,0.18)",
        color: "#94a3b8",
        fontSize: 9,
        fontWeight: 700,
        marginLeft: 5,
        cursor: "help",
        flexShrink: 0,
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      ?
    </span>
  );
}

function Bar({ value, color, label, tooltip }: { value: number; color: string; label: string; tooltip: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center" }}>
          {label}
          <Tooltip text={tooltip} />
        </span>
        <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 10, background: "#1e293b", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 5, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

export default function BurnProgressGauge({ burnRate, physicalProgress, gap, timeElapsedRatio }: Props) {
  const br = burnRate ?? 0;
  const pp = physicalProgress ?? 0;
  const g = gap ?? (br - pp);
  const ter = timeElapsedRatio ?? 0;

  // Stagnation detection: low absolute progress + significant time elapsed + negative gap
  // This is the "False Economy" trap — spending less than progress sounds good, but
  // if both are near zero with 50%+ time gone, the project is paralyzed.
  const spi = ter > 0 ? pp / (ter * 100) : 1;
  const isStagnated = ter >= 0.40 && pp < 15.0 && (ter - pp / 100) >= 0.35;
  const isCriticalStagnation = spi < 0.10 && ter >= 0.30;

  const gapColor = isCriticalStagnation
    ? "#f43f5e"
    : isStagnated
    ? "#f59e0b"
    : g > 20
    ? "#f43f5e"
    : g > 10
    ? "#f59e0b"
    : "#10b981";

  let gapMeaning: string;
  if (isCriticalStagnation) {
    gapMeaning = `⚠ CRITICAL STAGNATION: SPI = ${spi.toFixed(3)} — project executing at only ${(spi * 100).toFixed(1)}% of required pace. Possible site blockage, contractor default, or clearance failure.`;
  } else if (isStagnated) {
    gapMeaning = `⚠ Stagnation Warning: ${(ter * 100).toFixed(0)}% of timeline elapsed with only ${pp.toFixed(1)}% progress. Near-zero spending does not indicate efficiency — it indicates mobilization failure.`;
  } else if (g < 0) {
    gapMeaning = `Work is ${Math.abs(g).toFixed(1)}% ahead of spending — spending is slower than physical progress`;
  } else if (g === 0) {
    gapMeaning = "Spending and progress are perfectly balanced";
  } else if (g <= 10) {
    gapMeaning = `Spending is ${g.toFixed(1)}% ahead of progress — slight concern`;
  } else {
    gapMeaning = `Spending is ${g.toFixed(1)}% ahead of progress — overspending alert`;
  }

  const gapBoxBg = isCriticalStagnation
    ? "rgba(244,63,94,0.12)"
    : isStagnated
    ? "rgba(245,158,11,0.10)"
    : g > 10
    ? "rgba(244,63,94,0.08)"
    : "rgba(16,185,129,0.08)";

  return (
    <div>
      <Bar value={br} color="#f59e0b" label="Budget Spent (Burn Rate)" tooltip={TOOLTIPS.burnRate} />
      <Bar value={pp} color="#10b981" label="Physical Progress Achieved" tooltip={TOOLTIPS.progress} />
      <div style={{
        marginTop: 4, padding: "10px 14px", borderRadius: 8,
        background: gapBoxBg,
        border: `1px solid ${gapColor}30`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center" }}>
            Burn-Progress Gap
            <Tooltip text={TOOLTIPS.gap} />
          </span>
          <span className="tabular" style={{ fontSize: 15, fontWeight: 700, color: gapColor }}>
            {g >= 0 ? "+" : ""}{g.toFixed(1)}%
          </span>
        </div>
        <div style={{ fontSize: 11, color: gapColor, fontWeight: 500 }}>
          {gapMeaning}
        </div>
        {(isCriticalStagnation || isStagnated) && (
          <div style={{
            marginTop: 8, fontSize: 10, color: "#94a3b8", fontWeight: 400,
            borderTop: `1px solid ${gapColor}22`, paddingTop: 6,
          }}>
            Schedule Performance Index (SPI): {spi.toFixed(3)} · Timeline Elapsed: {(ter * 100).toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  );
}

