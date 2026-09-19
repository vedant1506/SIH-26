"use client";

import React, { useState } from "react";
import { useDataMode, setDataMode } from "@/lib/fallback-state";
import { toast } from "sonner";

export default function OfflineFallbackBanner() {
  const { isFallback, lastFailureReason } = useDataMode();
  const [retrying, setRetrying] = useState(false);

  if (!isFallback) {
    return null;
  }

  const handleRetryConnection = async () => {
    setRetrying(true);
    const toastId = toast.loading("Checking backend connectivity...");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/v1/projects?limit=1`, {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        setDataMode("LIVE DATA MODE", undefined, true);
        toast.success("Live backend connected! Switched to LIVE DATA MODE.", { id: toastId });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("prism:refetch-live-data"));
          window.location.reload();
        }
      } else {
        toast.error(`Backend returned HTTP ${res.status}.`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Backend check failed (${err?.message || "Connection refused"}).`, { id: toastId });
    } finally {
      setRetrying(false);
    }
  };

  const handleForceLive = () => {
    setDataMode("LIVE DATA MODE", undefined, true);
    toast.success("Switched to LIVE DATA MODE.");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("prism:refetch-live-data"));
      window.location.reload();
    }
  };

  return (
    <aside
      aria-label="Offline Fallback Mode Banner"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        width: "100%",
        background: "linear-gradient(90deg, rgba(245, 158, 11, 0.14) 0%, rgba(217, 119, 6, 0.18) 50%, rgba(245, 158, 11, 0.14) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(245, 158, 11, 0.35)",
        boxShadow: "0 2px 10px rgba(245, 158, 11, 0.08)",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px",
        fontSize: "12px",
        color: "var(--text-primary, #ffffff)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {/* Pulsing indicator */}
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "8px",
            height: "8px",
          }}
        >
          <span
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "#f59e0b",
              opacity: 0.75,
              animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
            }}
          />
          <span
            style={{
              position: "relative",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#d97706",
            }}
          />
        </span>

        {/* Primary required banner text */}
        <span style={{ fontWeight: 700, letterSpacing: "-0.01em", color: "#fef3c7" }}>
          Offline Fallback Mode — Showing demo/cached intelligence
        </span>

        {/* Tag badge */}
        <span
          style={{
            background: "rgba(245, 158, 11, 0.25)",
            border: "1px solid rgba(245, 158, 11, 0.5)",
            color: "#fbbf24",
            padding: "1px 7px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          DEMO / FALLBACK DATA
        </span>

        {lastFailureReason && (
          <span
            style={{
              color: "rgba(254, 243, 199, 0.7)",
              fontSize: "11px",
              maxWidth: "340px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={lastFailureReason}
          >
            ({lastFailureReason})
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={handleRetryConnection}
          disabled={retrying}
          style={{
            background: "rgba(245, 158, 11, 0.25)",
            border: "1px solid rgba(245, 158, 11, 0.6)",
            color: "#fff",
            padding: "4px 12px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 600,
            cursor: retrying ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245, 158, 11, 0.38)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(245, 158, 11, 0.25)")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: retrying ? "spin 1s linear infinite" : "none" }}
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {retrying ? "Pinging API..." : "Reconnect Live API"}
        </button>

        <button
          onClick={handleForceLive}
          title="Exit offline fallback mode and connect directly to live backend"
          style={{
            background: "rgba(16, 185, 129, 0.22)",
            border: "1px solid rgba(16, 185, 129, 0.5)",
            color: "#34d399",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(16, 185, 129, 0.35)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(16, 185, 129, 0.22)")}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>⚡</span>
          Switch to Live
        </button>
      </div>

      <style jsx>{`
        @keyframes ping {
          75%,
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </aside>
  );
}
