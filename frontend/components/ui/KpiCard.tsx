interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subBadge?: React.ReactNode;
  color?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export default function KpiCard({ label, value, sub, subBadge, color = "#06b6d4", icon, loading }: KpiCardProps) {
  // Convert hex color to a transparent glowing drop-shadow. The "33" at the end is ~20% opacity.
  const ambientGlow = `0 10px 40px -10px ${color}33`;
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 110, textAlign: "left", boxShadow: ambientGlow }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>{label}</span>
        {icon && <span>{icon}</span>}
      </div>
      {loading ? (
        <div className="skeleton animate-pulse" style={{ height: 36, width: "60%" }} />
      ) : (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div className="tabular" style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
          {subBadge}
        </div>
      )}
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}
