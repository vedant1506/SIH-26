import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RiskTier } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Risk tier color mappings
export const RISK_COLORS: Record<RiskTier, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-600" },
  high:     { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  medium:   { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-500" },
  low:      { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-600" },
};

export const RISK_MAP_COLORS: Record<RiskTier, string> = {
  critical: "#e11d48",
  high:     "#f59e0b",
  medium:   "#eab308",
  low:      "#059669",
};

export function formatCrore(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K Cr`;
  return `₹${value.toFixed(1)} Cr`;
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function tierLabel(tier: RiskTier | null | undefined): string {
  if (!tier) return "Unscored";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
