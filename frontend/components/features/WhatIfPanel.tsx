"use client";
import { useState } from "react";
import { predictProject } from "@/lib/api";
import type { RiskPrediction } from "@/lib/types";
import RiskBadge from "@/components/ui/RiskBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Props { projectId: string; currentScore?: number; onResult?: (p: RiskPrediction) => void; }

export default function WhatIfPanel({ projectId, currentScore, onResult }: Props) {
  const [budget, setBudget] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskPrediction | null>(null);
  const [error, setError] = useState("");

  async function simulate() {
    setLoading(true); setError("");
    try {
      const payload: Record<string, number> = {};
      if (budget !== 0) payload.revised_cost_cr = budget;
      if (progress !== null) payload.physical_progress_pct = progress;
      const pred = await predictProject(projectId, payload);
      setResult(pred);
      onResult?.(pred);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally { setLoading(false); }
  }

  const TIER_COLOR: Record<string, string> = { critical: "#f43f5e", high: "#f59e0b", medium: "#3b82f6", low: "#10b981" };

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
        Adjust hypothetical values below and run the simulation to see how the AI model recalculates the risk score.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Budget Injection (₹ Cr)</label>
            <span className="tabular" style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>+₹{budget} Cr</span>
          </div>
          <input id="whatif-budget" type="range" min={0} max={2000} step={50} value={budget} onChange={e => setBudget(Number(e.target.value))} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 2 }}>
            <span>₹0</span><span>₹2,000 Cr</span>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Adjusted Physical Progress</label>
            <span className="tabular" style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>{progress ?? "—"}%</span>
          </div>
          <input id="whatif-progress" type="range" min={0} max={100} step={1} value={progress ?? 50} onChange={e => setProgress(Number(e.target.value))} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 2 }}>
            <span>0%</span><span>100%</span>
          </div>
        </div>
      </div>

      {error && <div style={{ color: "#f43f5e", fontSize: 12, marginBottom: 12 }}>{error}</div>}

      <button id="whatif-run" className="btn btn-primary" onClick={simulate} disabled={loading} style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}>
        {loading ? <LoadingSpinner size={16} /> : "▶ Run Simulation"}
      </button>

      {result && (
        <div style={{ padding: 16, background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 10 }} className="animate-fade">
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Simulation Result</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: TIER_COLOR[result.risk_tier] || "#94a3b8" }}>
                {(result.composite_risk_score * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Composite Risk Score</div>
            </div>
            <RiskBadge tier={result.risk_tier} size="lg" />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <div>
              <div className="tabular" style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{(result.delay_probability * 100).toFixed(0)}%</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Delay Probability</div>
            </div>
            <div>
              <div className="tabular" style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{(result.cost_overrun_probability * 100).toFixed(0)}%</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Cost Overrun Risk</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
