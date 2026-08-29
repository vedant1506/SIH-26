"use client";
import { useEffect, useState } from "react";
import { listAlerts, acknowledgeAlert } from "@/lib/api";
import type { Alert } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

const TIER_COLOR: Record<string, string> = { critical: "#f43f5e", high: "#f59e0b", medium: "#3b82f6", low: "#10b981" };

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
    <div style={{ textAlign: "center", padding: 32, color: "#64748b", fontSize: 13 }}>
      {unreadOnly ? "No unacknowledged alerts" : "No alerts yet"}
    </div>
  );

  return (
    <div>
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>{alerts.length} alert{alerts.length !== 1 ? "s" : ""}</span>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>
            <input type="checkbox" id="unread-toggle" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />
            Unacknowledged only
          </label>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map(a => {
          const newColor = TIER_COLOR[a.new_tier || "low"] || "#64748b";
          const isAcked = a.is_acknowledged;
          return (
            <div key={a.id} id={`alert-${a.id}`} style={{
              padding: compact ? "10px 12px" : "14px 16px",
              background: isAcked ? "#0f172a" : "rgba(244,63,94,0.04)",
              border: `1px solid ${isAcked ? "#1e293b" : "rgba(244,63,94,0.15)"}`,
              borderRadius: 10, opacity: isAcked ? 0.55 : 1,
              display: "flex", alignItems: compact ? "center" : "flex-start", gap: 12,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: newColor, flexShrink: 0, marginTop: compact ? 0 : 4 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.project_name}
                </div>
                {!compact && a.message && (
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>{a.message}</div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: compact ? 0 : 6, flexWrap: "wrap" }}>
                  {a.previous_tier && <span style={{ fontSize: 11, color: TIER_COLOR[a.previous_tier] || "#64748b" }}>{a.previous_tier.toUpperCase()}</span>}
                  {a.previous_tier && <span style={{ fontSize: 11, color: "#475569" }}>→</span>}
                  <span style={{ fontSize: 11, fontWeight: 700, color: newColor }}>{(a.new_tier || "").toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: "#475569" }}>· {formatDistanceToNow(new Date(a.triggered_at), { addSuffix: true })}</span>
                  {isAcked && <span style={{ fontSize: 10, color: "#475569" }}>✓ Acknowledged</span>}
                </div>
              </div>
              {!isAcked && !compact && (
                <button id={`ack-${a.id}`} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => handleAck(a.id)} disabled={acking === a.id}>
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
