"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { clearToken } from "@/lib/auth";
import { useAuth, ROLE_META, UserRole } from "@/lib/auth-context";

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

const ExtraIcons = {
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  trending: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  dollarSign: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  activity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  cpu: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  ),
  layers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  checkSquare: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  globe: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  network: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="6" height="6" rx="1"/>
      <rect x="16" y="2" width="6" height="6" rx="1"/>
      <rect x="9" y="16" width="6" height="6" rx="1"/>
      <path d="M5 8v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/>
      <line x1="12" y1="13" x2="12" y2="16"/>
    </svg>
  ),
};

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  roles?: UserRole[];  // if set, only visible to these roles
}

interface NavGroup {
  section: string;
  items: NavItem[];
  roles?: UserRole[];  // if set, entire group is only visible to these roles
}

const ALL_NAV_GROUPS: NavGroup[] = [
  {
    section: "Overview",
    items: [
      { href: "/dashboard", icon: Icons.command, label: "Command Center" },
    ],
  },
  {
    section: "Projects",
    items: [
      { href: "/projects",   icon: Icons.matrix,        label: "All Projects" },
      { href: "/map",        icon: Icons.map,           label: "Geo Risk Map" },
    ],
  },
  {
    section: "AI Analytics",
    items: [
      { href: "/analytics",        icon: Icons.analytics,          label: "Analytics" },
      { href: "/fraud-detection",  icon: ExtraIcons.shield,        label: "Fraud Detection" },
      { href: "/benchmarking",     icon: ExtraIcons.trending,      label: "Benchmarking", roles: ["admin", "decision_maker", "analyst"] },
      { href: "/cost-drivers",     icon: ExtraIcons.dollarSign,    label: "Cost Drivers", roles: ["admin", "decision_maker", "analyst"] },
      { href: "/model-validation", icon: ExtraIcons.cpu,           label: "ML Validation", roles: ["admin", "analyst"] },
    ],
  },
  {
    section: "Monitoring",
    items: [
      { href: "/early-warning",  icon: ExtraIcons.activity,    label: "Early Warnings" },
      { href: "/alerts",         icon: Icons.warning,          label: "Alert Center" },
      { href: "/actions",        icon: ExtraIcons.checkSquare, label: "Action Workflow" },
    ],
  },
  {
    section: "Data & Reports",
    items: [
      { href: "/documents",     icon: ExtraIcons.layers,     label: "Documents" },
      { href: "/upload",        icon: Icons.upload,          label: "File Analysis Hub" },
    ],
  },
  {
    section: "Public Portal",
    items: [
      { href: "/citizen", icon: ExtraIcons.globe, label: "Citizen Transparency" },
    ],
  },
  {
    section: "Administration",
    roles: ["admin"],
    items: [
      { href: "/access-control", icon: ExtraIcons.users,      label: "Access Control", roles: ["admin"] },
    ],
  },
];

// ─── Role Switcher Popover ────────────────────────────────────────────────────

const RoleIcons: Record<string, React.ReactNode> = {
  admin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 9l6-1 3-6z" />
    </svg>
  ),
  decision_maker: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 3L2 9h20L12 3z" />
    </svg>
  ),
  monitoring_officer: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  analyst: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

const ROLE_PRESETS: { role: UserRole; label: string }[] = [
  { role: "admin",             label: "Administrator" },
  { role: "decision_maker",    label: "Decision Maker" },
  { role: "monitoring_officer",label: "Monitoring Officer" },
  { role: "analyst",           label: "Data Analyst" },
];

function RoleSwitcherPopover({
  currentRole,
  onSwitch,
  onClose,
}: {
  currentRole: UserRole | null;
  onSwitch: (r: UserRole) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0, right: 0,
        marginBottom: 8,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
        padding: 8,
        zIndex: 50,
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", padding: "4px 8px 8px" }}>
        Quick Role Switch
      </div>
      {ROLE_PRESETS.map(({ role, label }) => {
        const meta = ROLE_META[role];
        const isActive = currentRole === role;
        return (
          <button
            key={role}
            id={`role-switch-${role}`}
            onClick={() => { onSwitch(role); onClose(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              background: isActive ? `${meta.color}20` : "transparent",
              border: isActive ? `1px solid ${meta.color}40` : "1px solid transparent",
              color: isActive ? meta.color : "var(--text-sub)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: isActive ? 700 : 400,
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center" }}>{RoleIcons[role]}</span>
            <span>{label}</span>
            {isActive && (
              <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

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
  const { user, role, switchRole } = useAuth();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  function handleLogout() {
    if (onCloseMobile) onCloseMobile();
    clearToken();
    router.replace("/login");
  }

  // Filter nav items by current role
  const navGroups = ALL_NAV_GROUPS
    .filter(g => !g.roles || !role || g.roles.includes(role))
    .map(g => ({
      ...g,
      items: g.items.filter(item => !item.roles || !role || item.roles.includes(role)),
    }))
    .filter(g => g.items.length > 0);

  const roleMeta = role ? ROLE_META[role] : null;

  // Get initials for the avatar
  const initials = user?.full_name
    ? user.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

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
        {navGroups.map(({ section, items }) => (
          <div key={section}>
            {!collapsed && (
              <div
                style={{
                  padding: "10px 4px 4px",
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.12em", color: "rgba(100,116,139,0.55)",
                }}
              >
                {section}
              </div>
            )}
            {items.map(({ href, icon, label }) => {
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
                    padding: collapsed ? "10px 0" : "8px 12px",
                    borderRadius: 9,
                    marginBottom: 1,
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
            {!collapsed && <div style={{ height: 4 }} />}
          </div>
        ))}
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

      {/* ── User + Role Badge + Logout ── */}
      <div
        style={{
          padding: collapsed ? "12px 0" : "12px 10px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          position: "relative",
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

        {/* Role Switcher Popover */}
        {roleSwitcherOpen && !collapsed && (
          <RoleSwitcherPopover
            currentRole={role}
            onSwitch={(r) => switchRole(r)}
            onClose={() => setRoleSwitcherOpen(false)}
          />
        )}

        {/* User Identity Block */}
        <div
          style={{
            display: "flex", alignItems: "center",
            gap: 8, width: "100%",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: roleMeta
                ? `linear-gradient(135deg, ${roleMeta.color}99, ${roleMeta.color}44)`
                : "linear-gradient(135deg, #06b6d4, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: "#fff",
              boxShadow: roleMeta ? `0 0 10px ${roleMeta.color}44` : "0 0 10px rgba(6,182,212,0.3)",
              border: roleMeta ? `1px solid ${roleMeta.color}55` : "1px solid rgba(6,182,212,0.3)",
            }}
          >
            {initials}
          </div>

          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: "var(--text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}>
                {user?.full_name || "User"}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.designation || user?.email || ""}
              </div>
            </div>
          )}
        </div>

        {/* Role Badge + Switcher Trigger */}
        {!collapsed && roleMeta && (
          <button
            id="role-badge-switcher"
            onClick={() => setRoleSwitcherOpen(v => !v)}
            title="Click to switch role (demo mode)"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              width: "100%", padding: "5px 8px",
              background: roleMeta.bg,
              border: `1px solid ${roleMeta.color}44`,
              borderRadius: 6,
              color: roleMeta.color,
              cursor: "pointer",
              fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.07em",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = `${roleMeta.color}25`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = roleMeta.bg;
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center" }}>{RoleIcons[role || "monitoring_officer"]}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{roleMeta.label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
        )}

        {/* Sign Out */}
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
