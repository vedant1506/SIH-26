"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { GFR175ScreeningResult, GFR175ScreeningStatus, GFR175StatusColor } from "@/lib/types";
import SourceCitation from "@/components/ui/SourceCitation";

export interface GFR175ComplianceCardProps {
  screening?: GFR175ScreeningResult | null;
  projectId?: string | null;
  contractorRiskTier?: string | null;
  projectRiskTier?: string | null;
  contractorName?: string | null;
  projectName?: string | null;
  variant?: "card" | "compact" | "banner";
  showInspectorButton?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function GFR175ComplianceCard({
  screening,
  projectId,
  contractorRiskTier,
  projectRiskTier,
  contractorName,
  projectName,
  variant = "card",
  showInspectorButton = true,
  className = "",
  style,
}: GFR175ComplianceCardProps) {
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

  const resolvedProjectId = projectId || screening?.project_id || null;

  // Normalize status and risk tier
  const status: GFR175ScreeningStatus =
    screening?.gfr175_screening_status ||
    "No Integrity Indicators Detected";

  const color: GFR175StatusColor =
    screening?.status_color ||
    (status === "Potential Integrity Concern"
      ? "RED"
      : status === "Compliance Review Required"
      ? "YELLOW"
      : "GREEN");

  // Contractor / Project risk tier remains strictly separate
  const resolvedRiskTier = (
    contractorRiskTier ||
    screening?.risk_tier ||
    projectRiskTier ||
    "MEDIUM"
  ).toUpperCase();

  const statusTheme = {
    GREEN: {
      bg: "rgba(16, 185, 129, 0.08)",
      border: "rgba(16, 185, 129, 0.3)",
      badgeBg: "rgba(16, 185, 129, 0.16)",
      badgeText: "#34d399",
      accent: "#10b981",
      glow: "0 0 20px rgba(16, 185, 129, 0.15)",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    YELLOW: {
      bg: "rgba(245, 158, 11, 0.08)",
      border: "rgba(245, 158, 11, 0.35)",
      badgeBg: "rgba(245, 158, 11, 0.16)",
      badgeText: "#fbbf24",
      accent: "#f59e0b",
      glow: "0 0 20px rgba(245, 158, 11, 0.15)",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    RED: {
      bg: "rgba(239, 68, 68, 0.08)",
      border: "rgba(239, 68, 68, 0.4)",
      badgeBg: "rgba(239, 68, 68, 0.18)",
      badgeText: "#f87171",
      accent: "#ef4444",
      glow: "0 0 20px rgba(239, 68, 68, 0.2)",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  }[color];

  const riskTierTheme = {
    CRITICAL: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)" },
    HIGH: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.4)" },
    MEDIUM: { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.4)" },
    MODERATE: { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.4)" },
    LOW: { color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.4)" },
  }[resolvedRiskTier] || { color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", border: "rgba(148, 163, 184, 0.4)" };

  const indicators = screening?.indicators || [];
  const evidenceObj = screening?.evidence;
  const rawEvidenceDesc =
    typeof evidenceObj === "string"
      ? evidenceObj
      : evidenceObj?.description || (evidenceObj as any)?.citation || "April 2026 Flash Report — Official MoSPI Record";

  const sourceDoc =
    typeof evidenceObj === "object" && evidenceObj?.source_document
      ? evidenceObj.source_document
      : "FlashReport_April_2026.pdf";
  const sourcePage =
    typeof evidenceObj === "object" ? evidenceObj?.source_page : null;
  const slNo =
    typeof evidenceObj === "object" ? evidenceObj?.sl_no : null;

  // Render COMPACT Variant (for lists, cards, tables)
  if (variant === "compact") {
    return (
      <div
        className={`gfr175-compact-card ${className}`}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "10px 12px",
          background: statusTheme.bg,
          border: `1px solid ${statusTheme.border}`,
          borderRadius: 8,
          fontSize: 12,
          ...style,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase" }}>
              GFR 175 Screening:
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: statusTheme.badgeText,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {statusTheme.icon}
              {status.toUpperCase()}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-sub)" }}>Risk Tier:</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "1px 6px",
                borderRadius: 4,
                background: riskTierTheme.bg,
                color: riskTierTheme.color,
                border: `1px solid ${riskTierTheme.border}`,
              }}
            >
              {resolvedRiskTier}
            </span>
          </div>
        </div>

        {indicators.length > 0 ? (
          <div style={{ fontSize: 11, color: "var(--text-primary)", display: "flex", flexDirection: "column", gap: 2 }}>
            {indicators.slice(0, 2).map((ind, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                <span style={{ color: statusTheme.accent, lineHeight: 1.2 }}>•</span>
                <span style={{ color: "var(--text-sub)", lineHeight: 1.3 }}>{ind}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#34d399" }}>
            No integrity indicators detected in audited disbursements.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, borderTop: `1px solid ${statusTheme.border}` }}>
          <SourceCitation
            source_document={sourceDoc}
            source_page={sourcePage}
            sl_no={slNo}
            source_type="MoSPI Flash Report"
            source_title={`Evidence: ${contractorName || projectName || rawEvidenceDesc}`}
            variant="inline"
            compact={true}
          />
          <span style={{ fontSize: 9.5, color: "var(--text-sub)", fontStyle: "italic" }}>
            Advisory screening only
          </span>
        </div>
      </div>
    );
  }

  // Render BANNER Variant
  if (variant === "banner") {
    return (
      <div
        className={`gfr175-banner ${className}`}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 18px",
          borderRadius: 8,
          background: statusTheme.bg,
          border: `1px solid ${statusTheme.border}`,
          boxShadow: statusTheme.glow,
          ...style,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {statusTheme.icon}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase" }}>
              GFR 175 Statutory Compliance Status
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: statusTheme.badgeText }}>
              {status}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SourceCitation
            source_document={sourceDoc}
            source_page={sourcePage}
            sl_no={slNo}
            source_type="MoSPI Flash Report"
            source_title={`Evidence: ${contractorName || projectName || rawEvidenceDesc}`}
            variant="badge"
          />
          <span style={{ fontSize: 11, color: "var(--text-sub)", fontStyle: "italic", maxWidth: 260, textAlign: "right" }}>
            Advisory screening — final determination remains with authorized officials.
          </span>
        </div>
      </div>
    );
  }

  // Render Default FULL CARD Variant (Matching example UI)
  return (
    <>
      <div
        className={`gfr175-compliance-card ${className}`}
        style={{
          background: "var(--surface, #0f172a)",
          border: `1px solid ${statusTheme.border}`,
          borderRadius: 12,
          padding: "20px 22px",
          position: "relative",
          boxShadow: statusTheme.glow,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          ...style,
        }}
      >
        {/* Header Ribbon */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 4,
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text-sub, #94a3b8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Statutory Advisory • GFR 2017 Rule 175
            </span>
            <span style={{ fontSize: 11, color: "var(--text-sub, #94a3b8)" }}>
              Code of Integrity for Public Procurement
            </span>
          </div>

          {showInspectorButton && (
            <button
              onClick={() => setShowDetailsModal(true)}
              style={{
                background: "transparent",
                border: "1px solid var(--border, rgba(255,255,255,0.15))",
                color: "var(--text-sub, #94a3b8)",
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Forensic Details
            </button>
          )}
        </div>

        {/* Dual Primary KPI Tiles: Contractor Risk vs GFR 175 Screening */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            background: "var(--surface-2)",
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          {/* Tile 1: Contractor / Project Risk (Kept Strictly Separate) */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub, #94a3b8)", textTransform: "uppercase", marginBottom: 4 }}>
              Contractor Risk
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: riskTierTheme.color,
                  letterSpacing: "0.02em",
                }}
              >
                {resolvedRiskTier}
              </span>
              {contractorName && (
                <span style={{ fontSize: 12, color: "var(--text-sub, #94a3b8)" }}>
                  ({contractorName})
                </span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-sub, #94a3b8)", marginTop: 2 }}>
              Independent ML & Forensic Execution Risk
            </div>
          </div>

          {/* Tile 2: GFR 175 Screening Status */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub, #94a3b8)", textTransform: "uppercase", marginBottom: 4 }}>
              GFR 175 Screening
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: statusTheme.badgeText,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  letterSpacing: "0.02em",
                }}
              >
                {statusTheme.icon}
                {status.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-sub, #94a3b8)", marginTop: 2 }}>
              Statutory Code of Integrity Triggers
            </div>
          </div>
        </div>

        {/* Detected Indicators List */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub, #94a3b8)", textTransform: "uppercase", marginBottom: 8 }}>
            Detected Indicators
          </div>
          {indicators.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {indicators.map((ind, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-primary, #f8fafc)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: statusTheme.accent, fontWeight: 800, fontSize: 14 }}>•</span>
                  <span>{ind}</span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontSize: 12.5,
                color: "#34d399",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                padding: "8px 12px",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>No integrity indicators detected. Financial disbursements correlate with physical delivery milestones.</span>
            </div>
          )}
        </div>

        {/* Official PDF Evidence Section (Reusing SourceCitation Component) */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub, #94a3b8)", textTransform: "uppercase", marginBottom: 6 }}>
            Evidence
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <SourceCitation
              source_document={sourceDoc}
              source_page={sourcePage}
              sl_no={slNo}
              source_type="MoSPI Flash Report"
              source_title={rawEvidenceDesc}
              variant="card"
              style={{ flex: 1, minWidth: 260 }}
            />
          </div>
        </div>

        {/* Integrated Workflow Navigation: GIS Location, Bhuvan View, Dossier & Actions */}
        {resolvedProjectId && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 2 }}>
            <Link
              href={`/map?project_id=${encodeURIComponent(resolvedProjectId)}&basemap=bhuvan`}
              className="btn btn-secondary btn-sm"
              style={{
                textDecoration: "none",
                fontSize: 11,
                fontWeight: 600,
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(6, 182, 212, 0.12)",
                color: "#38bdf8",
                borderColor: "rgba(56, 189, 248, 0.35)",
              }}
              title="Locate project on ISRO Bhuvan satellite GIS map"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                <line x1="9" y1="3" x2="9" y2="18"/>
                <line x1="15" y1="6" x2="15" y2="21"/>
              </svg>
              Locate on GIS (Bhuvan)
            </Link>
            <Link
              href={`/projects/${encodeURIComponent(resolvedProjectId)}`}
              className="btn btn-secondary btn-sm"
              style={{
                textDecoration: "none",
                fontSize: 11,
                fontWeight: 600,
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              title="Open authoritative Project Dossier"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              Project Dossier
            </Link>
            <Link
              href={`/actions?project_id=${encodeURIComponent(resolvedProjectId)}&project_name=${encodeURIComponent(projectName || screening?.project_name || "Project")}&title=${encodeURIComponent(`GFR 175 Directive: ${status}`)}&priority=${resolvedRiskTier.toLowerCase()}&action=new`}
              className="btn btn-primary btn-sm"
              style={{
                textDecoration: "none",
                fontSize: 11,
                fontWeight: 600,
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              title="Create intervention action item under GFR 175"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Action Workflow
            </Link>
          </div>
        )}

        {/* Advisory Disclaimer Notice (Mandatory Non-Adjudicative Safeguard) */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: "var(--text-sub, #94a3b8)",
            lineHeight: 1.4,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            <strong>Advisory screening</strong> — final determination remains with authorized officials.
            This screening does not establish a legal violation or constitute administrative disqualification.
          </span>
        </div>
      </div>

      {/* Forensic Audit Inspector Modal */}
      {showDetailsModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            style={{
              background: "var(--surface, #0f172a)",
              border: `1px solid ${statusTheme.border}`,
              borderRadius: 12,
              padding: 24,
              maxWidth: 680,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: statusTheme.badgeBg, color: statusTheme.badgeText }}>
                  GFR 175 FORENSIC DOSSIER
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  Audit Trail & Structured Record
                </span>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-sub)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 16, fontSize: 13, color: "var(--text-sub)", lineHeight: 1.6 }}>
              {screening?.explanation || "Statutory compliance screening record under Rule 175 of the General Financial Rules, 2017."}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase", marginBottom: 6 }}>
                Official Evidence Link
              </div>
              <SourceCitation
                source_document={sourceDoc}
                source_page={sourcePage}
                sl_no={slNo}
                source_type="MoSPI Flash Report"
                source_title={rawEvidenceDesc}
                variant="card"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase", marginBottom: 6 }}>
                Structured Machine-Readable Output (JSON)
              </div>
              <pre
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 11.5,
                  color: "#38bdf8",
                  overflowX: "auto",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {JSON.stringify(screening, null, 2)}
              </pre>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              {resolvedProjectId ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Link
                    href={`/map?project_id=${encodeURIComponent(resolvedProjectId)}&basemap=bhuvan`}
                    className="btn btn-secondary btn-sm"
                    style={{
                      textDecoration: "none",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "6px 12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: "rgba(6, 182, 212, 0.12)",
                      color: "#38bdf8",
                      borderColor: "rgba(56, 189, 248, 0.35)",
                    }}
                  >
                    Locate on GIS (Bhuvan)
                  </Link>
                  <Link
                    href={`/projects/${encodeURIComponent(resolvedProjectId)}`}
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: "none", fontSize: 11, fontWeight: 600, padding: "6px 12px" }}
                  >
                    Project Dossier
                  </Link>
                  <Link
                    href={`/actions?project_id=${encodeURIComponent(resolvedProjectId)}&project_name=${encodeURIComponent(projectName || screening?.project_name || "Project")}&title=${encodeURIComponent(`GFR 175 Directive: ${status}`)}&priority=${resolvedRiskTier.toLowerCase()}&action=new`}
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: "none", fontSize: 11, fontWeight: 600, padding: "6px 12px" }}
                  >
                    Action Workflow
                  </Link>
                </div>
              ) : <div />}

              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
