interface Props { burnRate: number | null; physicalProgress: number | null; gap: number | null; }

function Bar({ value, color, label }: { value: number; color: string; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
        <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 10, background: "#1e293b", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 5, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

export default function BurnProgressGauge({ burnRate, physicalProgress, gap }: Props) {
  const br = burnRate ?? 0;
  const pp = physicalProgress ?? 0;
  const g = gap ?? (br - pp);
  const gapColor = g > 20 ? "#f43f5e" : g > 10 ? "#f59e0b" : "#10b981";
  return (
    <div>
      <Bar value={br} color="#f59e0b" label="Budget Spent (Burn Rate)" />
      <Bar value={pp} color="#10b981" label="Physical Progress Achieved" />
      <div style={{
        marginTop: 4, padding: "10px 14px", borderRadius: 8,
        background: g > 10 ? "rgba(244,63,94,0.08)" : "rgba(16,185,129,0.08)",
        border: `1px solid ${gapColor}30`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Burn-Progress Gap</span>
        <span className="tabular" style={{ fontSize: 15, fontWeight: 700, color: gapColor }}>
          {g >= 0 ? "+" : ""}{g.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
