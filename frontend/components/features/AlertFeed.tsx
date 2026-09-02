"use client";
import { useEffect, useState, useMemo } from "react";
import { listAlerts, acknowledgeAlert, acknowledgeAllAlerts } from "@/lib/api";
import type { Alert } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

const TIER_VAR: Record<string, string> = {
  critical: "var(--critical)",
  high:     "var(--high)",
  medium:   "var(--medium)",
  low:      "var(--low)",
};

interface Props {
  maxItems?: number;
  compact?: boolean;
}

export default function AlertFeed({ maxItems, compact = false }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"priority" | "newest" | "oldest">("priority");
  const [acking, setAcking] = useState<string | null>(null);
  const [ackingAll, setAckingAll] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(50);

  async function load() {
    try {
      setLoading(true);
      const data = await listAlerts(unreadOnly, maxItems);
      setAlerts(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [unreadOnly, maxItems]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTier, selectedMonth, unreadOnly, pageSize, sortOrder]);

  async function handleAck(id: string) {
    setAcking(id);
    try {
      await acknowledgeAlert(id);
      setAlerts(a => a.map(x => (x.id === id ? { ...x, is_acknowledged: true } : x)));
    } catch {
      /* ignore */
    } finally {
      setAcking(null);
    }
  }

  async function handleAckAll() {
    if (!window.confirm("Are you sure you want to acknowledge all active alerts?")) return;
    setAckingAll(true);
    try {
      await acknowledgeAllAlerts();
      setAlerts(a => a.map(x => ({ ...x, is_acknowledged: true })));
    } catch {
      /* ignore */
    } finally {
      setAckingAll(false);
    }
  }

  // Tier counts
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { all: alerts.length, critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach(a => {
      const t = (a.new_tier || "").toLowerCase();
      if (counts[t] !== undefined) counts[t]++;
    });
    return counts;
  }, [alerts]);

  // Available unique months list
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, { label: string; time: number; count: number }>();
    alerts.forEach(a => {
      if (a.triggered_at) {
        const d = new Date(a.triggered_at);
        const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, { label, time: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), count: 0 });
        }
        monthMap.get(key)!.count++;
      }
    });
    return Array.from(monthMap.entries())
      .sort((a, b) => b[1].time - a[1].time)
      .map(([key, v]) => ({ key, label: v.label, count: v.count }));
  }, [alerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    const filtered = alerts.filter(a => {
      if (selectedTier !== "all" && (a.new_tier || "").toLowerCase() !== selectedTier) {
        return false;
      }
      if (selectedMonth !== "all") {
        const d = new Date(a.triggered_at);
        const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
        if (label !== selectedMonth) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (a.project_name || "").toLowerCase().includes(q);
        const msgMatch = (a.message || "").toLowerCase().includes(q);
        if (!nameMatch && !msgMatch) return false;
      }
      return true;
    });

    if (sortOrder === "newest") {
      return [...filtered].sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
    }
    if (sortOrder === "oldest") {
      return [...filtered].sort((a, b) => new Date(a.triggered_at).getTime() - new Date(b.triggered_at).getTime());
    }
    return filtered;
  }, [alerts, selectedTier, selectedMonth, searchQuery, sortOrder]);

  // Paginated alerts
  const totalPages = pageSize === "all" ? 1 : Math.ceil(filteredAlerts.length / (pageSize as number));
  const displayedAlerts = useMemo(() => {
    if (compact || pageSize === "all") return filteredAlerts;
    const size = pageSize as number;
    const start = (currentPage - 1) * size;
    return filteredAlerts.slice(start, start + size);
  }, [filteredAlerts, currentPage, pageSize, compact]);

  const unreadCount = useMemo(() => alerts.filter(a => !a.is_acknowledged).length, [alerts]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 74, borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  if (!alerts.length) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)", fontSize: 14 }}>
        {unreadOnly ? "No unacknowledged alerts found" : "No alerts recorded yet"}
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          {/* Header Summary & Tier Filter Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedTier("all")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid",
                  cursor: "pointer",
                  background: selectedTier === "all" ? "var(--accent)" : "var(--surface-2)",
                  color: selectedTier === "all" ? "#000" : "var(--text)",
                  borderColor: selectedTier === "all" ? "var(--accent)" : "var(--border)",
                  transition: "all 0.15s ease",
                }}
              >
                All ({tierCounts.all.toLocaleString()})
              </button>

              <button
                type="button"
                onClick={() => setSelectedTier("critical")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid",
                  cursor: "pointer",
                  background: selectedTier === "critical" ? "var(--critical)" : "rgba(244, 63, 94, 0.1)",
                  color: selectedTier === "critical" ? "#fff" : "var(--critical)",
                  borderColor: "var(--critical)",
                  transition: "all 0.15s ease",
                }}
              >
                Critical ({tierCounts.critical.toLocaleString()})
              </button>

              <button
                type="button"
                onClick={() => setSelectedTier("high")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid",
                  cursor: "pointer",
                  background: selectedTier === "high" ? "var(--high)" : "rgba(245, 158, 11, 0.1)",
                  color: selectedTier === "high" ? "#000" : "var(--high)",
                  borderColor: "var(--high)",
                  transition: "all 0.15s ease",
                }}
              >
                High ({tierCounts.high.toLocaleString()})
              </button>

              <button
                type="button"
                onClick={() => setSelectedTier("medium")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid",
                  cursor: "pointer",
                  background: selectedTier === "medium" ? "var(--medium)" : "rgba(234, 179, 8, 0.1)",
                  color: selectedTier === "medium" ? "#000" : "var(--medium)",
                  borderColor: "var(--medium)",
                  transition: "all 0.15s ease",
                }}
              >
                Medium ({tierCounts.medium.toLocaleString()})
              </button>

              <button
                type="button"
                onClick={() => setSelectedTier("low")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid",
                  cursor: "pointer",
                  background: selectedTier === "low" ? "var(--low)" : "rgba(16, 185, 129, 0.1)",
                  color: selectedTier === "low" ? "#fff" : "var(--low)",
                  borderColor: "var(--low)",
                  transition: "all 0.15s ease",
                }}
              >
                Low ({tierCounts.low.toLocaleString()})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAckAll}
                disabled={ackingAll}
                style={{ fontSize: 12, padding: "5px 12px" }}
              >
                {ackingAll ? "Acknowledging all..." : `Acknowledge All (${unreadCount})`}
              </button>
            )}
          </div>

          {/* Search, Month Filter, Sort, Status & Page Size Controls */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 260, maxWidth: 460 }}>
              <input
                type="text"
                placeholder="Search projects, ministries, or alert keywords..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  outline: "none",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    marginLeft: -32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Clear search"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              {/* Month/Year Filter Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                <span>Report Month:</span>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "5px 8px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Months ({alerts.length})</option>
                  {availableMonths.map(m => (
                    <option key={m.key} value={m.label}>
                      {m.label} ({m.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                <span>Sort:</span>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as any)}
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "5px 8px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <option value="priority">Priority (Critical first)</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {/* Status filter */}
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-sub)", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  id="unread-toggle"
                  checked={unreadOnly}
                  onChange={e => setUnreadOnly(e.target.checked)}
                />
                Unacknowledged only
              </label>

              {/* Page size */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))}
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "5px 8px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value="all">All ({filteredAlerts.length})</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
            <span>
              Showing {pageSize === "all" ? `all ${filteredAlerts.length}` : `${Math.min((currentPage - 1) * (pageSize as number) + 1, filteredAlerts.length)}–${Math.min(currentPage * (pageSize as number), filteredAlerts.length)} of ${filteredAlerts.length}`} alerts
              {filteredAlerts.length !== alerts.length ? ` (filtered from ${alerts.length} total)` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!displayedAlerts.length && (
          <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>
            No matching alerts found for the selected filter.
          </div>
        )}

        {displayedAlerts.map(a => {
          const tierColor = TIER_VAR[a.new_tier || "low"] || "var(--text-muted)";
          const isAcked = a.is_acknowledged;
          const dateObj = new Date(a.triggered_at);
          const monthStr = dateObj.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

          return (
            <div
              key={a.id}
              id={`alert-${a.id}`}
              style={{
                padding: compact ? "11px 13px" : "14px 16px",
                background: isAcked
                  ? "var(--surface-2)"
                  : a.new_tier === "critical"
                  ? "rgba(244, 63, 94, 0.07)"
                  : a.new_tier === "high"
                  ? "rgba(245, 158, 11, 0.07)"
                  : "rgba(255, 255, 255, 0.02)",
                border: `1px solid ${
                  isAcked
                    ? "var(--border)"
                    : a.new_tier === "critical"
                    ? "rgba(244, 63, 94, 0.28)"
                    : a.new_tier === "high"
                    ? "rgba(245, 158, 11, 0.28)"
                    : "var(--border)"
                }`,
                borderRadius: 10,
                opacity: isAcked ? 0.6 : 1,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: tierColor,
                  flexShrink: 0,
                  marginTop: 4,
                  boxShadow: `0 0 8px ${tierColor}`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={`/projects/${a.project_id}`}
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--text)",
                    textDecoration: "none",
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text)")}
                >
                  {a.project_name}
                </a>

                {a.message && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 3,
                      lineHeight: 1.4,
                      whiteSpace: compact ? "nowrap" : "normal",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {a.message}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "rgba(255, 255, 255, 0.05)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: "1px solid var(--border-2)",
                    }}
                  >
                    {a.previous_tier && (
                      <span style={{ fontSize: 10, color: TIER_VAR[a.previous_tier] || "var(--text-muted)", fontWeight: 700 }}>
                        {a.previous_tier.toUpperCase()}
                      </span>
                    )}
                    {a.previous_tier && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 800, color: tierColor }}>
                      {(a.new_tier || "").toUpperCase()}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--accent)",
                      background: "rgba(6, 182, 212, 0.1)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {monthStr}
                  </span>

                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    · {formatDistanceToNow(dateObj, { addSuffix: true })}
                  </span>

                  {isAcked && <span style={{ fontSize: 10, color: "var(--low)", fontWeight: 600 }}>Acknowledged</span>}
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

      {/* Pagination Controls */}
      {!compact && pageSize !== "all" && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 24,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Page {currentPage} of {totalPages} ({filteredAlerts.length} total alerts)
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              style={{ padding: "4px 8px", fontSize: 11 }}
            >
              « First
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              ‹ Prev
            </button>

            {/* Quick jump page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = currentPage - 2 + i;
              if (currentPage < 3) pageNum = 1 + i;
              if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
              if (pageNum < 1 || pageNum > totalPages) return null;

              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    border: "1px solid",
                    borderColor: isActive ? "var(--accent)" : "var(--border)",
                    background: isActive ? "var(--accent)" : "var(--surface-2)",
                    color: isActive ? "#000" : "var(--text)",
                    cursor: "pointer",
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              Next ›
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{ padding: "4px 8px", fontSize: 11 }}
            >
              Last »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
