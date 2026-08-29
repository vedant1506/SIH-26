"use client";
import { useState, useEffect, useRef } from "react";
import type { Project, RiskPrediction } from "@/lib/types";

interface Props {
  project: Project;
  prediction: RiskPrediction | null;
}

export default function VideoSolutionPlayer({ project: p, prediction: pred }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"video" | "transcript">("video");
  const duration = 90; // 1:30 briefing duration

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    setProgress((currentTime / duration) * 100);
  }, [currentTime]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const replay = () => {
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const tierColor = pred
    ? pred.risk_tier === "critical"
      ? "#f43f5e"
      : pred.risk_tier === "high"
      ? "#f59e0b"
      : pred.risk_tier === "medium"
      ? "#3b82f6"
      : "#10b981"
    : "#06b6d4";

  const scriptText = [
    `Welcome to the PRISM AI Executive Video Briefing for ${p.project_name}.`,
    `Our fine-tuned Hugging Face Qwen-2.5 4-Bit QLoRA AI model has evaluated this project in the ${p.sector} sector (${p.state}).`,
    pred
      ? `The project is classified under ${pred.risk_tier.toUpperCase()} risk tier with a composite risk score of ${(pred.composite_risk_score * 100).toFixed(0)}%.`
      : `Risk assessment is currently pending initialization.`,
    p.burn_progress_gap != null
      ? `Financial expenditure leads physical work completion by ${p.burn_progress_gap > 0 ? "+" : ""}${p.burn_progress_gap.toFixed(1)} percentage points.`
      : `Expenditure tracking is active.`,
    `Recommended Solution: Execute immediate joint site audit, freeze unverified invoice claims, and authorize milestone-linked escrow account releases.`,
  ];

  return (
    <div className="card animate-fade" style={{ marginBottom: 24, background: "var(--surface)", border: "1px solid var(--border-2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f43f5e" }} className="animate-pulse" />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)" }}>
            🎥 PRISM AI Executive Video Solution Briefing
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setActiveTab("video")}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "video" ? "var(--accent)" : "var(--surface-2)",
              color: activeTab === "video" ? "#ffffff" : "var(--text-sub)",
            }}
          >
            Video Briefing Player
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "transcript" ? "var(--accent)" : "var(--surface-2)",
              color: activeTab === "transcript" ? "#ffffff" : "var(--text-sub)",
            }}
          >
            Full AI Transcript
          </button>
        </div>
      </div>

      {activeTab === "video" ? (
        <div>
          {/* Simulated Video Canvas / Avatar Box */}
          <div
            style={{
              position: "relative",
              height: 240,
              borderRadius: 10,
              background: "linear-gradient(135deg, #090d16 0%, #0f172a 100%)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justify: "center",
              overflow: "hidden",
              padding: 20,
            }}
          >
            {/* Background Animated Pulse Waves */}
            {isPlaying && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(circle, ${tierColor}20 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
                className="animate-pulse"
              />
            )}

            {/* AI Avatar Shield Logo Icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(15, 23, 42, 0.9)",
                border: `2px solid ${tierColor}`,
                boxShadow: `0 0 20px ${tierColor}80`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                marginBottom: 14,
                zIndex: 2,
                transform: isPlaying ? "scale(1.08)" : "scale(1)",
                transition: "all 0.3s ease",
              }}
            >
              🤖
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", zIndex: 2, marginBottom: 4 }}>
              PRISM AI Avatar Solution Presenter
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", zIndex: 2, marginBottom: 16 }}>
              Fine-Tuned Hugging Face Qwen-2.5 4-Bit Model Speech Engine
            </div>

            {/* Dynamic Synchronized Subtitle Text */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.85)",
                backdropFilter: "blur(8px)",
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                maxWidth: "85%",
                textAlign: "center",
                fontSize: 12,
                color: "#38bdf8",
                fontWeight: 500,
                zIndex: 2,
                lineHeight: 1.4,
              }}
            >
              "{scriptText[Math.min(Math.floor((currentTime / duration) * scriptText.length), scriptText.length - 1)]}"
            </div>
          </div>

          {/* Player Controls Bar */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={togglePlay}
              className="btn btn-primary"
              style={{ padding: "6px 14px", fontSize: 12, minWidth: 90, justifyContent: "center" }}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play Briefing"}
            </button>
            <button
              onClick={replay}
              className="btn btn-secondary"
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              🔁 Replay
            </button>

            {/* Progress Scrub Bar */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: tierColor, transition: "width 0.3s ease" }} />
              </div>
              <span className="tabular" style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 600 }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Full AI Transcript View */
        <div style={{ background: "var(--surface-2)", padding: 16, borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>
            Complete AI Briefing Transcript
          </div>
          {scriptText.map((line, idx) => (
            <div key={idx} style={{ fontSize: 12, color: "var(--text)", marginBottom: 10, lineHeight: 1.5, display: "flex", gap: 8 }}>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>[{formatTime(idx * 18)}]</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
