"use client";

import React from "react";

export interface SourceCitationProps {
  // Document path or filename
  documentPath?: string;
  documentName?: string;
  sourceDocument?: string;
  source_document?: string;

  // Page number
  pageNumber?: number | string | null;
  sourcePage?: number | string | null;
  source_page?: number | string | null;

  // Serial Number in Report / Table
  slNo?: number | string | null;
  sl_no?: number | string | null;
  serialNumber?: number | string | null;

  // Source type (e.g. "MoSPI Flash Report", "DPR", "CAG Audit")
  sourceType?: string;
  source_type?: string;

  // Optional source title or description
  sourceTitle?: string;
  source_title?: string;

  // Fallback document if specific document is not given
  fallbackDocument?: string;

  // Visual styling variants
  variant?: "badge" | "inline" | "button" | "card" | "banner";
  className?: string;
  style?: React.CSSProperties;
  showIcon?: boolean;
  compact?: boolean;
}

const DEFAULT_FALLBACK_DOC = "mospi_flash_report.pdf";

export default function SourceCitation({
  documentPath,
  documentName,
  sourceDocument,
  source_document,
  pageNumber,
  sourcePage,
  source_page,
  slNo,
  sl_no,
  serialNumber,
  sourceType,
  source_type,
  sourceTitle,
  source_title,
  fallbackDocument = DEFAULT_FALLBACK_DOC,
  variant = "badge",
  className = "",
  style,
  showIcon = true,
  compact = false,
}: SourceCitationProps) {
  // 1. Resolve Document Name
  let rawDoc = source_document || sourceDocument || documentName || documentPath || "";
  
  // Strip any leading slashes or directories if full path is passed
  if (rawDoc.includes("/")) {
    rawDoc = rawDoc.split("/").pop() || "";
  }
  // Strip query params or hash if already attached
  if (rawDoc.includes("#")) {
    rawDoc = rawDoc.split("#")[0];
  }
  if (rawDoc.includes("?")) {
    rawDoc = rawDoc.split("?")[0];
  }
  
  const doc = rawDoc.trim() || fallbackDocument;

  // 2. Resolve Page Number & Serial Number (must come from schema/props, not hardcoded)
  const rawPage = source_page ?? sourcePage ?? pageNumber;
  const pageNum = rawPage != null && !isNaN(Number(rawPage)) && Number(rawPage) > 0 ? Number(rawPage) : null;
  const pageHash = pageNum ? `#page=${pageNum}` : "";

  const rawSlNo = sl_no ?? slNo ?? serialNumber;
  const slNoVal = rawSlNo != null && !isNaN(Number(rawSlNo)) && Number(rawSlNo) > 0 ? Number(rawSlNo) : (rawSlNo ? String(rawSlNo).trim() : null);

  // 3. Resolve Source Type & Title
  const typeLabel = source_type || sourceType || "MoSPI Flash Report";
  const titleLabel = source_title || sourceTitle;

  // 4. Construct PDF Link: /documents/{document}#page={page}
  const href = `/documents/${encodeURIComponent(doc)}${pageHash}`;

  // Tooltip
  const metaParts: string[] = [];
  if (slNoVal != null) metaParts.push(`Sl. No. ${slNoVal}`);
  if (pageNum != null) metaParts.push(`Page ${pageNum}`);
  const metaStr = metaParts.length > 0 ? ` (${metaParts.join(", ")})` : "";
  const tooltipText = titleLabel
    ? `Open official ${typeLabel} (${doc})${metaStr} — ${titleLabel}`
    : `Open official ${typeLabel} (${doc})${metaStr} in new tab`;

  // PDF Icon SVG
  const pdfIcon = (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );

  // External link arrow SVG
  const externalIcon = (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.7, flexShrink: 0 }}
      aria-hidden="true"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );

  // Render variant: INLINE
  if (variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltipText}
        className={`source-citation-inline ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--accent, #06b6d4)",
          textDecoration: "none",
          padding: "1px 6px",
          borderRadius: 4,
          background: "rgba(6, 182, 212, 0.08)",
          border: "1px solid rgba(6, 182, 212, 0.22)",
          transition: "all 0.15s ease-in-out",
          verticalAlign: "middle",
          cursor: "pointer",
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(6, 182, 212, 0.18)";
          e.currentTarget.style.borderColor = "var(--accent, #06b6d4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(6, 182, 212, 0.08)";
          e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.22)";
        }}
      >
        {showIcon && pdfIcon}
        <span>
          [{typeLabel}
          {slNoVal != null ? ` • Sl. No. ${slNoVal}` : ""}
          {pageNum ? ` • Page ${pageNum}` : ""}]
        </span>
        {externalIcon}
      </a>
    );
  }

  // Render variant: BUTTON
  if (variant === "button") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltipText}
        className={`source-citation-button btn ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: "#fff",
          textDecoration: "none",
          padding: "6px 12px",
          borderRadius: 6,
          background: "rgba(6, 182, 212, 0.15)",
          border: "1px solid rgba(6, 182, 212, 0.35)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(6, 182, 212, 0.28)";
          e.currentTarget.style.borderColor = "var(--accent, #06b6d4)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(6, 182, 212, 0.15)";
          e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.35)";
          e.currentTarget.style.transform = "none";
        }}
      >
        {showIcon && pdfIcon}
        <span>{titleLabel || `View ${typeLabel}`}</span>
        {slNoVal != null && (
          <span
            style={{
              fontSize: 10,
              padding: "1px 5px",
              borderRadius: 3,
              background: "rgba(168, 85, 247, 0.25)",
              color: "#d8b4fe",
              fontFamily: "var(--font-mono, monospace)",
              border: "1px solid rgba(168, 85, 247, 0.35)",
            }}
          >
            Sl. No. {slNoVal}
          </span>
        )}
        {pageNum && (
          <span
            style={{
              fontSize: 10,
              padding: "1px 5px",
              borderRadius: 3,
              background: "rgba(0,0,0,0.3)",
              color: "var(--accent, #38bdf8)",
              fontFamily: "var(--font-mono, monospace)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
            }}
          >
            Page {pageNum}
          </span>
        )}
        {externalIcon}
      </a>
    );
  }

  // Render variant: CARD
  if (variant === "card") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltipText}
        className={`source-citation-card ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--surface-2)",
          border: "1px solid rgba(6, 182, 212, 0.25)",
          textDecoration: "none",
          color: "inherit",
          transition: "all 0.2s ease",
          cursor: "pointer",
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent, #06b6d4)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(6, 182, 212, 0.12)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.25)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "none";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {pdfIcon}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text, #f8fafc)" }}>
              {typeLabel}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-sub, #94a3b8)", fontFamily: "var(--font-mono, monospace)" }}>
              {doc}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {slNoVal != null && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 4,
                background: "rgba(168, 85, 247, 0.15)",
                color: "#c084fc",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              Sl. No. {slNoVal}
            </span>
          )}
          {pageNum && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 4,
                background: "rgba(6, 182, 212, 0.15)",
                color: "var(--accent, #38bdf8)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              Page {pageNum}
            </span>
          )}
          <span style={{ color: "var(--accent, #38bdf8)", display: "flex", alignItems: "center" }}>
            {externalIcon}
          </span>
        </div>
      </a>
    );
  }

  // Render variant: BANNER
  if (variant === "banner") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltipText}
        className={`source-citation-banner ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderRadius: 6,
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.10) 0%, rgba(59, 130, 246, 0.08) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.30)",
          textDecoration: "none",
          color: "inherit",
          transition: "all 0.2s ease",
          cursor: "pointer",
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent, #06b6d4)";
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(6, 182, 212, 0.18) 0%, rgba(59, 130, 246, 0.14) 100%)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.30)";
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(6, 182, 212, 0.10) 0%, rgba(59, 130, 246, 0.08) 100%)";
        }}
      >
        <span style={{ color: "#f87171", display: "flex", alignItems: "center" }}>
          {pdfIcon}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text, #f8fafc)" }}>
          Official Source: {typeLabel}
        </span>
        {slNoVal != null && (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(168, 85, 247, 0.20)",
              color: "#c084fc",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            Sl. No. {slNoVal}
          </span>
        )}
        {pageNum && (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(6, 182, 212, 0.18)",
              color: "var(--accent, #38bdf8)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            Page {pageNum}
          </span>
        )}
        <span style={{ color: "var(--text-sub, #94a3b8)", fontSize: 11 }}>
          (Open PDF {externalIcon})
        </span>
      </a>
    );
  }

  // Default variant: BADGE
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltipText}
      className={`source-citation-badge ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 4 : 5,
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        color: "var(--text, #f8fafc)",
        textDecoration: "none",
        padding: compact ? "2px 6px" : "3px 8px",
        borderRadius: 5,
        background: "var(--surface-2)",
        border: "1px solid var(--border-2)",
        transition: "all 0.15s ease",
        cursor: "pointer",
        lineHeight: 1.3,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(6, 182, 212, 0.12)";
        e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.4)";
        e.currentTarget.style.color = "var(--accent, #38bdf8)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--surface-2)";
        e.currentTarget.style.borderColor = "var(--border-2)";
        e.currentTarget.style.color = "var(--text)";
      }}
    >
      {showIcon && (
        <span style={{ color: "#f87171", display: "flex", alignItems: "center" }}>
          {pdfIcon}
        </span>
      )}
      <span style={{ color: "var(--text-sub)" }}>
        {typeLabel}
      </span>
      {slNoVal != null && (
        <span
          style={{
            fontSize: compact ? 9.5 : 10,
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: 3,
            background: "var(--purple-bg)",
            color: "var(--purple-text)",
            border: "1px solid var(--purple-border)",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          Sl. No. {slNoVal}
        </span>
      )}
      {pageNum && (
        <span
          style={{
            fontSize: compact ? 9.5 : 10,
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: 3,
            background: "var(--accent-glow-2)",
            color: "var(--accent)",
            border: "1px solid var(--accent-glow)",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          Page {pageNum}
        </span>
      )}
      {externalIcon}
    </a>
  );
}
