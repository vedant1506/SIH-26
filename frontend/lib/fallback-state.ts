// ============================================================
// Data Mode State Manager — SIH26103 Phase 2
// Centralized state for LIVE DATA MODE vs. OFFLINE FALLBACK MODE
// ============================================================

"use client";

import { useEffect, useState } from "react";

export type DataMode = "LIVE DATA MODE" | "OFFLINE FALLBACK MODE";

export interface DataModeStatus {
  mode: DataMode;
  isFallback: boolean;
  lastFailureReason?: string;
  lastCheckedAt: string;
}

const EVENT_NAME = "prism:datamode-change";
const STORAGE_KEY = "prism_data_mode";
const MANUAL_KEY = "prism_data_mode_manual";

function getInitialMode(): DataMode {
  if (typeof window !== "undefined") {
    try {
      const isManual = localStorage.getItem(MANUAL_KEY) === "true";
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isManual && (saved === "OFFLINE FALLBACK MODE" || saved === "LIVE DATA MODE")) {
        return saved;
      }
    } catch {}
  }
  return "LIVE DATA MODE";
}

// Module-level singleton state
let currentMode: DataMode = getInitialMode();
let lastFailureReason: string | undefined = undefined;
let lastCheckedAt = new Date().toISOString();

// Simulation flags for testing and QA
let simulateFailure = false;
let simulateTimeoutMs = 0;

export function getDataMode(): DataMode {
  return currentMode;
}

export function isFallbackMode(): boolean {
  return currentMode === "OFFLINE FALLBACK MODE";
}

export function getLastFailureReason(): string | undefined {
  return lastFailureReason;
}

export function setSimulateApiFailure(enabled: boolean) {
  simulateFailure = enabled;
  if (enabled) {
    setDataMode("OFFLINE FALLBACK MODE", "Simulated API Failure Active", false);
  } else {
    setDataMode("LIVE DATA MODE", undefined, false);
  }
}

export function isSimulatingApiFailure(): boolean {
  return simulateFailure;
}

export function setSimulateTimeout(ms: number) {
  simulateTimeoutMs = ms;
  if (ms > 0) {
    setDataMode("OFFLINE FALLBACK MODE", `Simulated Request Timeout (${ms}ms)`, false);
  } else {
    setDataMode("LIVE DATA MODE", undefined, false);
  }
}

export function getSimulateTimeout(): number {
  return simulateTimeoutMs;
}

export function setDataMode(mode: DataMode, reason?: string, isManual: boolean = true) {
  const changed = currentMode !== mode || lastFailureReason !== reason;
  currentMode = mode;
  lastFailureReason = reason;
  lastCheckedAt = new Date().toISOString();

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
      localStorage.setItem(MANUAL_KEY, isManual ? "true" : "false");
    } catch {
      // Storage blocked or unavailable
    }

    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: {
            mode,
            isFallback: mode === "OFFLINE FALLBACK MODE",
            lastFailureReason: reason,
            lastCheckedAt,
          },
        })
      );
    } catch {
      // Ignore if event dispatch fails in restricted environments
    }
  }

  if (changed && process.env.NODE_ENV !== "production") {
    console.info(`[PRISM DataMode] Transitioned to -> ${mode}${reason ? ` (${reason})` : ""}`);
  }
}

/**
 * Explicit toggle function for UI buttons
 */
export function toggleDataMode(reason?: string): DataMode {
  const nextMode: DataMode = currentMode === "LIVE DATA MODE" ? "OFFLINE FALLBACK MODE" : "LIVE DATA MODE";
  setDataMode(nextMode, reason || (nextMode === "OFFLINE FALLBACK MODE" ? "Manual Offline Demo Selected" : undefined), true);
  return nextMode;
}

export function enableFallbackMode(reason: string = "User activated offline fallback") {
  setDataMode("OFFLINE FALLBACK MODE", reason, true);
}

export function enableLiveMode() {
  setDataMode("LIVE DATA MODE", undefined, true);
}

export function subscribeDataMode(callback: (status: DataModeStatus) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<DataModeStatus>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}

/**
 * React hook to listen to Live vs Offline Fallback Mode in components
 */
export function useDataMode(): DataModeStatus {
  const [status, setStatus] = useState<DataModeStatus>({
    mode: currentMode,
    isFallback: currentMode === "OFFLINE FALLBACK MODE",
    lastFailureReason,
    lastCheckedAt,
  });

  useEffect(() => {
    // Initial sync
    setStatus({
      mode: currentMode,
      isFallback: currentMode === "OFFLINE FALLBACK MODE",
      lastFailureReason,
      lastCheckedAt,
    });

    return subscribeDataMode((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  return status;
}
