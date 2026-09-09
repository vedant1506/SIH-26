"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Sparkles,
  Search,
  CheckCircle,
  AlertTriangle,
  History,
  Send,
  HelpCircle,
  ShieldCheck,
  Building,
  MapPin,
  Calendar,
  Layers,
  Scale,
} from "lucide-react";
import { getToken } from "@/lib/auth";

interface DocumentDetail {
  id: string;
  project_id: string;
  project_name?: string | null;
  project_code?: string | null;
  state?: string | null;
  district?: string | null;
  sector?: string | null;
  doc_type: string;
  title: string;
  description?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  original_file_name?: string | null;
  file_path?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  file_hash?: string | null;
  report_month?: string | null;
  document_date?: string | null;
  uploaded_by_name?: string | null;
  version_number?: number;
  status?: string;
  processing_status?: string;
  extraction_status?: string;
  extracted_text?: string | null;
  extracted_metadata?: any;
  ai_summary?: string | null;
  confidentiality_level?: string;
  is_verified?: boolean;
  created_at?: string;
}

interface PdfPreviewModalProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PdfPreviewModal({
  documentId,
  isOpen,
  onClose,
}: PdfPreviewModalProps) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "extracted" | "ai_summary" | "ask" | "audit">("overview");

  // PDF Viewer state
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Q&A state
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string; page?: number; conf?: number }>>([]);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background body scroll while dialog is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !documentId) return;
    setLoading(true);
    setError("");

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/documents/${documentId}`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Document not found");
        return res.json();
      })
      .then((data) => {
        setDoc(data);
        // Pre-populate QA with default suggestions if empty
        setQaHistory([]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Fetch audit trail
    fetch(`${apiUrl}/api/v1/documents/${documentId}/audit`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((logs) => setAuditLogs(logs))
      .catch(() => {});
  }, [isOpen, documentId]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || asking || !documentId) return;

    const userQ = question.trim();
    setQuestion("");
    setAsking(true);

    try {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/documents/${documentId}/ask`, {
        method: "POST",
        headers,
        body: JSON.stringify({ question: userQ }),
      });

      if (!res.ok) throw new Error("Failed to process question");
      const answerData = await res.json();

      setQaHistory((prev) => [
        ...prev,
        {
          q: userQ,
          a: answerData.answer,
          page: answerData.source_page,
          conf: answerData.confidence,
        },
      ]);
    } catch (err: any) {
      setQaHistory((prev) => [
        ...prev,
        {
          q: userQ,
          a: "Unable to retrieve grounded answer from document.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  if (!isOpen || !documentId || !mounted) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const pdfUrl = `${apiUrl}/api/v1/documents/${documentId}/file`;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isFullscreen ? 0 : "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: isFullscreen ? "100vw" : "96vw",
          maxWidth: isFullscreen ? "100vw" : 1400,
          height: isFullscreen ? "100vh" : "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          borderRadius: isFullscreen ? 0 : 12,
          overflow: "hidden",
          background: "var(--surface, #0b1324)",
          border: isFullscreen ? "none" : "1px solid var(--border-2, #334155)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div
          style={{
            padding: "12px 20px",
            background: "rgba(15, 23, 42, 0.95)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            gap: 16,
          }}
        >
          {/* Title & Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ background: "#f43f5e", color: "#fff", padding: "3px 6px", borderRadius: 4, fontSize: 10, fontWeight: 800 }}>
              PDF
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {doc?.title || "Project Document"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 8, alignItems: "center" }}>
                <span>{doc?.project_name || "Canonical Project"}</span>
                <span>•</span>
                <span>Version v{doc?.version_number || 1}</span>
                <span>•</span>
                <span style={{ color: doc?.confidentiality_level === "PUBLIC" ? "#10b981" : "#38bdf8" }}>
                  {doc?.confidentiality_level || "INTERNAL"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick PDF Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Zoom Controls */}
            <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "2px 6px", border: "1px solid var(--border)" }}>
              <button
                onClick={() => setZoom((prev) => Math.max(50, prev - 15))}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: 11, color: "var(--text-sub)", padding: "0 6px", minWidth: 42, textAlign: "center" }}>
                {zoom}%
              </span>
              <button
                onClick={() => setZoom((prev) => Math.min(200, prev + 15))}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Open in New Tab */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <ExternalLink size={12} />
              <span>Open Tab</span>
            </a>

            {/* Direct Download */}
            <a
              href={`${pdfUrl}?download=true`}
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <Download size={12} />
              <span>Download</span>
            </a>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: "5px 10px", display: "inline-flex", alignItems: "center" }}
              title="Toggle Fullscreen"
            >
              <Maximize2 size={12} />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 8px",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Dual-Panel Workspace */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", flex: 1, minHeight: 0, overflow: "hidden" }} className="responsive-grid-2">
          {/* Left Panel: Embedded PDF Viewer */}
          <div
            style={{
              background: "#1e293b",
              height: "100%",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRight: "1px solid var(--border)",
            }}
          >
            {doc?.file_path ? (
              <iframe
                src={`${pdfUrl}#zoom=${zoom}`}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                title="PDF Document Preview"
              />
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                <FileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600 }}>Physical PDF File Not Available</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>This record contains structured metadata only.</div>
              </div>
            )}
          </div>

          {/* Right Panel: Intelligence Tabs & Data */}
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "var(--surface)" }}>
            {/* Tab Navigation */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--border)",
                background: "rgba(0,0,0,0.2)",
                padding: "0 14px",
                overflowX: "auto",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {[
                { id: "overview", label: "Overview" },
                { id: "extracted", label: "Extracted Metrics" },
                { id: "ai_summary", label: "AI Summary" },
                { id: "ask", label: "Ask Document" },
                { id: "audit", label: "Audit Trail" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderBottom: activeTab === tab.id ? "2px solid #38bdf8" : "2px solid transparent",
                    color: activeTab === tab.id ? "#38bdf8" : "var(--text-muted)",
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && doc && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Document Type</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{doc.doc_type.replace(/_/g, " ").toUpperCase()}</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Report Month</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", marginTop: 2 }}>{doc.report_month || "Not Specified"}</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Canonical Project ID</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{doc.project_code || doc.project_id.slice(0, 8)}</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>File Size</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>
                        {doc.file_size_bytes ? `${(doc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB` : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Cryptographic Hash */}
                  <div style={{ background: "rgba(0,0,0,0.3)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>SHA-256 Cryptographic Checksum</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#38bdf8", wordBreak: "break-all", marginTop: 4 }}>
                      {doc.file_hash || "Calculated on upload"}
                    </div>
                  </div>

                  {/* Project Summary */}
                  <div style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.2)", padding: "12px 14px", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>Associated Canonical Project</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{doc.project_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 4 }}>
                      {doc.state} • {doc.district || "District N/A"} • {doc.sector}
                    </div>
                  </div>

                  {/* Upload Info */}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                    <span>Uploaded By: {doc.uploaded_by_name || "Authorized Officer"}</span>
                    <span>Date: {doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-IN") : "N/A"}</span>
                  </div>
                </div>
              )}

              {/* TAB 2: EXTRACTED DATA (COMPARED TO MASTER DATA) */}
              {activeTab === "extracted" && doc && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Side-by-side comparison between <strong>Document-Extracted Metrics</strong> and <strong>Authoritative Project Master Data</strong>.
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
                        <th style={{ padding: "8px 10px" }}>Metric</th>
                        <th style={{ padding: "8px 10px" }}>Document Reported</th>
                        <th style={{ padding: "8px 10px" }}>Authoritative Baseline</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>Physical Progress</td>
                        <td style={{ padding: "8px 10px", color: "#10b981", fontWeight: 700 }}>
                          {doc.extracted_metadata?.reported_physical_progress_pct !== undefined
                            ? `${doc.extracted_metadata.reported_physical_progress_pct}%`
                            : "Not Tabulated"}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>Master Data Baseline</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>Reported Cost</td>
                        <td style={{ padding: "8px 10px", color: "#38bdf8", fontWeight: 700 }}>
                          {doc.extracted_metadata?.reported_original_cost_cr
                            ? `₹${doc.extracted_metadata.reported_original_cost_cr} Cr`
                            : "Not Explicit"}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>Sanctioned Baseline</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>Cumulative Expenditure</td>
                        <td style={{ padding: "8px 10px", color: "#f59e0b", fontWeight: 700 }}>
                          {doc.extracted_metadata?.reported_expenditure_cr
                            ? `₹${doc.extracted_metadata.reported_expenditure_cr} Cr`
                            : "Not Explicit"}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>Disbursed Baseline</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Risk Evidence Extracted */}
                  {doc.extracted_metadata?.risk_evidence && doc.extracted_metadata.risk_evidence.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>
                        Detected Risk Evidence &amp; Delay Cues
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {doc.extracted_metadata.risk_evidence.map((ev: any, i: number) => (
                          <div key={i} style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.25)", padding: "8px 12px", borderRadius: 6 }}>
                            <div style={{ fontWeight: 700, color: "#f43f5e", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                              </svg>
                              <span>{ev.finding}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Source: Page {ev.source_page}</div>
                            {ev.context_snippet && (
                              <div style={{ fontSize: 11, color: "var(--text-sub)", fontStyle: "italic", marginTop: 4 }}>"{ev.context_snippet}"</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AI SUMMARY */}
              {activeTab === "ai_summary" && doc && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                    {doc.ai_summary || "AI Summary being generated..."}
                  </div>
                </div>
              )}

              {/* TAB 4: ASK THIS DOCUMENT */}
              {activeTab === "ask" && (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                  {/* QA History */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: 340, marginBottom: 12 }}>
                    {qaHistory.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)" }}>
                        <Sparkles size={24} style={{ color: "#38bdf8", marginBottom: 8 }} />
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Ask Grounded Questions About This Document</div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>
                          e.g., "What is the physical progress?", "What milestones are delayed?", "What is the expenditure?"
                        </div>
                      </div>
                    ) : (
                      qaHistory.map((qa, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                            Q: {qa.q}
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", padding: "10px 12px", borderRadius: 8, fontSize: 12, color: "var(--text-sub)", lineHeight: 1.5 }}>
                            <div>{qa.a}</div>
                            {qa.page && (
                              <div style={{ fontSize: 10, color: "#38bdf8", marginTop: 4, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                  <line x1="16" y1="13" x2="8" y2="13"/>
                                  <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                                <span>Source: Page {qa.page}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Ask Form */}
                  <form onSubmit={handleAsk} style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask about this document..."
                      className="input"
                      style={{ fontSize: 12 }}
                      disabled={asking}
                    />
                    <button
                      type="submit"
                      disabled={asking || !question.trim()}
                      className="btn btn-primary"
                      style={{ padding: "8px 14px", flexShrink: 0 }}
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 5: AUDIT TRAIL */}
              {activeTab === "audit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {auditLogs.length === 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No audit events recorded yet.</div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 700, color: "#38bdf8" }}>{log.action}</span>
                          <span style={{ color: "var(--text-muted)" }}>{log.created_at ? new Date(log.created_at).toLocaleString("en-IN") : ""}</span>
                        </div>
                        <div style={{ color: "var(--text-sub)", marginTop: 2 }}>By: {log.user_name || "System"} ({log.role})</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
