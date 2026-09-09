"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  Download,
  Eye,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  FileCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { getProjectDocumentTimeline } from "@/lib/api";
import { getToken } from "@/lib/auth";
import AddDocumentModal from "./AddDocumentModal";
import PdfPreviewModal from "./PdfPreviewModal";

interface ProjectDocumentsSectionProps {
  projectId: string;
  projectName?: string;
  masterRevisedCost?: number | null;
  masterProgress?: number | null;
}

export default function ProjectDocumentsSection({
  projectId,
  projectName,
  masterRevisedCost,
  masterProgress,
}: ProjectDocumentsSectionProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const fetchTimeline = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const docs = await getProjectDocumentTimeline(projectId);
      setDocuments(docs || []);
    } catch (err) {
      console.error("Failed to load project document timeline", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const handleOpenPdf = (doc: any) => {
    setSelectedDoc(doc);
    setIsPdfModalOpen(true);
  };

  const handleDownload = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const downloadUrl = `${apiUrl}/api/v1/documents/${doc.id}/file?disposition=attachment${
      token ? `&token=${encodeURIComponent(token)}` : ""
    }`;
    window.open(downloadUrl, "_blank");
  };

  const totalDocs = documents.length;
  const processedDocs = documents.filter(
    (d) => d.extraction_status === "COMPLETED" || d.extraction_status === "OCR_FALLBACK"
  ).length;
  const latestDoc = documents[0];

  return (
    <>
      <div className="card" style={{ marginBottom: 24, padding: "20px 24px" }}>
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--accent)",
              marginBottom: 4,
            }}
          >
            <Sparkles size={14} /> Project Document Intelligence & Evidence Archive
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
            Project Dossier & Extracted Disclosures
            {totalDocs > 0 && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "rgba(56,189,248,0.12)",
                  color: "var(--accent)",
                  padding: "2px 8px",
                  borderRadius: 12,
                  border: "1px solid rgba(56,189,248,0.25)",
                }}
              >
                {totalDocs} {totalDocs === 1 ? "File" : "Files"}
              </span>
            )}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-sub)" }}>
            Upload detailed project reports, sanctions, and CA statements for automated text extraction and grounded AI verification.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={fetchTimeline}
            className="btn btn-ghost"
            title="Refresh documents"
            style={{ padding: "8px 12px", border: "1px solid var(--border)" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Upload size={14} /> Upload Project Document
          </button>
        </div>
      </div>

      {/* KPI Micro-Bar when documents exist */}
      {totalDocs > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(56,189,248,0.1)",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 500 }}>Repository Status</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                {processedDocs} of {totalDocs} Processed
              </div>
            </div>
          </div>

          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(16,185,129,0.1)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 500 }}>Latest Audit Filing</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                {latestDoc?.document_date || latestDoc?.report_month || "Current Cycle"}
              </div>
            </div>
          </div>

          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(168,85,247,0.1)",
                color: "#a855f7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 500 }}>AI Q&A Ready</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#a855f7" }}>
                Grounded Index Active
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-sub)" }}>
          <div className="spin" style={{ display: "inline-block", marginBottom: 10 }}>
            <RefreshCw size={24} color="var(--accent)" />
          </div>
          <p style={{ fontSize: 13, margin: 0 }}>Syncing project document timeline...</p>
        </div>
      ) : documents.length === 0 ? (
        /* Zero state */
        <div
          style={{
            border: "1.5px dashed var(--border)",
            borderRadius: 12,
            padding: "36px 20px",
            textAlign: "center",
            background: "rgba(255,255,255,0.01)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "rgba(56,189,248,0.08)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <FileText size={26} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
            No Project Documents Attached
          </h4>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-sub)",
              maxWidth: 540,
              margin: "0 auto 20px",
              lineHeight: 1.5,
            }}
          >
            Attach DPRs, CA expenditure certificates, monthly progress reports, or sanction orders to trigger automated intelligence extraction and cross-referencing against MoSPI master records.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 20px",
              fontWeight: 600,
            }}
          >
            <Upload size={15} /> Upload First Document
          </button>
        </div>
      ) : (
        /* Document Timeline List */
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {documents.map((doc, idx) => {
            const isCompleted =
              doc.extraction_status === "COMPLETED" || doc.extraction_status === "OCR_FALLBACK";
            const meta = doc.extracted_metadata || {};
            const disclosedCost = meta.disclosed_revised_cost || meta.disclosed_cost;
            const disclosedProgress = meta.disclosed_progress_pct;

            // Discrepancy comparison with master data
            let costDelta: number | null = null;
            if (disclosedCost && masterRevisedCost && masterRevisedCost > 0) {
              costDelta = disclosedCost - masterRevisedCost;
            }

            return (
              <div
                key={doc.id}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 16,
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* Row 1: Badges & Actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: "rgba(239,68,68,0.1)",
                        color: "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                    >
                      PDF
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "var(--text)",
                            cursor: "pointer",
                          }}
                          onClick={() => handleOpenPdf(doc)}
                        >
                          {doc.title || doc.filename || "Untitled Document"}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            background: "rgba(255,255,255,0.06)",
                            color: "var(--text-sub)",
                            padding: "2px 8px",
                            borderRadius: 4,
                            textTransform: "capitalize",
                          }}
                        >
                          {(doc.doc_type || "document").replace(/_/g, " ")}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            background: "rgba(56,189,248,0.1)",
                            color: "var(--accent)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          v{doc.version_number || 1}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-sub)",
                          marginTop: 3,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{doc.filename}</span>
                        {doc.file_size_kb && (
                          <span>{(doc.file_size_kb / 1024).toFixed(2)} MB</span>
                        )}
                        {doc.document_date && <span>Filed: {doc.document_date}</span>}
                        <span>{doc.confidentiality_level || "INTERNAL"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => handleOpenPdf(doc)}
                      className="btn"
                      style={{
                        background: "rgba(56,189,248,0.12)",
                        color: "var(--accent)",
                        border: "1px solid rgba(56,189,248,0.3)",
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Eye size={13} /> View & Ask AI
                    </button>
                    <button
                      onClick={(e) => handleDownload(doc, e)}
                      className="btn btn-ghost"
                      style={{
                        padding: "6px 10px",
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      title="Download PDF"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </div>

                {/* Row 2: Extraction Status & Disclosed Comparison */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                    padding: "8px 12px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--text-sub)" }}>Extraction:</span>
                    {isCompleted ? (
                      <span
                        style={{
                          color: "#10b981",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <CheckCircle2 size={13} /> Extracted ({doc.extracted_metadata?.page_count || 1} pages)
                      </span>
                    ) : doc.extraction_status === "PROCESSING" ? (
                      <span
                        style={{
                          color: "#38bdf8",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={13} className="spin" /> Processing text...
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-sub)", fontWeight: 500 }}>
                        {doc.extraction_status || "Pending"}
                      </span>
                    )}
                  </div>

                  {disclosedCost !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--text-sub)" }}>Disclosed Cost:</span>
                      <strong style={{ color: "var(--text)" }}>
                        ₹{Number(disclosedCost).toLocaleString("en-IN")} Cr
                      </strong>
                      {costDelta !== null && Math.abs(costDelta) > 1 && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background:
                              costDelta > 0
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(16,185,129,0.15)",
                            color: costDelta > 0 ? "#ef4444" : "#10b981",
                            fontWeight: 600,
                          }}
                        >
                          {costDelta > 0 ? `+₹${costDelta.toFixed(1)} Cr vs Master` : `-₹${Math.abs(costDelta).toFixed(1)} Cr vs Master`}
                        </span>
                      )}
                    </div>
                  )}

                  {disclosedProgress !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--text-sub)" }}>Disclosed Progress:</span>
                      <strong style={{ color: "var(--text)" }}>{disclosedProgress}%</strong>
                      {masterProgress !== null && masterProgress !== undefined && (
                        <span style={{ fontSize: 11, color: "var(--text-sub)" }}>
                          (Master: {masterProgress}%)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Row 3: AI Executive Summary Snippet */}
                {doc.ai_summary && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-sub)",
                      lineHeight: 1.5,
                      borderLeft: "2px solid var(--accent)",
                      paddingLeft: 10,
                      marginTop: 2,
                    }}
                  >
                    <span style={{ color: "var(--accent)", fontWeight: 600, marginRight: 6 }}>
                      Executive Insight:
                    </span>
                    {doc.ai_summary.length > 240
                      ? `${doc.ai_summary.slice(0, 240)}...`
                      : doc.ai_summary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      </div>

      {/* Upload Modal */}
      {isAddModalOpen && (
        <AddDocumentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchTimeline();
          }}
          preselectedProjectId={projectId}
        />
      )}

      {/* PDF Intelligence Viewer Modal */}
      {isPdfModalOpen && selectedDoc && (
        <PdfPreviewModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          documentId={selectedDoc?.id || null}
        />
      )}
    </>
  );
}
