import type { RiskTier } from "@/lib/types";

const CONFIG: Record<RiskTier, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
  high:     { label: "High",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  medium:   { label: "Medium",   color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  low:      { label: "Low",      color: "#10b981", bg: "rgba(16,185,129,0.12)" },
};

export default function RiskBadge({ tier, size = "sm", suffix }: { tier: RiskTier | null | undefined; size?: "sm" | "md" | "lg"; suffix?: string }) {
  if (!tier) return <span style={{ color: "#64748b", fontSize: 11 }}>—</span>;
  const c = CONFIG[tier] || CONFIG.low;
  const fontSize = size === "lg" ? 13 : size === "md" ? 12 : 11;
  const padding = size === "lg" ? "4px 14px" : size === "md" ? "3px 10px" : "2px 8px";
  return (
    <span className="badge" style={{ color: c.color, background: c.bg, border: `1px solid ${c.color}33`, fontSize, padding }}>
      {c.label}{suffix}
    </span>
  );
}
