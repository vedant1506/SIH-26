"use client";
import { useEffect, useState } from "react";
import { listAlerts, acknowledgeAlert } from "@/lib/api";
import type { Alert } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

const TIER_VAR: Record<string, string> = {
  critical: "var(--critical)",
  high:     "var(--high)",
  medium:   "var(--medium)",
  low:      "var(--low)",
};

interface Props { maxItems?: number; compact?: boolean; }

export default function AlertFeed({ maxItems = 50, compact = false }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [acking, setAcking] = useState<string | null>(null);

  async function load() {
    try {
      const data = await listAlerts(unreadOnly, maxItems);
      setAlerts(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [unreadOnly]);

  async function handleAck(id: string) {
    setAcking(id);
    try {
      await acknowledgeAlert(id);
      setAlerts(a => a.map(x => x.id === id ? { ...x, is_acknowledged: true } : x));
    } catch { /* ignore */ }
    finally { setAcking(null); }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 8 }} />)}
    </div>
  );

  if (!alerts.length) return (
    <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>
      {unreadOnly ? "No unacknowledged alerts" : "No alerts yet"}
    </div>
  );

  return (
    <div>
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "var(--text-sub)" }}>
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
          </span>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-sub)", cursor: "pointer" }}>
            <input type="checkbox" id="unread-toggle" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />
            Unacknowledged only
          </label>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map(a => {
          const tierColor = TIER_VAR[a.new_tier || "low"] || "var(--text-muted)";
          const isAcked = a.is_acknowledged;
          return (
            <div
              key={a.id}
              id={`alert-${a.id}`}
              style={{
                padding: compact ? "10px 12px" : "14px 16px",
                background: isAcked ? "var(--surface-2)" : "var(--critical-bg)",
                border: `1px solid ${isAcked ? "var(--border)" : "var(--critical-border)"}`,
                borderRadius: 10,
                opacity: isAcked ? 0.6 : 1,
                display: "flex",
                alignItems: compact ? "center" : "flex-start",
                gap: 12,
                transition: "opacity 0.2s",
              }}
            >
              <div
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: tierColor, flexShrink: 0,
                  marginTop: compact ? 0 : 4,
                  boxShadow: `0 0 6px ${tierColor}`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.project_name}
                </div>
                {!compact && a.message && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>
                    {a.message}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: compact ? 0 : 6, flexWrap: "wrap" }}>
                  {a.previous_tier && (
                    <span style={{ fontSize: 11, color: TIER_VAR[a.previous_tier] || "var(--text-muted)", fontWeight: 600 }}>
                      {a.previous_tier.toUpperCase()}
                    </span>
                  )}
                  {a.previous_tier && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, color: tierColor }}>
                    {(a.new_tier || "").toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    · {formatDistanceToNow(new Date(a.triggered_at), { addSuffix: true })}
                  </span>
                  {isAcked && (
                    <span style={{ fontSize: 10, color: "var(--low)", fontWeight: 600 }}>✓ Acknowledged</span>
                  )}
                </div>
              </div>
              {!isAcked && !compact && (
                <button
                  id={`ack-${a.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                  onClick={() => handleAck(a.id)}
                  disabled={acking === a.id}
                >
                  {acking === a.id ? "…" : "Acknowledge"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
