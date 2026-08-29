"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", icon: "⬡", label: "Command Center" },
  { href: "/projects", icon: "⊞", label: "Risk Matrix" },
  { href: "/alerts", icon: "◈", label: "Early Warnings" },
  { href: "/map", icon: "◎", label: "Geo Risk Map" },
  { href: "/analytics", icon: "≋", label: "Analytics" },
  { href: "/upload", icon: "⇡", label: "File Analysis Hub" },
];


export default function Sidebar({ collapsed, setCollapsed }: { collapsed?: boolean; setCollapsed?: (v: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: collapsed ? 72 : 240,
      background: "var(--surface)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", zIndex: 50,
      transition: "width 0.3s ease",
    }}>
      {/* Logo */}
      <div style={{ height: 76, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", padding: collapsed ? "0" : "0 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.jpg" alt="PRISM Logo" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 0 12px rgba(6, 182, 212, 0.45)", border: "1px solid rgba(6, 182, 212, 0.3)" }} />
          {!collapsed && (
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", lineHeight: 1.2, letterSpacing: "0.04em" }}>PRISM</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Risk Intelligence</div>
            </div>
          )}
        </div>

        {!collapsed && setCollapsed && (
          <button onClick={() => setCollapsed(true)} style={{ background: "transparent", border: "none", color: "var(--text-sub)", cursor: "pointer", fontSize: 18, display: "flex" }}>
            «
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>

        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10,
              padding: collapsed ? "9px 0" : "9px 10px", borderRadius: 8, marginBottom: 2,
              color: active ? "var(--accent)" : "var(--text-sub)",
              background: active ? "rgba(6,182,212,0.15)" : "transparent",
              textDecoration: "none", fontSize: 16, fontWeight: active ? 600 : 400,
              transition: "all 0.15s",
              borderLeft: active && !collapsed ? "2px solid var(--accent)" : "2px solid transparent",
            }} title={collapsed ? label : undefined}>
              <span style={{ fontSize: 25, opacity: active ? 1 : 0.6 }}>{icon}</span>
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div style={{ padding: collapsed ? "12px 0" : "12px 16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {collapsed && setCollapsed ? (
          <button onClick={() => setCollapsed(false)} style={{ background: "transparent", border: "none", color: "var(--text-sub)", cursor: "pointer", fontSize: 18, marginBottom: 12 }}>
            »
          </button>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, justifyContent: collapsed ? "center" : "flex-start", width: "100%" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#06b6d4,#3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#0f172a", flexShrink: 0
          }}>DA</div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Demo Administrator</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>admin</div>
            </div>
          )}
        </div>
        <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: collapsed ? "40px" : "100%", justifyContent: "center", padding: collapsed ? "0" : undefined, height: collapsed ? "32px" : undefined }} title={collapsed ? "Sign Out" : undefined}>
          {collapsed ? "↩" : "↩ Sign Out"}
        </button>
      </div>
    </aside>
  );
}
