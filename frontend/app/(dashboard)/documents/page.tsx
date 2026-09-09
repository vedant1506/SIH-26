"use client";
import React, { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AddDocumentModal, { DOCUMENT_TYPES } from "@/components/documents/AddDocumentModal";
import PdfPreviewModal from "@/components/documents/PdfPreviewModal";
import { getToken } from "@/lib/auth";
import {
  FileText,
  Upload,
  Search,
  Filter,
  Grid,
  List,
  Eye,
  Download,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  MapPin,
  Calendar,
  Layers,
  FileCheck,
  RefreshCw,
} from "lucide-react";

interface DocItem {
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
  file_size_bytes?: number | null;
  mime_type?: string | null;
  file_hash?: string | null;
  report_month?: string | null;
  document_date?: string | null;
  uploaded_by_name?: string | null;
  version_number?: number;
  status: string;
  processing_status: string;
  extraction_status: string;
  confidentiality_level: string;
  is_verified: boolean;
  created_at: string;
}

interface AnalyticsData {
  total_documents: number;
  processed: number;
  processing: number;
  attention_required: number;
  counts_by_type: Record<string, number>;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (docTypeFilter) qs.set("doc_type", docTypeFilter);
      if (monthFilter) qs.set("report_month", monthFilter);
      if (statusFilter) qs.set("processing_status", statusFilter);
      qs.set("limit", "150");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const [docsRes, analyticsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/documents?${qs.toString()}`, { headers }),
        fetch(`${apiUrl}/api/v1/documents/analytics`, { headers }),
      ]);

      if (!docsRes.ok) throw new Error("Failed to load documents.");
      const docsData = await docsRes.json();
      setDocs(docsData);

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load document records.");
    } finally {
      setLoading(false);
    }
  }, [search, docTypeFilter, monthFilter, statusFilter]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    // Optimistically remove from view immediately
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    setAnalytics((prev) => prev ? { ...prev, total_documents: Math.max(0, prev.total_documents - 1) } : null);

    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/documents/${docId}?permanent=true`, { method: "DELETE", headers });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete document.");
      }
      fetchDocs();
    } catch (e) {
      console.error("Delete error:", e);
      alert("Failed to delete document.");
      fetchDocs();
    }
  };


  const clearFilters = () => {
    setSearch("");
    setDocTypeFilter("");
    setMonthFilter("");
    setStatusFilter("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background, #080c14)", color: "var(--text, #f8fafc)" }}>
      <TopBar
        title="Project Document Management & Intelligence Center"
        subtitle="Canonical project documents • Automated text extraction • Grounded AI intelligence • Audit trails"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{
              fontSize: 12,
              padding: "8px 16px",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontWeight: 700,
            }}
          >
            <Upload size={14} />
            <span>Upload Document</span>
          </button>
        }
      />

      <div style={{ padding: "20px 24px 60px" }}>
        {/* 1. Summary KPI Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {/* Total Documents */}
          <div
            className="card"
            style={{
              padding: "16px 18px",
              borderLeft: "3px solid #38bdf8",
              background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
              Total Documents
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>
              {analytics?.total_documents ?? docs.length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Canonical Repository Assets
            </div>
          </div>

          {/* Processed Documents */}
          <div
            className="card"
            style={{
              padding: "16px 18px",
              borderLeft: "3px solid #10b981",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
              Processed &amp; Extracted
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--low)", marginTop: 4 }}>
              {analytics?.processed ?? docs.filter((d) => d.processing_status === "PROCESSED").length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Structured Data Available
            </div>
          </div>

          {/* Processing / In-Queue */}
          <div
            className="card"
            style={{
              padding: "16px 18px",
              borderLeft: "3px solid #f59e0b",
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
              Processing Pipeline
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b", marginTop: 4 }}>
              {analytics?.processing ?? docs.filter((d) => d.processing_status === "PROCESSING").length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Text Extraction &amp; AI Analysis
            </div>
          </div>

          {/* Attention Required */}
          <div
            className="card"
            style={{
              padding: "16px 18px",
              borderLeft: "3px solid #f43f5e",
              background: "linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
              Attention Required
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f43f5e", marginTop: 4 }}>
              {analytics?.attention_required ?? docs.filter((d) => d.processing_status === "FAILED").length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Scanned / OCR Required
            </div>
          </div>
        </div>

        {/* 2. Filter & Search Bar */}
        <div
          className="card"
          style={{
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents by title, project name, ID, or extracted text..."
                className="input"
                style={{ paddingLeft: 34, fontSize: 13 }}
              />
            </div>

            {/* Doc Type Filter */}
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="input"
              style={{ width: "auto", minWidth: 170, fontSize: 12 }}
            >
              <option value="">All Document Types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Month Filter */}
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="input"
              style={{ width: "auto", fontSize: 12 }}
              title="Filter by report month"
            />

            {/* Processing Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
              style={{ width: "auto", fontSize: 12 }}
            >
              <option value="">All Statuses</option>
              <option value="PROCESSED">PROCESSED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="FAILED">FAILED</option>
              <option value="UPLOADED">UPLOADED</option>
            </select>

            {/* Clear Filters */}
            {(search || docTypeFilter || monthFilter || statusFilter) && (
              <button
                onClick={clearFilters}
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: "7px 12px" }}
              >
                Clear Filters
              </button>
            )}

            {/* Direct Upload Button in toolbar */}
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
              style={{
                fontSize: 12,
                padding: "7px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
                boxShadow: "0 2px 10px rgba(56, 189, 248, 0.25)",
              }}
            >
              <Upload size={13} />
              <span>Upload Document</span>
            </button>

            {/* Grid / List View Toggle */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: "rgba(0,0,0,0.3)", padding: 3, borderRadius: 6, border: "1px solid var(--border)" }}>

              <button
                onClick={() => setViewMode("grid")}
                style={{
                  background: viewMode === "grid" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: viewMode === "grid" ? "#38bdf8" : "var(--text-muted)",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Grid View"
              >
                <Grid size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                style={{
                  background: viewMode === "list" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: viewMode === "list" ? "#38bdf8" : "var(--text-muted)",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="List View"
              >
                <List size={14} />
              </button>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Showing <strong>{docs.length}</strong> document{docs.length !== 1 ? "s" : ""} linked to canonical project database
          </div>
        </div>

        {/* 3. Document Repository Display */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <LoadingSpinner size={40} label="Retrieving project document repository & intelligence index..." />
          </div>
        ) : error ? (
          <div className="card" style={{ background: "rgba(244,63,94,0.1)", borderColor: "#f43f5e", padding: 24 }}>
            <p style={{ color: "#f43f5e", margin: 0 }}>Error: {error}</p>
          </div>
        ) : docs.length === 0 ? (
          /* Empty State */
          <div
            className="card"
            style={{
              padding: "60px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(56, 189, 248, 0.1)",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={28} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              No project documents found
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 460 }}>
              Upload DPRs, monthly reports, expenditure statements, or inspection records. Every uploaded document is safely stored and analyzed for project intelligence.
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
              style={{ marginTop: 8, fontSize: 12, padding: "8px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Upload size={14} />
              <span>Upload First Document</span>
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View Cards */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {docs.map((doc) => {
              const typeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type;
              return (
                <div
                  key={doc.id}
                  className="card"
                  style={{
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                    cursor: "pointer",
                  }}
                  onClick={() => setPreviewDocId(doc.id)}
                >
                  <div>
                    {/* Header: Doc Type + Version + Status */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          color: "#38bdf8",
                          background: "rgba(56, 189, 248, 0.12)",
                          padding: "2px 7px",
                          borderRadius: 4,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {typeLabel}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 4 }}>
                          v{doc.version_number || 1}
                        </span>
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            color: doc.processing_status === "PROCESSED" ? "#10b981" : doc.processing_status === "FAILED" ? "#f43f5e" : "#f59e0b",
                            background: doc.processing_status === "PROCESSED" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                          }}
                        >
                          {doc.processing_status}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>
                      {doc.title}
                    </div>

                    {/* Associated Project */}
                    <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-sub)", display: "flex", alignItems: "center", gap: 5 }}>
                        <Building size={12} style={{ color: "#38bdf8" }} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {doc.project_name || `Project ${doc.project_id.slice(0, 8)}`}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 6 }}>
                        <span>ID: {doc.project_code || doc.project_id.slice(0, 8)}</span>
                        {doc.state && <span>• {doc.state}</span>}
                      </div>
                    </div>

                    {/* File Meta */}
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)", marginTop: 10, flexWrap: "wrap" }}>
                      {doc.report_month && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Calendar size={11} /> {doc.report_month}
                        </span>
                      )}
                      {doc.file_size_bytes && (
                        <span>{(doc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                      )}
                      <span>Uploaded {new Date(doc.created_at).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      paddingTop: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setPreviewDocId(doc.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>

                    <div style={{ display: "flex", gap: 6 }}>
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/documents/${doc.id}/file?disposition=attachment`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                        title="Download PDF"
                      >
                        <Download size={12} />
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: "4px 8px", color: "#f43f5e" }}
                        title="Archive Document"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View Table */
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 16px" }}>Title &amp; Type</th>
                    <th style={{ padding: "12px 16px" }}>Associated Project</th>
                    <th style={{ padding: "12px 16px" }}>Report Month</th>
                    <th style={{ padding: "12px 16px" }}>Size</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{doc.title}</div>
                        <div style={{ fontSize: 10, color: "#38bdf8", marginTop: 2 }}>
                          {DOCUMENT_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type} • v{doc.version_number || 1}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ color: "var(--text-sub)", fontSize: 12 }}>{doc.project_name || doc.project_id.slice(0, 8)}</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{doc.state}</div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-sub)" }}>{doc.report_month || "-"}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                        {doc.file_size_bytes ? `${(doc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB` : "-"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            color: doc.processing_status === "PROCESSED" ? "#10b981" : "#f59e0b",
                            background: doc.processing_status === "PROCESSED" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                          }}
                        >
                          {doc.processing_status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            onClick={() => setPreviewDocId(doc.id)}
                            className="btn btn-secondary"
                            style={{ fontSize: 11, padding: "4px 8px" }}
                            title="Preview Document"
                          >
                            <Eye size={12} />
                          </button>
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/documents/${doc.id}/file?disposition=attachment`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ fontSize: 11, padding: "4px 8px" }}
                            title="Download PDF"
                          >
                            <Download size={12} />
                          </a>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="btn btn-secondary"
                            style={{ fontSize: 11, padding: "4px 8px", color: "#f43f5e" }}
                            title="Delete Document"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      <AddDocumentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => fetchDocs()}
      />

      {/* PDF Document Preview & Intelligence Modal */}
      <PdfPreviewModal
        documentId={previewDocId}
        isOpen={!!previewDocId}
        onClose={() => setPreviewDocId(null)}
      />
    </div>
  );
}
