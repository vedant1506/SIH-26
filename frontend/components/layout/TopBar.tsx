"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listAlerts, getPortfolioSummary } from "@/lib/api";
import { toggleTheme, getStoredTheme, type Theme } from "@/lib/theme";

interface TopBarProps {
  title: string;
  subtitle?: string;
  status?: "synced" | "inferencing" | "error";
  hideGlobalProjectCount?: boolean;
  customProjectCount?: number | null;
  customProjectLabel?: string;
}

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

export default function TopBar({
  title,
  subtitle,
  status,
  hideGlobalProjectCount,
  customProjectCount,
  customProjectLabel,
}: TopBarProps) {
  const [unread, setUnread] = useState(0);
  const [time, setTime] = useState<Date | null>(null);
  const [totalProjects, setTotalProjects] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTime(new Date());
    listAlerts(true).then((a) => setUnread(a.length)).catch(() => {});
    if (!hideGlobalProjectCount) {
      getPortfolioSummary().then((s) => setTotalProjects(s?.total_projects ?? null)).catch(() => {});
    }
    setTheme(getStoredTheme());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [hideGlobalProjectCount]);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  const timeStr = time
    ? time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "12:00:00";
  const dateStr = time
    ? time.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "01 Apr 2026";

  return (
    <header
      className="topbar"
      style={{
        height: 64,
        background: "var(--topbar-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--topbar-border)",
        boxShadow: "var(--topbar-shadow)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 40,
        gap: 16,
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      {/* Left: Title + Brand Emblem */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 9, overflow: "hidden", flexShrink: 0,
            boxShadow: "0 2px 8px var(--accent-glow)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <img src="/logo.jpg" alt="PRISM" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0,
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.01em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Live Status Chip */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px",
            background: status === "error"
              ? "var(--critical-bg)"
              : status === "inferencing"
              ? "var(--high-bg)"
              : "var(--low-bg)",
            border: `1px solid ${
              status === "error"
                ? "var(--critical-border)"
                : status === "inferencing"
                ? "var(--high-border)"
                : "var(--low-border)"
            }`,
            borderRadius: 999,
            flexShrink: 0,
          }}
        >
          <span
            className={status === "inferencing" ? "live-dot warn animate-pulse" : status === "error" ? "live-dot danger" : "live-dot animate-glow"}
            style={{ flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              color: status === "error" ? "var(--critical)" : status === "inferencing" ? "var(--high)" : "var(--low)",
            }}
          >
            {status === "inferencing" ? "Inferencing…" : status === "error" ? "Data Error" : "Live · Synced"}
          </span>
        </div>

        {/* Projects count chip */}
        {hideGlobalProjectCount ? (
          customProjectCount !== undefined && customProjectCount !== null && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px",
                background: "var(--accent-glow-2)",
                border: "1px solid var(--accent-glow)",
                borderRadius: 999, flexShrink: 0,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.05em" }}>
                {customProjectCount === 0 ? "0 ANALYZED PROJECTS" : `${customProjectCount.toLocaleString("en-IN")} ${customProjectLabel || "ONGOING PROJECTS"}`}
              </span>
            </div>
          )
        ) : (
          totalProjects !== null && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px",
                background: "var(--accent-glow-2)",
                border: "1px solid var(--accent-glow)",
                borderRadius: 999, flexShrink: 0,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.05em" }}>
                {totalProjects.toLocaleString("en-IN")} PROJECTS
              </span>
            </div>
          )
        )}
      </div>

      {/* Right: Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {/* Live Clock */}
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span
            suppressHydrationWarning
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "0.04em",
              lineHeight: 1.2,
            }}
          >
            {timeStr}
          </span>
          <span
            suppressHydrationWarning
            style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.04em", marginTop: 1 }}
          >
            {dateStr} · IST
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "var(--border)" }} />

        {/* Alert Bell */}
        <Link
          href="/alerts"
          style={{
            position: "relative", color: "var(--text-sub)", textDecoration: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: 8,
            background: "var(--topbar-btn-bg)",
            border: "1px solid var(--topbar-btn-border)",
            transition: "all 0.15s ease",
          }}
          title={`${unread} unread alerts`}
        >
          <BellIcon />
          {unread > 0 && (
            <span
              className="animate-glow"
              style={{
                position: "absolute", top: -3, right: -3,
                minWidth: 16, height: 16, padding: "0 3px",
                background: "var(--critical)",
                borderRadius: 999, fontSize: 8, fontWeight: 800,
                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                border: "1.5px solid var(--surface)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={handleToggleTheme}
          style={{
            width: 34, height: 34, borderRadius: 8,
            background: "var(--topbar-btn-bg)",
            border: "1px solid var(--topbar-btn-border)",
            color: "var(--text-sub)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
