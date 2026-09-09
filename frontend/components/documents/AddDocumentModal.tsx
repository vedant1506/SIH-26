"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { listProjects } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { ProjectListItem } from "@/lib/types";
import {
  Upload,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Lock,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";

export const DOCUMENT_TYPES = [
  { value: "monthly_report", label: "Monthly Progress Report" },
  { value: "flash_report", label: "Flash Report" },
  { value: "dpr", label: "Detailed Project Report (DPR)" },
  { value: "project_proposal", label: "Project Proposal" },
  { value: "sanction_order", label: "Sanction Order" },
  { value: "admin_approval", label: "Administrative Approval" },
  { value: "financial_doc", label: "Financial Document" },
  { value: "expenditure_statement", label: "Expenditure Report" },
  { value: "physical_progress_report", label: "Physical Progress Report" },
  { value: "milestone_report", label: "Milestone Report" },
  { value: "tender_doc", label: "Tender Document" },
  { value: "work_order", label: "Work Order" },
  { value: "contract_doc", label: "Contract Document" },
  { value: "environmental_clearance", label: "Environmental Clearance" },
  { value: "land_doc", label: "Land / Location Document" },
  { value: "inspection_report", label: "Inspection Report" },
  { value: "meeting_minutes", label: "Meeting Minutes" },
  { value: "status_report", label: "Status Report" },
  { value: "govt_correspondence", label: "Government Correspondence" },
  { value: "other", label: "Other Supporting Evidence" },
];

const CONFIDENTIALITY_LEVELS = [
  { value: "INTERNAL", label: "Internal Only (Default)", color: "#38bdf8" },
  { value: "PUBLIC", label: "Public (Citizen Transparency)", color: "#10b981" },
  { value: "RESTRICTED", label: "Restricted Access", color: "#f59e0b" },
  { value: "CONFIDENTIAL", label: "Strictly Confidential", color: "#f43f5e" },
];

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedProjectId?: string;
}

export default function AddDocumentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedProjectId,
}: AddDocumentModalProps) {
  const [projectSearch, setProjectSearch] = useState("");
  const [projectList, setProjectList] = useState<ProjectListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectListItem | null>(null);
  const [searchingProjects, setSearchingProjects] = useState(false);

  // Form fields
  const [docType, setDocType] = useState("monthly_report");
  const [title, setTitle] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [description, setDescription] = useState("");
  const [confidentiality, setConfidentiality] = useState("INTERNAL");

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // AI Processing Toggles
  const [aiExtractText, setAiExtractText] = useState(true);
  const [aiSummary, setAiSummary] = useState(true);
  const [aiProjectInfo, setAiProjectInfo] = useState(true);
  const [aiMilestones, setAiMilestones] = useState(true);

  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

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

  // Load canonical projects list
  useEffect(() => {
    if (!isOpen) return;
    setSearchingProjects(true);
    const timeout = setTimeout(() => {
      listProjects({ search: projectSearch || undefined, limit: 35 })
        .then((items) => {
          setProjectList(items);
          if (preselectedProjectId && !selectedProject) {
            const found = items.find((p) => p.id === preselectedProjectId);
            if (found) setSelectedProject(found);
          }
        })
        .catch(() => {})
        .finally(() => setSearchingProjects(false));
    }, 200);

    return () => clearTimeout(timeout);
  }, [projectSearch, isOpen, preselectedProjectId]);

  // Direct fetch for preselected project to ensure accurate loading
  useEffect(() => {
    if (!isOpen || !preselectedProjectId) return;
    import("@/lib/api").then(({ getProject }) => {
      getProject(preselectedProjectId)
        .then((p) => {
          if (p) {
            setSelectedProject(p as unknown as ProjectListItem);
          }
        })
        .catch(() => {});
    });
  }, [isOpen, preselectedProjectId]);

  // Handle Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (f: File) => {
    setFileError("");
    setErrorMessage("");

    const isPdf =
      f.name.toLowerCase().endsWith(".pdf") ||
      f.type === "application/pdf" ||
      f.type === "application/x-pdf";

    if (!isPdf) {
      setFileError("Only PDF documents are allowed (.pdf).");
      return;
    }

    if (f.size === 0) {
      setFileError("File is empty (0 bytes).");
      return;
    }

    if (f.size > 25 * 1024 * 1024) {
      setFileError("File exceeds the 25 MB limit.");
      return;
    }

    setFile(f);
    if (!title) {
      const generatedTitle = f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
      setTitle(generatedTitle.charAt(0).toUpperCase() + generatedTitle.slice(1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedProject) {
      setErrorMessage("Please select a target project from the list above before uploading.");
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      projectInputRef.current?.focus();
      return;
    }

    if (!file) {
      setErrorMessage("Please select or drop a PDF document to upload.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("project_id", selectedProject.id);
      formData.append("doc_type", docType);
      formData.append("title", title || file.name);
      if (reportMonth) formData.append("report_month", reportMonth);
      if (documentDate) formData.append("document_date", documentDate);
      if (description) formData.append("description", description);
      formData.append("confidentiality_level", confidentiality);

      setUploadProgress(50);

      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/documents/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      setUploadProgress(85);

      if (res.status === 409) {
        const err = await res.json().catch(() => ({ detail: "Duplicate document detected" }));
        throw new Error(`Duplicate Document: ${err.detail || "This exact file has already been uploaded for this project."}`);
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Document upload failed" }));
        throw new Error(err.detail || "Server failed to store or process document.");
      }

      setUploadProgress(100);
      setSuccessMessage("Document uploaded successfully! Multi-page AI extraction initiated.");

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed. Please try again.");
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface, #0f172a)",
          border: "1px solid var(--border-2, #334155)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.85)",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Upload size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--text)" }}>
                Upload Project Document
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-sub)", margin: "2px 0 0" }}>
                Attach authentic DPRs, CA expenditure certificates, or monthly progress reports.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            title="Close dialog (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form wrapping scrollable body and pinned footer */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
            minHeight: 0,
            margin: 0,
          }}
        >
          {/* Scrollable Form Body */}
          <div
            ref={modalBodyRef}
            style={{
              padding: "20px 24px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* Success Alert */}
            {successMessage && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: 8,
                  color: "#10b981",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Alert */}
            {errorMessage && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(244, 63, 94, 0.12)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  borderRadius: 8,
                  color: "#f43f5e",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}
          {/* STEP 1: PROJECT SELECTION */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Step 1: Select Target Project *
              </label>
              {selectedProject ? (
                <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} /> Project Selected
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
                  Required (Click below to select)
                </span>
              )}
            </div>

            {!selectedProject ? (
              <div
                style={{
                  border: errorMessage && !selectedProject ? "1.5px solid #f43f5e" : "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 10,
                  background: "var(--surface-2)",
                }}
              >
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-muted)" }} />
                  <input
                    ref={projectInputRef}
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Type project name, state, district, or ministry..."
                    className="input"
                    style={{ paddingLeft: 34, fontSize: 13 }}
                  />
                </div>

                <div style={{ fontSize: 11, color: "var(--text-sub)", marginBottom: 6, fontWeight: 500 }}>
                  {searchingProjects ? "Searching canonical database..." : "Click any project below to link this document:"}
                </div>

                {projectList.length > 0 && (
                  <div
                    style={{
                      maxHeight: 180,
                      overflowY: "auto",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  >
                    {projectList.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProject(p);
                          setErrorMessage("");
                        }}
                        style={{
                          padding: "9px 12px",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(56, 189, 248, 0.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.project_name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            {p.state} • {p.district || "District N/A"} • {p.sector} • ₹{p.original_cost_cr?.toLocaleString("en-IN")} Cr
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn"
                          style={{
                            background: "rgba(56, 189, 248, 0.12)",
                            color: "#38bdf8",
                            border: "1px solid rgba(56, 189, 248, 0.25)",
                            fontSize: 11,
                            padding: "4px 10px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Project Card */
              <div
                style={{
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "#38bdf8", color: "#000", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>
                      ID: {selectedProject.id.slice(0, 8)}
                    </span>
                    <strong style={{ fontSize: 14, color: "var(--text)" }}>{selectedProject.project_name}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {selectedProject.state} • {selectedProject.district || "District N/A"}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="22.01"/><line x1="15" y1="22" x2="15" y2="22.01"/><line x1="9" y1="18" x2="9" y2="18.01"/><line x1="15" y1="18" x2="15" y2="18.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/></svg>
                      {selectedProject.sector}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      ₹{selectedProject.original_cost_cr?.toLocaleString("en-IN")} Cr
                    </span>
                    {selectedProject.physical_progress_pct !== null && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                        Progress: {selectedProject.physical_progress_pct}%
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid var(--border)",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--accent)",
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Change Project
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: PDF DOCUMENT ATTACHMENT */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Step 2: Attach Official PDF Document *
              </label>
              {file ? (
                <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} /> PDF Attached
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
                  Required
                </span>
              )}
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragActive
                  ? "2px dashed #38bdf8"
                  : file
                  ? "1.5px solid #10b981"
                  : errorMessage && !file
                  ? "1.5px dashed #f43f5e"
                  : "1.5px dashed var(--border)",
                background: dragActive
                  ? "rgba(56, 189, 248, 0.08)"
                  : file
                  ? "rgba(16, 185, 129, 0.06)"
                  : "rgba(0, 0, 0, 0.2)",
                borderRadius: 10,
                padding: "24px 16px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileInput}
                style={{ display: "none" }}
              />

              {file ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-sub)" }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for cryptographic SHA-256 hashing &amp; upload
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "#f43f5e",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontWeight: 600,
                    }}
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(56, 189, 248, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
                    <Upload size={22} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                    Drag &amp; Drop PDF here, or <span style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 700 }}>Browse Files</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Accepted: Official PDF documents up to 25 MB. Server-side magic bytes validated.
                  </div>
                </div>
              )}
            </div>

            {fileError && (
              <div style={{ fontSize: 12, color: "#f43f5e", marginTop: 6, fontWeight: 500 }}>{fileError}</div>
            )}
          </div>

          {/* STEP 3: DOCUMENT METADATA */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Document Category *
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="select"
                style={{ width: "100%", fontSize: 13 }}
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Confidentiality Level
              </label>
              <select
                value={confidentiality}
                onChange={(e) => setConfidentiality(e.target.value)}
                className="select"
                style={{ width: "100%", fontSize: 13 }}
              >
                {CONFIDENTIALITY_LEVELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Report Month (YYYY-MM)
              </label>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="input"
                style={{ fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Filing Date
              </label>
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="input"
                style={{ fontSize: 13 }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Detailed Project Report - Section B Alignment Revision"
              className="input"
              style={{ fontSize: 13 }}
            />
          </div>

          {/* STEP 4: AI DOCUMENT INTELLIGENCE PIPELINE */}
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Sparkles size={13} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--accent)", letterSpacing: "0.04em" }}>
                AI Document Intelligence Pipeline
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, fontSize: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text-sub)" }}>
                <input type="checkbox" checked={aiExtractText} onChange={(e) => setAiExtractText(e.target.checked)} />
                <span>Multi-Page Text Extraction (pypdf)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text-sub)" }}>
                <input type="checkbox" checked={aiSummary} onChange={(e) => setAiSummary(e.target.checked)} />
                <span>Generate Grounded Executive Summary</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text-sub)" }}>
                <input type="checkbox" checked={aiProjectInfo} onChange={(e) => setAiProjectInfo(e.target.checked)} />
                <span>Extract Project Cost &amp; Progress</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text-sub)" }}>
                <input type="checkbox" checked={aiMilestones} onChange={(e) => setAiMilestones(e.target.checked)} />
                <span>Detect Delayed Milestones &amp; Risks</span>
              </label>
            </div>
          </div>

          {/* Progress Bar */}
          {submitting && (
            <div style={{ width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden", height: 8 }}>
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #38bdf8, #10b981)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}

          </div>

          {/* Pre-Upload Readiness Checklist Banner - Pinned Footer */}
          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid var(--border)",
              background: "var(--surface-2, #111827)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span style={{ color: selectedProject ? "#10b981" : "#f59e0b", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: 12 }}>
                {selectedProject ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {selectedProject ? "Project Linked" : "Step 1: Pick Project"}
              </span>
              <span style={{ color: file ? "#10b981" : "#f59e0b", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: 12 }}>
                {file ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {file ? `PDF Ready (${(file.size / (1024 * 1024)).toFixed(1)} MB)` : "Step 2: Choose PDF"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: "8px 14px", border: "1px solid var(--border)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  fontSize: 13,
                  padding: "9px 20px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(56, 189, 248, 0.35)",
                }}
              >
                <Upload size={14} />
                {submitting ? "Uploading & Analyzing..." : "Upload & Process Document"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
