"use client";

import React, { useState, useEffect } from "react";
import {
  getIntegrationsStatus,
  syncGatiShakti,
  dispatchAlert,
  getIntegrationLogs,
  getProjects,
} from "../../../lib/api";
import type {
  IntegrationsStatusResponse,
  IntegrationLogOut,
  ProjectListItem,
} from "../../../lib/types";

export default function IntegrationsPage() {
  const [statusData, setStatusData] = useState<IntegrationsStatusResponse | null>(null);
  const [logs, setLogs] = useState<IntegrationLogOut[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected project for simulations
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Live action states
  const [syncingGati, setSyncingGati] = useState<boolean>(false);
  const [gatiResult, setGatiResult] = useState<any>(null);

  const [dispatchingSms, setDispatchingSms] = useState<boolean>(false);
  const [smsPhone, setSmsPhone] = useState<string>("+91 98230 44551");
  const [smsResult, setSmsResult] = useState<any>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [sRes, lRes, pRes] = await Promise.all([
        getIntegrationsStatus(),
        getIntegrationLogs(undefined, 20),
        getProjects({ limit: 30 }),
      ]);
      setStatusData(sRes);
      setLogs(lRes);
      setProjects(pRes);
      if (pRes.length > 0 && !selectedProjectId) {
        setSelectedProjectId(pRes[0].id);
      }
    } catch (err) {
      console.error("Failed to load integrations status", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGatiShaktiSync = async () => {
    if (!selectedProjectId) return;
    try {
      setSyncingGati(true);
      const res = await syncGatiShakti(selectedProjectId, 5.0);
      setGatiResult(res);
      // Refresh logs
      const updatedLogs = await getIntegrationLogs(undefined, 20);
      setLogs(updatedLogs);
    } catch (err: any) {
      alert(err.message || "GatiShakti sync failed");
    } finally {
      setSyncingGati(false);
    }
  };


  const handleDispatchSms = async () => {
    if (!selectedProjectId) return;
    try {
      setDispatchingSms(true);
      const res = await dispatchAlert(
        selectedProjectId,
        "sms",
        smsPhone,
        "[PRISM-URGENT] Critical milestone slippage detected. Immediate site audit ordered."
      );
      setSmsResult(res);
      const updatedLogs = await getIntegrationLogs(undefined, 20);
      setLogs(updatedLogs);
    } catch (err: any) {
      alert(err.message || "SMS dispatch failed");
    } finally {
      setDispatchingSms(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
              CENTRAL IT INFRASTRUCTURE GATEWAY
            </span>
            <span style={{ fontSize: 11, color: "var(--text-sub)" }}>e-Governance Interoperability Framework (e-GIF)</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            External Government Integrations Command Center
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-sub)", margin: "4px 0 0" }}>
            Live status, cryptographic verification handshakes, and multi-modal spatial corridor coordination.
          </p>
        </div>

        {/* Global Target Project Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 600 }}>Active Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: 12, fontWeight: 600, outline: "none", maxWidth: 260 }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} style={{ background: "#0f172a" }}>
                {p.project_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-sub)" }}>
          <div style={{ width: 36, height: 36, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
          Pinging external government gateway endpoints...
        </div>
      ) : statusData ? (
        <>
          {/* Service Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20, marginBottom: 28 }}>
            {/* PM GatiShakti Card */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>
                      GIS
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>PM GatiShakti NMP</h3>
                      <span style={{ fontSize: 11, color: "var(--text-sub)" }}>BISAG-N Geo-Master Plan</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                    ● {statusData.services.gatishakti.status}
                  </span>
                </div>

                <p style={{ fontSize: 12, color: "var(--text-sub)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  OGC WFS spatial corridor intersection engine. Evaluates alignment against {statusData.services.gatishakti.active_spatial_layers} national master layers (Forests, Highways, Rail, Gas Pipelines).
                </p>

                <div style={{ background: "var(--surface-raised)", padding: 10, borderRadius: 6, fontSize: 11, color: "var(--text-sub)", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span>Latency:</span>
                    <span style={{ color: "#4ade80", fontWeight: 600 }}>{statusData.services.gatishakti.latency_ms} ms</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Protocol:</span>
                    <span style={{ color: "var(--text-primary)" }}>{statusData.services.gatishakti.protocol}</span>
                  </div>
                </div>

                {gatiResult && (
                  <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: 6, padding: 10, fontSize: 11, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>Sync Complete: 4 Layers Queried</div>
                    <div style={{ color: "var(--text-primary)", marginBottom: 4 }}>{gatiResult.clearance_recommendation}</div>
                    <div style={{ color: "var(--text-sub)" }}>Handshake Stamp: {gatiResult.log_id.slice(0, 8)}...</div>
                  </div>
                )}
              </div>

              <button
                onClick={handleGatiShaktiSync}
                disabled={syncingGati}
                style={{
                  width: "100%", padding: "9px", borderRadius: 6, background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {syncingGati ? "Querying BISAG-N NMP Layers..." : "Run Corridor Collision Check"}
              </button>
            </div>


            {/* NIC SMS Gateway Card */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>
                      SMS
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>NIC Mobile Seva SMS</h3>
                      <span style={{ fontSize: 11, color: "var(--text-sub)" }}>C-DAC / NIC National SMS Gateway</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                    ● {statusData.services.sms_gateway.status}
                  </span>
                </div>

                <p style={{ fontSize: 12, color: "var(--text-sub)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  High-priority ministerial dispatch gateway with DLT approval. Dispatches automated showcause and critical escalation directives to nodal officers.
                </p>

                <div style={{ background: "var(--surface-raised)", padding: 10, borderRadius: 6, fontSize: 11, color: "var(--text-sub)", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span>Success Rate:</span>
                    <span style={{ color: "#4ade80", fontWeight: 600 }}>{statusData.services.sms_gateway.delivery_success_rate}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Quota Remaining:</span>
                    <span style={{ color: "var(--text-primary)" }}>{statusData.services.sms_gateway.daily_quota_remaining.toLocaleString()} SMS</span>
                  </div>
                </div>

                {smsResult && (
                  <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.25)", borderRadius: 6, padding: 10, fontSize: 11, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, color: "#4ade80", marginBottom: 2 }}>✓ SMS Dispatched Successfully</div>
                    <div style={{ color: "var(--text-sub)" }}>Ref: {smsResult.dispatch_id} • To: {smsResult.recipient}</div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 6, background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 11 }}
                />
                <button
                  onClick={handleDispatchSms}
                  disabled={dispatchingSms}
                  style={{
                    padding: "8px 14px", borderRadius: 6, background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.3)", color: "#4ade80", fontSize: 11, fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {dispatchingSms ? "Sending..." : "Dispatch SMS"}
                </button>
              </div>
            </div>
          </div>

          {/* Activity Log / Dispatch Audit Trail */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Inter-Governmental Integration Dispatch Audit Trail ({logs.length})
              </h3>
              <button
                onClick={loadAll}
                style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
              >
                Refresh Logs
              </button>
            </div>

            {logs.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-sub)", margin: 0 }}>No integration events logged yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-sub)" }}>
                      <th style={{ padding: "8px 12px" }}>Time</th>
                      <th style={{ padding: "8px 12px" }}>Service</th>
                      <th style={{ padding: "8px 12px" }}>Event Type</th>
                      <th style={{ padding: "8px 12px" }}>Project</th>
                      <th style={{ padding: "8px 12px" }}>Recipient / Target</th>
                      <th style={{ padding: "8px 12px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const badgeColors: Record<string, { bg: string; color: string }> = {
                        gatishakti: { bg: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" },
                        digilocker: { bg: "rgba(168, 85, 247, 0.15)", color: "#c084fc" },
                        sms: { bg: "rgba(34, 197, 94, 0.15)", color: "#4ade80" },
                        email: { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" },
                      };
                      const conf = badgeColors[log.service.toLowerCase()] || { bg: "rgba(255,255,255,0.1)", color: "#fff" };

                      return (
                        <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 12px", color: "var(--text-sub)", whiteSpace: "nowrap" }}>
                            {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "Just now"}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 4, background: conf.bg, color: conf.color, fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                              {log.service}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "var(--text-primary)" }}>
                            {log.event_type}
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--text-primary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log.project_name || "—"}
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--text-sub)" }}>
                            {log.recipient || "—"}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: log.status === "SUCCESS" ? "#4ade80" : "#ef4444" }}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
