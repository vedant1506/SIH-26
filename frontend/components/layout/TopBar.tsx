"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  listAlerts,
  getPortfolioSummary,
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api";
import { toggleTheme, getStoredTheme, type Theme } from "@/lib/theme";
import type { Notification } from "@/lib/types";
import { useNav } from "@/lib/nav-context";

interface TopBarProps {
  title: string;
  subtitle?: string;
  status?: "synced" | "inferencing" | "error";
  hideGlobalProjectCount?: boolean;
  customProjectCount?: number | null;
  customProjectLabel?: string;
  action?: React.ReactNode;
}

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

const InboxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="12" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
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
  action,
}: TopBarProps) {
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [time, setTime] = useState<Date | null>(null);
  const [totalProjects, setTotalProjects] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const { toggleMobile } = useNav();

  const loadNotifications = () => {
    getUnreadNotificationCount()
      .then((r) => setNotifUnread(r.unread_count))
      .catch(() => {});
    listNotifications(false, 15)
      .then((items) => setNotifs(items))
      .catch(() => {});
  };

  useEffect(() => {
    setTime(new Date());
    listAlerts(true).then((a) => setUnread(a.length)).catch(() => {});
    loadNotifications();

    if (!hideGlobalProjectCount) {
      getPortfolioSummary().then((s) => setTotalProjects(s?.total_projects ?? null)).catch(() => {});
    }
    setTheme(getStoredTheme());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [hideGlobalProjectCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  const handleMarkAllNotifsRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifUnread(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleMarkOneNotifRead = async (id: string) => {
    await markNotificationRead(id).catch(() => {});
    setNotifUnread((prev) => Math.max(0, prev - 1));
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
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
      {/* Left: Mobile Toggle + Title + Brand Emblem */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMobile}
          className="mobile-only"
          style={{
            background: "var(--topbar-btn-bg)",
            border: "1px solid var(--topbar-btn-border)",
            borderRadius: 7,
            color: "var(--text)",
            padding: "6px 8px",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="Open Navigation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div
          className="phone-hide"
          style={{
            width: 34, height: 34, borderRadius: 8, overflow: "hidden", flexShrink: 0,
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
              fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0,
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "0.01em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="phone-hide" style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Live Status Chip */}
        <div
          className="phone-hide"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "3px 8px",
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
              fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              color: status === "error" ? "var(--critical)" : status === "inferencing" ? "var(--high)" : "var(--low)",
            }}
          >
            {status === "inferencing" ? "Inferencing…" : status === "error" ? "Error" : "Live"}
          </span>
        </div>

        {/* Projects count chip */}
        {hideGlobalProjectCount ? (
          customProjectCount !== undefined && customProjectCount !== null ? (
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
                {customProjectCount === 0 ? (customProjectLabel || "NO PROJECTS ANALYZED") : `${customProjectCount.toLocaleString("en-IN")} ${customProjectLabel || "ONGOING PROJECTS"}`}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 999, flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                {customProjectLabel || "FILE SESSION · NO DOCUMENT ANALYZED"}
              </span>
            </div>
          )
        ) : (
          totalProjects !== null && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 6,
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
              <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-sub)", borderLeft: "1px solid var(--border)", paddingLeft: 6, letterSpacing: "0.04em" }}>
                APRIL 2026 BASELINE
              </span>
            </div>
          )
        )}
      </div>

      {/* Right: Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {action && <div>{action}</div>}

        {/* Public Citizen Portal Quick Link */}
        <Link
          href="/citizen"
          className="phone-hide"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            textDecoration: "none",
            color: "var(--accent)",
            background: "rgba(6,182,212,0.08)",
            border: "1px solid rgba(6,182,212,0.25)",
            transition: "all 0.15s ease",
          }}
          title="Open Public Citizen Transparency Portal"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>Citizen Portal</span>
        </Link>

        {/* Live Clock */}
        <div className="tablet-hide" style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
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
        <div className="tablet-hide" style={{ width: 1, height: 28, background: "var(--border)" }} />

        {/* Notifications Popover */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifs((prev) => !prev);
              if (!showNotifs) loadNotifications();
            }}
            style={{
              position: "relative",
              color: "var(--text-sub)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 8,
              background: showNotifs ? "var(--accent-glow-2)" : "var(--topbar-btn-bg)",
              border: `1px solid ${showNotifs ? "var(--accent)" : "var(--topbar-btn-border)"}`,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title={`${notifUnread} unread notifications`}
            aria-label="In-App Notifications"
          >
            <InboxIcon />
            {notifUnread > 0 && (
              <span
                className="animate-glow"
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  minWidth: 16,
                  height: 16,
                  padding: "0 3px",
                  background: "var(--accent)",
                  borderRadius: 999,
                  fontSize: 8,
                  fontWeight: 800,
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px solid var(--surface)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {notifUnread > 99 ? "99+" : notifUnread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                width: 360,
                maxHeight: 460,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                backdropFilter: "blur(16px)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    Notifications
                  </span>
                  {notifUnread > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: "var(--accent-glow-2)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent-glow)",
                      }}
                    >
                      {notifUnread} new
                    </span>
                  )}
                </div>
                {notifs.length > 0 && (
                  <button
                    onClick={handleMarkAllNotifsRead}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent)",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "2px 6px",
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
                {notifs.length === 0 ? (
                  <div
                    style={{
                      padding: "32px 16px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: 12,
                    }}
                  >
                    No notifications yet
                  </div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && handleMarkOneNotifRead(n.id)}
                      style={{
                        padding: "10px 16px",
                        display: "flex",
                        gap: 10,
                        borderBottom: "1px solid var(--border)",
                        background: n.is_read ? "transparent" : "rgba(6, 182, 212, 0.05)",
                        cursor: n.is_read ? "default" : "pointer",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          marginTop: 5,
                          flexShrink: 0,
                          background: n.is_read
                            ? "transparent"
                            : n.severity === "critical"
                            ? "var(--critical)"
                            : n.severity === "high"
                            ? "var(--high)"
                            : "var(--accent)",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: n.is_read ? 500 : 700,
                            color: "var(--text)",
                            marginBottom: 2,
                            lineHeight: 1.3,
                          }}
                        >
                          {n.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-sub)",
                            lineHeight: 1.4,
                            marginBottom: 4,
                          }}
                        >
                          {n.message}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 9.5,
                            color: "var(--text-muted)",
                          }}
                        >
                          <span
                            style={{
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: "var(--surface-2)",
                              border: "1px solid var(--border)",
                              textTransform: "uppercase",
                              fontWeight: 600,
                            }}
                          >
                            {n.notification_type.replace(/_/g, " ")}
                          </span>
                          <span>
                            {new Date(n.created_at).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
