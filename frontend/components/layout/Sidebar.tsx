"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";

// Premium SVG icons — no emoji, no external deps
const Icons = {
  command: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  matrix: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h18M3 9h18M3 15h18M3 21h18M9 3v18M15 3v18"/>
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  map: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  upload: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

const NAV = [
  { href: "/dashboard", icon: Icons.command,   label: "Command Center" },
  { href: "/projects",  icon: Icons.matrix,    label: "Risk Matrix" },
  { href: "/alerts",    icon: Icons.warning,   label: "Early Warnings" },
  { href: "/map",       icon: Icons.map,       label: "Geo Risk Map" },
  { href: "/analytics", icon: Icons.analytics, label: "Analytics" },
  { href: "/upload",    icon: Icons.upload,    label: "File Analysis Hub" },
];

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed?: boolean;
  setCollapsed?: (v: boolean) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    if (onCloseMobile) onCloseMobile();
    clearToken();
    router.replace("/login");
  }

  return (
    <aside
      className={`sidebar-aside ${mobileOpen ? "mobile-open" : ""}`}
      style={{
        width: collapsed ? 68 : 236,
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0" : "0 16px 0 14px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 10, overflow: "hidden", flexShrink: 0,
              boxShadow: "0 0 16px rgba(6,182,212,0.35), 0 0 32px rgba(6,182,212,0.15)",
              border: "1px solid rgba(6,182,212,0.25)",
            }}
          >
            <img
              src="/logo.jpg"
              alt="PRISM Logo"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
          {!collapsed && (
            <div>
              <div
                style={{
                  fontSize: 17, fontWeight: 800, color: "var(--text)",
                  letterSpacing: "0.10em", lineHeight: 1.1,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                PRISM
              </div>
              <div
                style={{
                  fontSize: 8.5, fontWeight: 600, color: "var(--accent)",
                  textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 1,
                }}
              >
                Risk Intelligence
              </div>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="mobile-only"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border-2)",
              borderRadius: 6,
              color: "var(--text-sub)",
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close navigation"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {!collapsed && setCollapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-sub)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26, height: 26,
            }}
            title="Collapse sidebar"
          >
            {Icons.chevronLeft}
          </button>
        )}
      </div>

      {/* ── Section Label ── */}
      {!collapsed && (
        <div
          style={{
            padding: "14px 16px 6px",
            fontSize: 9, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.12em", color: "rgba(100,116,139,0.7)",
          }}
        >
          Navigation
        </div>
      )}

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: "6px 10px", overflowY: "auto" }}>
        {NAV.map(({ href, icon, label }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              title={collapsed ? label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 10,
                padding: collapsed ? "10px 0" : "9px 12px",
                borderRadius: 9,
                marginBottom: 2,
                color: active ? "var(--accent)" : "var(--text-sub)",
                background: active
                  ? "linear-gradient(90deg, rgba(6,182,212,0.12), rgba(6,182,212,0.04))"
                  : "transparent",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                transition: "all 0.18s ease",
                borderLeft: active && !collapsed
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                position: "relative",
              }}
            >
              <span
                style={{
                  opacity: active ? 1 : 0.55,
                  transition: "opacity 0.15s",
                  flexShrink: 0,
                  display: "flex",
                }}
              >
                {icon}
              </span>
              {!collapsed && (
                <span style={{ lineHeight: 1 }}>{label}</span>
              )}
              {active && collapsed && (
                <span
                  style={{
                    position: "absolute",
                    right: 0, top: "50%", transform: "translateY(-50%)",
                    width: 3, height: 20, borderRadius: "2px 0 0 2px",
                    background: "var(--accent)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── MoSPI Badge ── */}
      {!collapsed && (
        <div
          style={{
            margin: "0 10px 10px",
            padding: "8px 10px",
            background: "var(--accent-glow-2)",
            border: "1px solid var(--accent-glow)",
            borderRadius: 8,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <div
            style={{
              width: 20, height: 20, borderRadius: 4, overflow: "hidden", flexShrink: 0,
              border: "1px solid rgba(6,182,212,0.3)",
            }}
          >
            <img src="/logo.jpg" alt="MoSPI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              MoSPI · PAIMANA
            </div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>
              April 2026 · 1,981 Projects
            </div>
          </div>
        </div>
      )}

      {/* ── User + Logout ── */}
      <div
        style={{
          padding: collapsed ? "12px 0" : "12px 10px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        {collapsed && setCollapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6, color: "var(--text-sub)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, marginBottom: 6,
            }}
            title="Expand sidebar"
          >
            {Icons.chevronRight}
          </button>
        )}

        <div
          style={{
            display: "flex", alignItems: "center",
            gap: 8, width: "100%",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <div
            style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
              boxShadow: "0 0 10px rgba(6,182,212,0.3)",
            }}
          >
            DA
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Demo Administrator
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>admin@sih26103</div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            width: collapsed ? 30 : "100%", height: collapsed ? 30 : undefined,
            padding: collapsed ? 0 : "7px 10px",
            background: "rgba(244,63,94,0.07)",
            border: "1px solid rgba(244,63,94,0.15)",
            borderRadius: 7, color: "var(--critical)", cursor: "pointer",
            fontSize: 11, fontWeight: 600,
            transition: "all 0.15s ease",
          }}
          title={collapsed ? "Sign Out" : undefined}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,63,94,0.14)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,63,94,0.07)";
          }}
        >
          {Icons.logout}
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
