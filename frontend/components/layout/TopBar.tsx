"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listAlerts } from "@/lib/api";

import type { ProjectFilters } from "@/lib/api";

interface TopBarProps {
  title: string;
  subtitle?: string;
  filters?: ProjectFilters;
  setFilters?: (filters: ProjectFilters) => void;
  status?: "synced" | "inferencing" | "error";
}

export default function TopBar({ title, subtitle, filters, setFilters, status }: TopBarProps) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    listAlerts(true, 100).then(a => setUnread(a.length)).catch(() => { });
  }, []);
  const toggleTheme = () => {
    document.documentElement.classList.toggle('light-mode');
  };
  return (
    <header style={{
      height: 76, background: "var(--surface)", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", position: "sticky", top: 0, zIndex: 40,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{subtitle}</p>}
        </div>
        {status && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--surface-2)", borderRadius: 999 }}>
            {status === "inferencing" ? (
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--high)", display: "inline-block" }} className="animate-pulse" />
            ) : status === "error" ? (
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--critical)", display: "inline-block" }} />
            ) : (
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--low)", display: "inline-block" }} />
            )}
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {status === "inferencing" ? "Engine Inferencing..." : status === "error" ? "Data Error" : "Predictions Synced (August 2026)"}
            </span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/alerts" style={{ position: "relative", color: "var(--text-sub)", textDecoration: "none", display: "flex" }}>


          <span style={{ fontSize: 18 }}>🔔</span>
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4, width: 16, height: 16,
              background: "var(--critical)", borderRadius: "50%", fontSize: 9, fontWeight: 700,
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            }}>{unread > 9 ? "9+" : unread}</span>
          )}
        </Link>
        <button onClick={toggleTheme} style={{
          background: "transparent",
          border: "none",
          color: "var(--text-sub)",
          fontSize: 18,
          cursor: "pointer",
          marginLeft: 8,
        }} title="Toggle Light/Dark Mode">☀️</button>
      </div>
    </header>
  );
}
