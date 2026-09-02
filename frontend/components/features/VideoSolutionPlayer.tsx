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

  const barHeights = [15, 35, 60, 45, 80, 50, 65, 30, 90, 40, 70, 55, 85, 30, 60, 45, 75, 25, 65, 50, 40, 70, 35, 60];

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
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect width="15" height="14" x="1" y="5" rx="2" ry="2"/>
            </svg>
            PRISM AI Executive Video Solution Briefing
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: "var(--accent-glow-2)",
                  border: "1px solid var(--accent-glow)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--accent)",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z"/>
                  <rect width="14" height="12" x="2" y="6" rx="2"/>
                </svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                PRISM AI Executive Video Solution Briefing
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: tierColor,
                background: `${tierColor}15`,
                padding: "2px 8px",
                borderRadius: 4,
                border: `1px solid ${tierColor}40`,
                textTransform: "uppercase",
              }}
            >
              {pred?.risk_tier || "Executive"} Assessment
            </span>
          </div>

          <div
            style={{
              position: "relative",
              height: 240,
              background: "linear-gradient(180deg, #090d16 0%, #0f172a 100%)",
              borderRadius: 8,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ position: "absolute", bottom: 20, left: 24, right: 24, height: 50, display: "flex", alignItems: "flex-end", gap: 4, opacity: isPlaying ? 0.85 : 0.25, transition: "opacity 0.3s ease" }}>
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: `linear-gradient(180deg, ${tierColor} 0%, rgba(6, 182, 212, 0.4) 100%)`,
                    borderRadius: "2px 2px 0 0",
                    transition: "height 0.12s ease",
                  }}
                />
              ))}
            </div>

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
                overflow: "hidden",
                marginBottom: 14,
                zIndex: 2,
                transform: isPlaying ? "scale(1.08)" : "scale(1)",
                transition: "all 0.3s ease",
              }}
            >
              <img
                src="/logo.jpg"
                alt="PRISM AI"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", zIndex: 2, marginBottom: 4 }}>
              PRISM AI Avatar Solution Presenter
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", zIndex: 2, marginBottom: 16 }}>
              Fine-Tuned Hugging Face Qwen-2.5 4-Bit Model Speech Engine
            </div>

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

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={togglePlay}
              className="btn btn-primary"
              style={{ padding: "6px 14px", fontSize: 12, minWidth: 100, justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}
            >
              {isPlaying ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <span>Play Briefing</span>
                </>
              )}
            </button>
            <button
              onClick={replay}
              className="btn btn-secondary"
              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>Replay</span>
            </button>

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
