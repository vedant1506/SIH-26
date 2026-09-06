"use client";
import { useState, useEffect } from "react";
import { useAuth, ROLE_META, UserRole } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRecord {
  user_id: string;
  email: string;
  role: string;
  full_name?: string | null;
  designation?: string | null;
  department_or_ministry?: string | null;
}

// ─── Permission Matrix Data ───────────────────────────────────────────────────

const PERMISSION_MATRIX = [
  { permission: "Create Projects",      admin: true,  decision_maker: false, monitoring_officer: false, analyst: false },
  { permission: "Edit Project Data",    admin: true,  decision_maker: false, monitoring_officer: true,  analyst: false },
  { permission: "Delete Projects",      admin: true,  decision_maker: false, monitoring_officer: false, analyst: false },
  { permission: "Acknowledge Alerts",   admin: true,  decision_maker: true,  monitoring_officer: true,  analyst: false },
  { permission: "Acknowledge All",      admin: true,  decision_maker: true,  monitoring_officer: false, analyst: false },
  { permission: "Manage Users",         admin: true,  decision_maker: false, monitoring_officer: false, analyst: false },
  { permission: "View SHAP/XAI",        admin: true,  decision_maker: true,  monitoring_officer: true,  analyst: true  },
  { permission: "View Benchmarking",    admin: true,  decision_maker: true,  monitoring_officer: false, analyst: true  },
  { permission: "View ML Validation",   admin: true,  decision_maker: false, monitoring_officer: false, analyst: true  },
  { permission: "Export Briefs (PDF)",  admin: true,  decision_maker: true,  monitoring_officer: false, analyst: false },
  { permission: "Access Control Portal",admin: true,  decision_maker: false, monitoring_officer: false, analyst: false },
];

const ROLE_COLS: { key: UserRole; label: string }[] = [
  { key: "admin",             label: "Admin" },
  { key: "decision_maker",    label: "Decision Maker" },
  { key: "monitoring_officer",label: "Monitoring Officer" },
  { key: "analyst",           label: "Analyst" },
];

function CheckIcon({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

const RoleIcons: Record<string, React.ReactNode> = {
  admin: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 9l6-1 3-6z" />
    </svg>
  ),
  decision_maker: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 3L2 9h20L12 3z" />
    </svg>
  ),
  monitoring_officer: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  analyst: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccessControlPage() {
  const { user, permissions } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Guard: redirect non-admins
  useEffect(() => {
    if (!permissions.canViewAccessControl) {
      router.replace("/dashboard");
    }
  }, [permissions, router]);

  // Fetch users list
  useEffect(() => {
    if (!permissions.canViewAccessControl) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("prism_access_token") : null;
    const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    fetch(`${BASE}/api/v1/auth/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: UserRecord[]) => setUsers(data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [permissions]);

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdatingId(userId);
    const token = typeof window !== "undefined" ? localStorage.getItem("prism_access_token") : null;
    const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${BASE}/api/v1/auth/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        const updated: UserRecord = await res.json();
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: updated.role } : u));
      }
    } catch {}
    setUpdatingId(null);
  }

  if (!permissions.canViewAccessControl) return null;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>
              Access Control
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              PRISM RBAC Administration Portal
            </p>
          </div>
        </div>

        {/* Current Admin Banner */}
        <div style={{
          padding: "12px 16px",
          background: "rgba(139,92,246,0.08)",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: 10,
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 13,
        }}>
          <span style={{ display: "inline-flex", color: "#a78bfa" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 9l6-1 3-6z" />
            </svg>
          </span>
          <div>
            <span style={{ color: "#a78bfa", fontWeight: 600 }}>{user?.full_name || "Administrator"}</span>
            <span style={{ color: "var(--text-muted)" }}> — {user?.designation} · {user?.department_or_ministry}</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {ROLE_COLS.map(({ key, label }) => {
          const meta = ROLE_META[key];
          const count = users.filter(u => u.role === key).length;
          return (
            <div key={key} style={{
              padding: "16px 20px",
              background: meta.bg,
              border: `1px solid ${meta.color}44`,
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{meta.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: meta.color }}>{count}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{label}s</div>
            </div>
          );
        })}
      </div>

      {/* User Directory */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
          Platform Users & Officers
        </h2>
        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "24px 0" }}>Loading users…</div>
        ) : (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Officer", "Designation & Ministry", "Role", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.06em", color: "var(--text-muted)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const roleMeta = ROLE_META[u.role as UserRole];
                  const isUpdating = updatingId === u.user_id;
                  return (
                    <tr
                      key={u.user_id}
                      style={{
                        borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: roleMeta ? roleMeta.bg : "rgba(100,116,139,0.15)",
                            border: `1px solid ${roleMeta ? roleMeta.color + "44" : "rgba(100,116,139,0.3)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 800,
                            color: roleMeta ? roleMeta.color : "var(--text-sub)",
                          }}>
                            {(u.full_name || u.email).split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{u.full_name || "—"}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontSize: 12, color: "var(--text-sub)" }}>{u.designation || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.department_or_ministry || "—"}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {roleMeta && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 10px", borderRadius: 20,
                            background: roleMeta.bg,
                            border: `1px solid ${roleMeta.color}44`,
                            color: roleMeta.color,
                            fontSize: 11, fontWeight: 700,
                          }}>
                            <span style={{ display: "inline-flex", alignItems: "center" }}>{RoleIcons[u.role] || null}</span> {roleMeta.label}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <select
                          id={`role-select-${u.user_id}`}
                          value={u.role}
                          disabled={isUpdating}
                          onChange={(e) => handleRoleChange(u.user_id, e.target.value as UserRole)}
                          style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            color: "var(--text)",
                            padding: "5px 8px",
                            fontSize: 12,
                            cursor: "pointer",
                            opacity: isUpdating ? 0.5 : 1,
                          }}
                        >
                          <option value="admin">admin</option>
                          <option value="decision_maker">decision_maker</option>
                          <option value="monitoring_officer">monitoring_officer</option>
                          <option value="analyst">analyst</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      No registered users found. Run <code>seed_demo_profiles()</code> to populate demo accounts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permission Matrix */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
          Role Permission Matrix
        </h2>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                  Permission
                </th>
                {ROLE_COLS.map(({ key, label }) => {
                  const meta = ROLE_META[key];
                  return (
                    <th key={key} style={{ padding: "12px 16px", textAlign: "center", fontSize: 11, fontWeight: 700, color: meta.color }}>
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 16 }}>{meta.icon}</span>
                        <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row, i) => (
                <tr
                  key={row.permission}
                  style={{
                    borderBottom: i < PERMISSION_MATRIX.length - 1 ? "1px solid var(--border)" : "none",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}
                >
                  <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--text-sub)", fontWeight: 500 }}>
                    {row.permission}
                  </td>
                  {ROLE_COLS.map(({ key }) => (
                    <td key={key} style={{ padding: "10px 16px", textAlign: "center" }}>
                      <CheckIcon allowed={row[key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
