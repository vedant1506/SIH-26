"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";

const ROLE_PRESETS = [
  {
    id: "preset-admin",
    label: "Administrator",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 9l6-1 3-6z" />
      </svg>
    ),
    email: "admin@prism.gov.in",
    password: "PRISM2026Demo",
    color: "#a78bfa",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.25)",
    description: "MoSPI Joint Secretary — Full system access",
  },
  {
    id: "preset-executive",
    label: "Decision Maker",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 3L2 9h20L12 3z" />
      </svg>
    ),
    email: "executive@prism.gov.in",
    password: "PRISM2026Demo",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
    description: "Cabinet Secretariat — Executive oversight",
  },
  {
    id: "preset-officer",
    label: "Monitoring Officer",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    email: "officer@prism.gov.in",
    password: "PRISM2026Demo",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    description: "NHAI Field Officer — Operational reporting",
  },
  {
    id: "preset-analyst",
    label: "Data Analyst",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    email: "analyst@prism.gov.in",
    password: "PRISM2026Demo",
    color: "#34d399",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
    description: "NITI Aayog — Research & ML analytics",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@prism.gov.in");
  const [password, setPassword] = useState("PRISM2026Demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  function applyPreset(preset: typeof ROLE_PRESETS[0]) {
    setEmail(preset.email);
    setPassword(preset.password);
    setActivePreset(preset.id);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await login(email, password);
      setToken(data.access_token);
      setUser({
        user_id: data.user_id,
        email: data.email,
        role: data.role,
        full_name: data.full_name,
        designation: (data as Record<string, unknown>).designation as string | undefined,
        department_or_ministry: (data as Record<string, unknown>).department_or_ministry as string | undefined,
      });
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 460, padding: "0 16px" }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <img src="/logo.jpg" alt="PRISM Logo" style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover", margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>
          PRISM
        </h1>
        <p style={{ fontSize: 13, color: "#64748b" }}>
          Predictive Risk &amp; Infra Status Monitoring
        </p>
      </div>

      {/* Role Quick Select */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", marginBottom: 10, textAlign: "center" }}>
          Select Your Role
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ROLE_PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                id={preset.id}
                onClick={() => applyPreset(preset)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 3,
                  padding: "10px 12px",
                  background: isActive ? preset.bg : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isActive ? preset.border : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  textAlign: "left",
                  outline: isActive ? `2px solid ${preset.color}44` : "none",
                  outlineOffset: 1,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = preset.bg;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", color: preset.color }}>{preset.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? preset.color : "#cbd5e1" }}>
                    {preset.label}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: "#64748b", lineHeight: 1.35 }}>
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card */}
      <div className="card" style={{ padding: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>
              Email Address
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setActivePreset(null); }}
              placeholder="demo@prism.gov.in"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>
              Password
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)",
              borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f43f5e",
            }}>
              {error}
            </div>
          )}

          <button id="login-submit" type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "11px 16px", fontSize: 14, marginTop: 2 }} disabled={loading}>
            {loading ? (
              "Signing in…"
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                Sign In
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </span>
            )}
          </button>
        </form>

        {/* Credentials hint */}
        <div style={{
          marginTop: 16, padding: "10px 12px", background: "rgba(6,182,212,0.06)",
          border: "1px solid rgba(6,182,212,0.15)", borderRadius: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#06b6d4", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            All roles share password:
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            <code style={{ color: "#f1f5f9" }}>PRISM2026Demo</code>
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#475569" }}>
        Government of India · Ministry of Statistics &amp; Programme Implementation
      </p>
    </div>
  );
}
