"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  trend?: { value: string; up?: boolean } | null;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
}

function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(ease * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return display;
}

export default function KpiCard({
  label,
  value,
  sub,
  color = "#06b6d4",
  loading,
  icon,
  trend,
  href,
  target,
  rel,
  onClick,
}: KpiCardProps) {
  const numericVal = typeof value === "number" ? value : (typeof value === "string" ? parseInt(value.replace(/[^0-9]/g, "")) || 0 : 0);
  const isNumeric = typeof value === "number" || (typeof value === "string" && /^[\d,]+$/.test(value.replace(/,/g, "")));
  const counted = useCountUp(isNumeric && !loading ? numericVal : 0);
  const displayValue = loading ? null : isNumeric ? counted.toLocaleString("en-IN") : value;

  // Hex → rgb for glow
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };
  const rgb = color.startsWith("#") ? hexToRgb(color) : "6,182,212";
  const isInteractive = Boolean(href || onClick);

  const cardContent = (
    <div
      className={`kpi-card ${isInteractive ? "interactive" : ""}`}
      style={{
        "--kpi-glow": `rgba(${rgb},0.12)`,
        boxShadow: `var(--shadow), 0 0 0 1px rgba(${rgb},0.08)`,
        borderTop: `2px solid rgba(${rgb},0.45)`,
        cursor: isInteractive ? "pointer" : "default",
        textDecoration: "none",
        color: "inherit",
        position: "relative",
      } as React.CSSProperties}
      onClick={onClick}
      role={onClick && !href ? "button" : undefined}
      tabIndex={onClick && !href ? 0 : undefined}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.10em", color: "var(--text-muted)", lineHeight: 1.3,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {label}
          </span>
          {isInteractive && (
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--text-muted)", opacity: 0.6, transition: "transform 0.2s" }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </div>

        {icon && (
          <div
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: `rgba(${rgb},0.12)`,
              border: `1px solid rgba(${rgb},0.20)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: color,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div className="skeleton" style={{ height: 38, width: "55%", marginTop: 4 }} />
      ) : (
        <div
          className="tabular animate-count"
          style={{
            fontSize: 34, fontWeight: 800, color, lineHeight: 1.0,
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          {displayValue}
        </div>
      )}

      {/* Sub + Trend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
        {sub && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3 }}>
            {loading ? <span className="skeleton" style={{ display: "block", height: 14, width: 100 }} /> : sub}
          </div>
        )}
        {trend && !loading && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
              fontSize: 11, fontWeight: 700,
              color: trend.up !== false ? "#10b981" : "#f43f5e",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {trend.up !== false
                ? <><polyline points="18 15 12 9 6 15"/></>
                : <><polyline points="6 9 12 15 18 9"/></>
              }
            </svg>
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={target === "_blank" ? (rel || "noopener noreferrer") : rel}
        style={{ textDecoration: "none", display: "block" }}
      >
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
