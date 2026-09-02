"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@prism.gov.in");
  const [password, setPassword] = useState("PRISM2026Demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await login(email, password);
      setToken(data.access_token);
      setUser({ user_id: data.user_id, email: data.email, role: data.role, full_name: data.full_name });
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 420, padding: "0 16px" }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img src="/logo.jpg" alt="PRISM Logo" style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover", margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>
          PRISM
        </h1>
        <p style={{ fontSize: 13, color: "#64748b" }}>
          Predictive Risk & Infra Status Monitoring
        </p>
      </div>

      {/* Card */}
      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>
              Email Address
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
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

          <button id="login-submit" type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "11px 16px", fontSize: 14, marginTop: 4 }} disabled={loading}>
            {loading ? (
              "Signing in…"
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                Sign In
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </span>
            )}
          </button>
        </form>

        {/* Demo hint */}
        <div style={{
          marginTop: 20, padding: "12px 14px", background: "rgba(6,182,212,0.06)",
          border: "1px solid rgba(6,182,212,0.15)", borderRadius: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#06b6d4", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Demo Credentials
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            Email: <code style={{ color: "#f1f5f9" }}>demo@prism.gov.in</code><br/>
            Password: <code style={{ color: "#f1f5f9" }}>PRISM2026Demo</code>
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#475569" }}>
        Government of India · Ministry of Statistics & Programme Implementation
      </p>
    </div>
  );
}
