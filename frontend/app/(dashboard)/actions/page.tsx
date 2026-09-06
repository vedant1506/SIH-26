"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import {
  getActionSummary,
  listActions,
  getActionDetail,
  createAction,
  updateAction,
  assignAction,
  transitionAction,
  completeAction,
  verifyAction,
  listActionComments,
  addActionComment,
  getActionHistory,
  listOfficers,
  getRecommendedOfficer,
  generateAiIntervention,
  deleteAction,
  listProjects,
} from "@/lib/api";
import type {
  ActionItem,
  ActionSummary,
  ActionPriority,
  ActionStatus,
  ActionComment,
  ActionHistoryItem,
  OfficerProfile,
  ProjectListItem,
} from "@/lib/types";

// ─── SVG ICONS (Zero Emojis) ──────────────────────────────────────────────────

const Icons = {
  clock: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  userCheck: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
    </svg>
  ),
  zap: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  checkCircle: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  shieldCheck: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  alertTriangle: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  pin: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  calendar: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  user: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  sparkles: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.885L20 10l-5.088 1.115L13 17l-1.912-5.885L6 10l5.088-1.115z" /><path d="M19 17l.765 2.354L22 20l-2.235.646L19 23l-.765-2.354L16 20l2.235-.646z" />
    </svg>
  ),
  messageSquare: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  history: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><polyline points="12 7 12 12 15 15" />
    </svg>
  ),
  externalLink: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  clipboardList: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  ),
};

// ─── PRIORITY & STATUS CONFIG ────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<ActionPriority, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: "rgba(244, 63, 94, 0.14)", text: "#f43f5e", border: "rgba(244, 63, 94, 0.4)", label: "Critical" },
  high: { bg: "rgba(245, 158, 11, 0.14)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.4)", label: "High" },
  medium: { bg: "rgba(59, 130, 246, 0.14)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.4)", label: "Medium" },
  low: { bg: "rgba(16, 185, 129, 0.14)", text: "#10b981", border: "rgba(16, 185, 129, 0.4)", label: "Low" },
};

interface ColumnDef {
  key: ActionStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  badgeBg: string;
}

const KANBAN_COLUMNS: ColumnDef[] = [
  { key: "pending", label: "Pending Triage", icon: Icons.clock, color: "#94a3b8", badgeBg: "rgba(148, 163, 184, 0.15)" },
  { key: "assigned", label: "Assigned", icon: Icons.userCheck, color: "#38bdf8", badgeBg: "rgba(56, 189, 248, 0.15)" },
  { key: "in_progress", label: "In Progress", icon: Icons.zap, color: "#f59e0b", badgeBg: "rgba(245, 158, 11, 0.15)" },
  { key: "completed", label: "Completed", icon: Icons.checkCircle, color: "#10b981", badgeBg: "rgba(16, 185, 129, 0.15)" },
  { key: "verified", label: "Verified & Closed", icon: Icons.shieldCheck, color: "#8b5cf6", badgeBg: "rgba(139, 92, 246, 0.15)" },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function ActionWorkflowPage() {
  return (
    <Suspense fallback={<LoadingSpinner size={36} label="Loading PRISM Intervention Actions..." />}>
      <ActionWorkflowContent />
    </Suspense>
  );
}

function ActionWorkflowContent() {
  const searchParams = useSearchParams();

  // State: Core Data
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<ActionSummary | null>(null);
  const [officers, setOfficers] = useState<OfficerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // State: Filters
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  // State: Project search for filters & create modal
  const [projectSearchResults, setProjectSearchResults] = useState<ProjectListItem[]>([]);
  const [projectQuery, setProjectQuery] = useState("");
  const [isSearchingProjects, setIsSearchingProjects] = useState(false);

  // State: Drawer & Modals
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [detailAction, setDetailAction] = useState<ActionItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [comments, setComments] = useState<ActionComment[]>([]);
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // State: Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [actionToOperate, setActionToOperate] = useState<ActionItem | null>(null);

  // Form State: Create Action
  const [createForm, setCreateForm] = useState({
    projectId: "",
    projectName: "",
    alertId: "",
    title: "",
    description: "",
    rootCause: "",
    recommendedAction: "",
    expectedOutcome: "",
    assignedOfficerId: "",
    dueDate: "",
    priority: "high" as ActionPriority,
    sourceType: "early_warning",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Form State: Assign Officer
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Form State: Complete Action
  const [completeNotes, setCompleteNotes] = useState("");
  const [actualOutcome, setActualOutcome] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  // Form State: Verify Action
  const [isApprovedDecision, setIsApprovedDecision] = useState(true);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // ── Initial Load & URL Parameter Handling ──
  const refreshAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [sumData, actsData, offData] = await Promise.all([
        getActionSummary().catch(() => null),
        listActions({ limit: 100 }).catch(() => []),
        listOfficers().catch(() => []),
      ]);
      if (sumData) setSummary(sumData);
      setActions(actsData);
      setOfficers(offData);
    } catch (err: any) {
      setError(err?.message || "Failed to load intervention actions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Handle Query Parameters (e.g. from Early Warning "Take Action")
  useEffect(() => {
    const qProjectId = searchParams.get("project_id") || searchParams.get("projectId") || "";
    const qAlertId = searchParams.get("alert_id") || "";
    const qTitle = searchParams.get("title") || "";
    const qAction = searchParams.get("action");

    if (qProjectId || qTitle || qAction === "new") {
      setCreateForm((prev) => ({
        ...prev,
        projectId: qProjectId,
        alertId: qAlertId,
        title: qTitle,
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      }));
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  // ── Project Search Across All 1,981 Projects ──
  useEffect(() => {
    if (!projectQuery.trim()) {
      listProjects({ limit: 20 }).then(setProjectSearchResults).catch(() => {});
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingProjects(true);
        const res = await listProjects({ search: projectQuery.trim(), limit: 25 });
        setProjectSearchResults(res);
      } catch (e) {
        console.error("Project search error:", e);
      } finally {
        setIsSearchingProjects(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [projectQuery]);

  // ── Open Drawer & Load Detail ──
  const handleOpenDrawer = async (actionId: string) => {
    setSelectedActionId(actionId);
    setLoadingDetail(true);
    try {
      const [detail, cmts, hist] = await Promise.all([
        getActionDetail(actionId),
        listActionComments(actionId).catch(() => []),
        getActionHistory(actionId).catch(() => []),
      ]);
      setDetailAction(detail);
      setComments(cmts);
      setHistory(hist);
    } catch (e: any) {
      alert("Failed to load details: " + e.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedActionId(null);
    setDetailAction(null);
    setComments([]);
    setHistory([]);
  };

  // ── AI Assist: Grounded SHAP Intervention Directive ──
  const handleAiAssist = async () => {
    if (!createForm.projectId) {
      alert("Please select a target infrastructure project first.");
      return;
    }
    try {
      setIsGeneratingAi(true);
      const aiRec = await generateAiIntervention(createForm.projectId, createForm.alertId || undefined);
      setCreateForm((prev) => ({
        ...prev,
        title: aiRec.title || prev.title,
        rootCause: aiRec.root_cause || prev.rootCause,
        recommendedAction: aiRec.recommended_action || prev.recommendedAction,
        expectedOutcome: aiRec.expected_outcome || prev.expectedOutcome,
        priority: (aiRec.suggested_priority?.toLowerCase() as ActionPriority) || prev.priority,
        assignedOfficerId: aiRec.suggested_officer_id ? String(aiRec.suggested_officer_id) : prev.assignedOfficerId,
      }));
    } catch (e: any) {
      alert("AI recommendation error: " + (e.message || "Failed to generate directive"));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // ── Smart Officer Recommendation ──
  const handleSmartRecommendOfficer = async (projectId: string) => {
    if (!projectId) {
      alert("Please select a project first to match sector and ministry jurisdiction.");
      return;
    }
    try {
      const rec = await getRecommendedOfficer(projectId);
      if (rec?.officer?.id) {
        setSelectedOfficerId(String(rec.officer.id));
        setCreateForm((prev) => ({ ...prev, assignedOfficerId: String(rec.officer.id) }));
      }
    } catch (e: any) {
      alert("Officer recommendation failed: " + e.message);
    }
  };

  // ── Submit New Action ──
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      alert("Directive Title is required.");
      return;
    }
    try {
      setIsCreating(true);
      const created = await createAction({
        project_id: createForm.projectId || undefined,
        alert_id: createForm.alertId || undefined,
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        root_cause: createForm.rootCause.trim() || undefined,
        recommended_action: createForm.recommendedAction.trim() || undefined,
        expected_outcome: createForm.expectedOutcome.trim() || undefined,
        assigned_officer_id: createForm.assignedOfficerId || undefined,
        due_date: createForm.dueDate || undefined,
        priority: createForm.priority,
        source_type: createForm.sourceType,
      });

      setCreateModalOpen(false);
      await refreshAllData();
      handleOpenDrawer(created.id);
    } catch (e: any) {
      alert("Failed to create action directive: " + e.message);
    } finally {
      setIsCreating(false);
    }
  };

  // ── Assign Officer Submission ──
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionToOperate || !selectedOfficerId) return;
    try {
      setIsAssigning(true);
      const updated = await assignAction(actionToOperate.id, {
        officer_id: selectedOfficerId,
        notes: assignNotes.trim() || undefined,
      });
      setAssignModalOpen(false);
      setActionToOperate(null);
      await refreshAllData();
      if (selectedActionId === updated.id) {
        setDetailAction(updated);
        const hist = await getActionHistory(updated.id);
        setHistory(hist);
      }
    } catch (e: any) {
      alert("Failed to assign officer: " + e.message);
    } finally {
      setIsAssigning(false);
    }
  };

  // ── Complete Action Submission ──
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionToOperate || !actualOutcome.trim()) {
      alert("Actual outcome summary is required.");
      return;
    }
    try {
      setIsCompleting(true);
      const updated = await completeAction(actionToOperate.id, {
        completion_notes: completeNotes.trim() || "Milestone completed by designated officer",
        actual_outcome: actualOutcome.trim(),
        evidence_url: evidenceUrl.trim() || undefined,
      });
      setCompleteModalOpen(false);
      setActionToOperate(null);
      await refreshAllData();
      if (selectedActionId === updated.id) {
        setDetailAction(updated);
        const hist = await getActionHistory(updated.id);
        setHistory(hist);
      }
    } catch (e: any) {
      alert("Failed to submit completion: " + e.message);
    } finally {
      setIsCompleting(false);
    }
  };

  // ── Verify Action Submission ──
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionToOperate || !verifyNotes.trim()) {
      alert("Verification sign-off remarks are required.");
      return;
    }
    try {
      setIsVerifying(true);
      const updated = await verifyAction(actionToOperate.id, {
        is_approved: isApprovedDecision,
        verification_notes: verifyNotes.trim(),
      });
      setVerifyModalOpen(false);
      setActionToOperate(null);
      await refreshAllData();
      if (selectedActionId === updated.id) {
        setDetailAction(updated);
        const hist = await getActionHistory(updated.id);
        setHistory(hist);
      }
    } catch (e: any) {
      alert("Verification submission error: " + e.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Quick Status Transition (e.g. assigned -> in_progress) ──
  const handleQuickTransition = async (action: ActionItem, targetStatus: string) => {
    try {
      const updated = await transitionAction(action.id, {
        new_status: targetStatus,
        comment: `Transitioned to ${targetStatus.replace("_", " ")} via Executive Board`,
      });
      await refreshAllData();
      if (selectedActionId === updated.id) {
        setDetailAction(updated);
        const hist = await getActionHistory(updated.id);
        setHistory(hist);
      }
    } catch (e: any) {
      alert("Status transition rejected: " + e.message);
      refreshAllData();
    }
  };

  // ── Stakeholder Comment Submission ──
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActionId || !newCommentText.trim()) return;
    try {
      setSubmittingComment(true);
      const comment = await addActionComment(selectedActionId, newCommentText.trim());
      setComments((prev) => [comment, ...prev]);
      setNewCommentText("");
    } catch (e: any) {
      alert("Failed to add comment: " + e.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  // ── Delete Action ──
  const handleDeleteAction = async (actionId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this intervention directive?")) return;
    try {
      await deleteAction(actionId);
      if (selectedActionId === actionId) handleCloseDrawer();
      await refreshAllData();
    } catch (e: any) {
      alert("Failed to delete directive: " + e.message);
    }
  };

  // ── Filtered Actions Calculation ──
  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (priorityFilter !== "all" && a.priority !== priorityFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (selectedProjectId !== "all" && a.project_id !== selectedProjectId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          a.title.toLowerCase().includes(q) ||
          (a.action_number && a.action_number.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          (a.assigned_to && a.assigned_to.toLowerCase().includes(q)) ||
          (a.project_name && a.project_name.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [actions, priorityFilter, statusFilter, selectedProjectId, search]);

  return (
    <div>
      <TopBar
        title="Intervention Action Workflow"
        subtitle="End-to-end database-backed remediation lifecycle for at-risk infrastructure assets"
      />

      <div style={{ padding: "24px 24px 60px" }}>
        {/* ── 1. KPI STATS CARDS (LIVE DATABASE SUMMARIES) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {/* Total Interventions */}
          <div className="card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
              Total Directives
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>
              {summary ? summary.total : actions.length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Active ministerial directives
            </div>
          </div>

          {/* Pending Triage */}
          <div className="card" style={{ padding: "16px 20px", borderLeft: "3px solid #94a3b8" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.05em" }}>
              Pending Triage
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#94a3b8", marginTop: 4 }}>
              {summary ? summary.pending : actions.filter((a) => a.status === "pending").length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Awaiting officer assignment
            </div>
          </div>

          {/* Assigned */}
          <div className="card" style={{ padding: "16px 20px", borderLeft: "3px solid #38bdf8" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#38bdf8", letterSpacing: "0.05em" }}>
              Assigned
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#38bdf8", marginTop: 4 }}>
              {summary ? summary.assigned : actions.filter((a) => a.status === "assigned").length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Delegated to project teams
            </div>
          </div>

          {/* In Progress */}
          <div className="card" style={{ padding: "16px 20px", borderLeft: "3px solid #f59e0b" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#f59e0b", letterSpacing: "0.05em" }}>
              In Progress
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b", marginTop: 4 }}>
              {summary ? summary.in_progress : actions.filter((a) => a.status === "in_progress").length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Active ground execution
            </div>
          </div>

          {/* Completed */}
          <div className="card" style={{ padding: "16px 20px", borderLeft: "3px solid #10b981" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#10b981", letterSpacing: "0.05em" }}>
              Completed
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#10b981", marginTop: 4 }}>
              {summary ? summary.completed : actions.filter((a) => a.status === "completed").length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Awaiting verification sign-off
            </div>
          </div>

          {/* Verified & Closed */}
          <div className="card" style={{ padding: "16px 20px", borderLeft: "3px solid #8b5cf6" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#8b5cf6", letterSpacing: "0.05em" }}>
              Verified & Closed
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#8b5cf6", marginTop: 4 }}>
              {summary ? summary.verified : actions.filter((a) => a.status === "verified").length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Signed-off & archived
            </div>
          </div>

          {/* Overdue Alerts */}
          {summary && summary.overdue > 0 && (
            <div className="card" style={{ padding: "16px 20px", borderLeft: "3px solid #f43f5e", background: "rgba(244, 63, 94, 0.05)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#f43f5e", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5 }}>
                {Icons.alertTriangle}
                <span>Overdue Target</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f43f5e", marginTop: 4 }}>
                {summary.overdue}
              </div>
              <div style={{ fontSize: 11, color: "#f43f5e", marginTop: 2 }}>
                Target deadline passed
              </div>
            </div>
          )}
        </div>

        {/* ── 2. FILTER & ACTION CONTROLS BAR ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Search and Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1 }}>
            <input
              type="text"
              placeholder="Search by action #, directive title, officer, or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                minWidth: 260,
                maxWidth: 380,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                background: "var(--surface-2)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                outline: "none",
              }}
            />

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                background: "var(--surface-2)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical Priority</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: "var(--surface-2)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Triage</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="verified">Verified & Closed</option>
            </select>
          </div>

          {/* View Toggle & New Directive Button */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                display: "inline-flex",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                style={{
                  background: viewMode === "kanban" ? "var(--accent)" : "transparent",
                  color: viewMode === "kanban" ? "#000" : "var(--text-muted)",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Kanban Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  background: viewMode === "table" ? "var(--accent)" : "transparent",
                  color: viewMode === "table" ? "#000" : "var(--text-muted)",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Table View
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setCreateModalOpen(true);
                setProjectQuery("");
              }}
              style={{
                fontSize: 13,
                padding: "8px 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 0 15px rgba(56, 189, 248, 0.25)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Initiate Action Directive
            </button>
          </div>
        </div>

        {/* ── 3. MAIN CONTENT: KANBAN OR TABLE ── */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <LoadingSpinner size={36} label="Loading intervention action workflow..." />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={refreshAllData} />
        ) : filteredActions.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ color: "var(--accent)", display: "flex", justifyContent: "center", marginBottom: 14 }}>
              {Icons.clipboardList}
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>No Intervention Directives Found</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 440, margin: "0 auto 20px" }}>
              No intervention items match your current filter parameters. Initiate a new directive or reset filters.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSearch("");
                setPriorityFilter("all");
                setStatusFilter("all");
                setSelectedProjectId("all");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "kanban" ? (
          /* ── KANBAN BOARD VIEW ── */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            {KANBAN_COLUMNS.map((col) => {
              const colActions = filteredActions.filter((a) => a.status === col.key);
              return (
                <div
                  key={col.key}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 520,
                  }}
                >
                  {/* Column Header */}
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(255, 255, 255, 0.02)",
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: col.color, display: "inline-flex" }}>{col.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>
                        {col.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: col.badgeBg,
                        padding: "2px 8px",
                        borderRadius: 10,
                        color: col.color,
                      }}
                    >
                      {colActions.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                    {colActions.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "36px 16px",
                          color: "var(--text-muted)",
                          fontSize: 12,
                          border: "1px dashed var(--border)",
                          borderRadius: 8,
                          marginTop: 10,
                        }}
                      >
                        No directives in {col.label}
                      </div>
                    ) : (
                      colActions.map((item) => {
                        const pri = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
                        const isOverdue = item.deadline_status === "OVERDUE";
                        const isDueSoon = item.deadline_status === "DUE_SOON" || item.deadline_status === "DUE_TODAY";

                        return (
                          <div
                            key={item.id}
                            className="card"
                            onClick={() => handleOpenDrawer(item.id)}
                            style={{
                              padding: 14,
                              background: "var(--surface)",
                              border: `1px solid ${selectedActionId === item.id ? "var(--accent)" : "var(--border)"}`,
                              borderRadius: 10,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {/* Card Top: Action Number & Priority */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>
                                {item.action_number || "ACT-2026"}
                              </span>

                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {isOverdue && (
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 800,
                                      color: "#f43f5e",
                                      background: "rgba(244,63,94,0.15)",
                                      border: "1px solid rgba(244,63,94,0.3)",
                                      padding: "1px 5px",
                                      borderRadius: 4,
                                    }}
                                  >
                                    OVERDUE
                                  </span>
                                )}
                                {isDueSoon && !isOverdue && (
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 800,
                                      color: "#f59e0b",
                                      background: "rgba(245,158,11,0.15)",
                                      border: "1px solid rgba(245,158,11,0.3)",
                                      padding: "1px 5px",
                                      borderRadius: 4,
                                    }}
                                  >
                                    DUE SOON
                                  </span>
                                )}

                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: pri.bg,
                                    color: pri.text,
                                    border: `1px solid ${pri.border}`,
                                  }}
                                >
                                  {pri.label}
                                </span>
                              </div>
                            </div>

                            {/* Project Context */}
                            {item.project_name && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-sub)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                <span style={{ color: "var(--accent)" }}>{Icons.pin}</span>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.project_name}</span>
                              </div>
                            )}

                            {/* Directive Title */}
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>
                              {item.title}
                            </div>

                            {/* Description */}
                            {item.description && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                  lineHeight: 1.45,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {item.description}
                              </div>
                            )}

                            {/* Progress bar if in progress or completed */}
                            {(item.status === "in_progress" || item.status === "completed" || item.status === "verified") && (
                              <div style={{ marginTop: 2 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>
                                  <span>Progress</span>
                                  <span style={{ fontWeight: 700, color: item.status === "verified" ? "#8b5cf6" : "#10b981" }}>
                                    {item.completion_percentage ?? (item.status === "completed" || item.status === "verified" ? 100 : 0)}%
                                  </span>
                                </div>
                                <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                                  <div
                                    style={{
                                      width: `${item.completion_percentage ?? (item.status === "completed" || item.status === "verified" ? 100 : 0)}%`,
                                      height: "100%",
                                      background: item.status === "verified" ? "#8b5cf6" : item.status === "completed" ? "#10b981" : "#f59e0b",
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Card Footer: Assignee, Due Date, Quick Action */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingTop: 8,
                                borderTop: "1px solid var(--border)",
                                marginTop: 4,
                              }}
                            >
                              <div style={{ fontSize: 11, color: "var(--text-sub)", display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ color: "var(--text-muted)" }}>{Icons.user}</span>
                                <span style={{ maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {item.assigned_to || "Unassigned"}
                                </span>
                              </div>

                              {/* State Transition Controls */}
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                                {item.status === "pending" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionToOperate(item);
                                      setSelectedOfficerId(item.assigned_officer_id ? String(item.assigned_officer_id) : "");
                                      setAssignNotes("");
                                      setAssignModalOpen(true);
                                    }}
                                    style={{
                                      background: "var(--accent-glow-2)",
                                      border: "1px solid var(--accent)",
                                      color: "var(--accent)",
                                      padding: "3px 8px",
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Assign
                                  </button>
                                )}

                                {item.status === "assigned" && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickTransition(item, "in_progress")}
                                    style={{
                                      background: "rgba(245,158,11,0.15)",
                                      border: "1px solid #f59e0b",
                                      color: "#f59e0b",
                                      padding: "3px 8px",
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Start
                                  </button>
                                )}

                                {item.status === "in_progress" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionToOperate(item);
                                      setActualOutcome("");
                                      setCompleteNotes("");
                                      setEvidenceUrl("");
                                      setCompleteModalOpen(true);
                                    }}
                                    style={{
                                      background: "rgba(16,185,129,0.15)",
                                      border: "1px solid #10b981",
                                      color: "#10b981",
                                      padding: "3px 8px",
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Complete
                                  </button>
                                )}

                                {item.status === "completed" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionToOperate(item);
                                      setIsApprovedDecision(true);
                                      setVerifyNotes("");
                                      setVerifyModalOpen(true);
                                    }}
                                    style={{
                                      background: "rgba(139,92,246,0.15)",
                                      border: "1px solid #8b5cf6",
                                      color: "#8b5cf6",
                                      padding: "3px 8px",
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Verify
                                  </button>
                                )}

                                {item.status === "verified" && (
                                  <span style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                                    {Icons.shieldCheck} Closed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── TABLE VIEW ── */
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid var(--border)",
                      textAlign: "left",
                      color: "var(--text-muted)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "12px 16px" }}>Action #</th>
                    <th style={{ padding: "12px 16px" }}>Priority</th>
                    <th style={{ padding: "12px 16px" }}>Directive Title</th>
                    <th style={{ padding: "12px 16px" }}>Project</th>
                    <th style={{ padding: "12px 16px" }}>Assigned Officer</th>
                    <th style={{ padding: "12px 16px" }}>Due Date</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActions.map((item) => {
                    const pri = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
                    const isOverdue = item.deadline_status === "OVERDUE";
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleOpenDrawer(item.id)}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                          background: selectedActionId === item.id ? "rgba(56, 189, 248, 0.05)" : "transparent",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = selectedActionId === item.id ? "rgba(56, 189, 248, 0.05)" : "transparent")
                        }
                      >
                        <td style={{ padding: "12px 16px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "var(--accent)" }}>
                          {item.action_number || "ACT-2026"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 7px",
                              borderRadius: 4,
                              background: pri.bg,
                              color: pri.text,
                              border: `1px solid ${pri.border}`,
                            }}
                          >
                            {pri.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", maxWidth: 300 }}>
                          <div style={{ fontWeight: 600, color: "var(--text)" }}>{item.title}</div>
                          {item.description && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", maxWidth: 220 }}>
                          <div style={{ fontSize: 12, color: "var(--text-sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.project_name || "—"}
                          </div>
                          {item.project_ministry && (
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.project_ministry}</div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 12, color: "var(--text)", display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ color: "var(--text-muted)" }}>{Icons.user}</span>
                            <span>{item.assigned_to || "Unassigned"}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 12, color: isOverdue ? "#f43f5e" : "var(--text-muted)", fontWeight: isOverdue ? 700 : 500 }}>
                            {item.due_date || "—"}
                          </div>
                          {isOverdue && <span style={{ fontSize: 9, color: "#f43f5e", fontWeight: 800 }}>OVERDUE</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "capitalize",
                              padding: "3px 8px",
                              borderRadius: 6,
                              background:
                                item.status === "verified"
                                  ? "rgba(139,92,246,0.15)"
                                  : item.status === "completed"
                                  ? "rgba(16,185,129,0.15)"
                                  : item.status === "in_progress"
                                  ? "rgba(245,158,11,0.15)"
                                  : item.status === "assigned"
                                  ? "rgba(56,189,248,0.15)"
                                  : "rgba(148,163,184,0.15)",
                              color:
                                item.status === "verified"
                                  ? "#8b5cf6"
                                  : item.status === "completed"
                                  ? "#10b981"
                                  : item.status === "in_progress"
                                  ? "#f59e0b"
                                  : item.status === "assigned"
                                  ? "#38bdf8"
                                  : "#94a3b8",
                            }}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleDeleteAction(item.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: "4px 8px",
                              fontSize: 12,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#f43f5e")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. ACTION DETAIL DRAWER (11 COMPREHENSIVE SECTIONS) ── */}
      {selectedActionId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9998,
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={handleCloseDrawer}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 580,
              height: "100vh",
              background: "#0d131f",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              padding: 24,
            }}
          >
            {loadingDetail || !detailAction ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <LoadingSpinner size={32} label="Loading intervention details..." />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* 1. Header & Quick Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {detailAction.action_number || "ACT-2026"}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: PRIORITY_CONFIG[detailAction.priority].bg,
                          color: PRIORITY_CONFIG[detailAction.priority].text,
                          border: `1px solid ${PRIORITY_CONFIG[detailAction.priority].border}`,
                        }}
                      >
                        {detailAction.priority}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "capitalize",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.06)",
                          color: "var(--text)",
                        }}
                      >
                        {detailAction.status.replace("_", " ")}
                      </span>
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: 0, lineHeight: 1.35 }}>
                      {detailAction.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, fontSize: 18 }}
                  >
                    ✕
                  </button>
                </div>

                {/* 2. Project Context */}
                <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 14, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--accent)", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    {Icons.pin} Target Project Context
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    {detailAction.project_name || "Unlinked Project"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Ministry: <span style={{ color: "var(--text-sub)" }}>{detailAction.project_ministry || "N/A"}</span> • Sector: <span style={{ color: "var(--text-sub)" }}>{detailAction.project_sector || "N/A"}</span> • State: <span style={{ color: "var(--text-sub)" }}>{detailAction.project_state || "N/A"}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11 }}>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Sanctioned Cost: </span>
                      <strong style={{ color: "var(--text)" }}>₹{detailAction.project_cost_cr?.toLocaleString() || "—"} Cr</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Physical Progress: </span>
                      <strong style={{ color: "var(--text)" }}>{detailAction.project_progress_pct ?? "—"}%</strong>
                    </div>
                  </div>
                  {detailAction.project_id && (
                    <div style={{ marginTop: 8 }}>
                      <Link
                        href={`/projects/${detailAction.project_id}`}
                        style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}
                      >
                        View Full Project Dossier {Icons.externalLink}
                      </Link>
                    </div>
                  )}
                </div>

                {/* 3. SHAP Factors (If present) */}
                {detailAction.shap_factors && detailAction.shap_factors.length > 0 && (
                  <div style={{ background: "rgba(56, 189, 248, 0.04)", borderRadius: 10, padding: 14, border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--accent)", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                      {Icons.sparkles} Explainable AI (SHAP) Risk Drivers
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {detailAction.shap_factors.slice(0, 4).map((f, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                          <span style={{ color: "var(--text-sub)" }}>{f.label || f.feature}</span>
                          <span style={{ fontWeight: 700, color: f.direction === "positive" ? "#f43f5e" : "#10b981" }}>
                            {f.direction === "positive" ? "+" : "-"}{(Math.abs(f.value) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Root Cause & Regulatory Roadblocks */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 6 }}>
                    Identified Root Cause & Roadblocks
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)", background: "var(--surface-2)", padding: 12, borderRadius: 8, border: "1px solid var(--border)", lineHeight: 1.5 }}>
                    {detailAction.root_cause || detailAction.description || "No specific root cause notes registered."}
                  </div>
                </div>

                {/* 5. Recommended Action Roadmap & Expected Outcome */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 6 }}>
                    Recommended Action Directives
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)", background: "var(--surface-2)", padding: 12, borderRadius: 8, border: "1px solid var(--border)", lineHeight: 1.5, marginBottom: 10 }}>
                    {detailAction.recommended_action || "Standard executive review and inter-departmental clearance protocol."}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 6 }}>
                    Expected Outcome
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)", background: "var(--surface-2)", padding: 12, borderRadius: 8, border: "1px solid var(--border)", lineHeight: 1.5 }}>
                    {detailAction.expected_outcome || "Resolution of impediment and resumption of target milestone pace."}
                  </div>
                </div>

                {/* 6. Assigned Officer Profile */}
                <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 14, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                      Assigned Officer
                    </div>
                    {detailAction.status !== "verified" && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionToOperate(detailAction);
                          setSelectedOfficerId(detailAction.assigned_officer_id ? String(detailAction.assigned_officer_id) : "");
                          setAssignNotes("");
                          setAssignModalOpen(true);
                        }}
                        style={{ background: "transparent", border: "none", color: "var(--accent)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                      >
                        Reassign Officer
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-glow-2)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 800, fontSize: 13 }}>
                      {detailAction.assigned_to ? detailAction.assigned_to.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                        {detailAction.assigned_to || "Unassigned Officer"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Designated Field / Project Director
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7. Execution Timeline & Deadlines */}
                <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 14, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    {Icons.calendar} Timeline &amp; Key Dates
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Target Due Date: </span>
                      <strong style={{ color: detailAction.deadline_status === "OVERDUE" ? "#f43f5e" : "var(--text)" }}>
                        {detailAction.due_date || "Not set"}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Initiated Date: </span>
                      <strong style={{ color: "var(--text)" }}>{detailAction.created_at ? detailAction.created_at.split("T")[0] : "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Execution Started: </span>
                      <strong style={{ color: "var(--text)" }}>{detailAction.started_at ? detailAction.started_at.split("T")[0] : "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Completed: </span>
                      <strong style={{ color: "var(--text)" }}>{detailAction.completed_at ? detailAction.completed_at.split("T")[0] : "—"}</strong>
                    </div>
                  </div>
                </div>

                {/* 8. Completion Evidence & Outcome (If completed) */}
                {detailAction.actual_outcome && (
                  <div style={{ background: "rgba(16, 185, 129, 0.05)", borderRadius: 10, padding: 14, border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#10b981", letterSpacing: "0.05em", marginBottom: 6 }}>
                      Submitted Completion Outcome
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                      {detailAction.actual_outcome}
                    </div>
                    {detailAction.evidence_url && (
                      <div style={{ marginTop: 8, fontSize: 11 }}>
                        <a href={detailAction.evidence_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                          View Verification Document / Evidence Attachment →
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* 9. Verification Sign-off (If verified) */}
                {detailAction.verified_at && (
                  <div style={{ background: "rgba(139, 92, 246, 0.06)", borderRadius: 10, padding: 14, border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#8b5cf6", letterSpacing: "0.05em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      {Icons.shieldCheck} Senior Official Verification &amp; Closure
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text)" }}>
                      Remarks: {detailAction.verification_notes || "Verified by authorized ministerial official."}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      Verified On: {detailAction.verified_at.split("T")[0]}
                    </div>
                  </div>
                )}

                {/* 10. Stakeholder Discussion & Comments */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    {Icons.messageSquare} Stakeholder Collaboration Feed ({comments.length})
                  </div>

                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <input
                      type="text"
                      placeholder="Add an executive note or field update..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !newCommentText.trim()}
                      className="btn btn-primary"
                      style={{ padding: "8px 14px", fontSize: 12 }}
                    >
                      Post Note
                    </button>
                  </form>

                  {/* Comments List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                    {comments.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: "16px 0" }}>
                        No stakeholder notes recorded yet.
                      </div>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{c.user_name || "Official"}</span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{c.created_at ? c.created_at.split("T")[0] : ""}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-sub)", lineHeight: 1.4 }}>{c.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 11. Tamper-Evident Audit Timeline */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    {Icons.history} Tamper-Evident Audit Trail ({history.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                    {history.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>
                        Audit timeline initializing...
                      </div>
                    ) : (
                      history.map((h) => (
                        <div key={h.id} style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 10, fontSize: 11, display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                            <span style={{ fontWeight: 700, color: "var(--text)" }}>
                              {h.previous_status && h.new_status ? `${h.previous_status} → ${h.new_status}` : h.event_type || h.new_status}
                            </span>
                            <span>{h.created_at ? h.created_at.split("T")[0] : ""}</span>
                          </div>
                          <div style={{ color: "var(--text-sub)" }}>{h.comment || `Recorded by ${h.changed_by_name || "Official"}`}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. MODAL: INITIATE ACTION DIRECTIVE ── */}
      {createModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 620,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 24,
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                  Initiate Intervention Action Directive
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                  Mandate an official remediation protocol backed by the central project monitoring registry
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Project Search Across 1,981 Projects */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                    Target Infrastructure Project *
                  </label>
                  {createForm.projectId && (
                    <button
                      type="button"
                      onClick={handleAiAssist}
                      disabled={isGeneratingAi}
                      style={{
                        background: "rgba(56, 189, 248, 0.12)",
                        border: "1px solid var(--accent)",
                        color: "var(--accent)",
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {Icons.sparkles} {isGeneratingAi ? "Analyzing SHAP..." : "AI Auto-Populate Directive"}
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Search across all 1,981 projects by name or ID (e.g. 612786, NHAI, Metro)..."
                  value={projectQuery}
                  onChange={(e) => setProjectQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    outline: "none",
                    marginBottom: 6,
                  }}
                />

                {projectSearchResults.length > 0 && (
                  <div
                    style={{
                      maxHeight: 140,
                      overflowY: "auto",
                      background: "#0d131f",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    {projectSearchResults.map((p) => {
                      const isSelected = createForm.projectId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setCreateForm((prev) => ({ ...prev, projectId: p.id, projectName: p.project_name }));
                            setProjectQuery(p.project_name);
                          }}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: 12,
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                            background: isSelected ? "rgba(56, 189, 248, 0.15)" : "transparent",
                            color: isSelected ? "var(--accent)" : "var(--text)",
                          }}
                        >
                          <strong style={{ display: "block" }}>{p.project_name}</strong>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                            {p.state} • {p.sector} • ₹{p.original_cost_cr?.toLocaleString()} Cr
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Directive Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stage-II Forest Clearance Expedited Filing & Nodal Escrow Audit"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Root Cause & Recommended Action */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Root Cause / Impediment
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Environmental clearance delay, contractor dispute, land acquisition..."
                    value={createForm.rootCause}
                    onChange={(e) => setCreateForm({ ...createForm, rootCause: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      background: "var(--surface-2)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Remediation Action Steps
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Mandate bi-weekly field coordination, disburse pending compensation..."
                    value={createForm.recommendedAction}
                    onChange={(e) => setCreateForm({ ...createForm, recommendedAction: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      background: "var(--surface-2)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>

              {/* Officer Selection & Smart Match */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                    Assigned Monitoring Officer
                  </label>
                  {createForm.projectId && (
                    <button
                      type="button"
                      onClick={() => handleSmartRecommendOfficer(createForm.projectId)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Smart Match by Workload &amp; Ministry
                    </button>
                  )}
                </div>

                <select
                  value={createForm.assignedOfficerId}
                  onChange={(e) => setCreateForm({ ...createForm, assignedOfficerId: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    outline: "none",
                  }}
                >
                  <option value="">-- Leave Unassigned (Pending Triage) --</option>
                  {officers.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.full_name || off.email} ({off.designation || off.role}) — {off.active_actions_count} active interventions
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date & Priority */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      background: "var(--surface-2)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Priority Tier
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as ActionPriority })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      background: "var(--surface-2)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      outline: "none",
                    }}
                  >
                    <option value="critical">Critical Priority</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn btn-primary"
                  style={{ padding: "9px 20px", fontSize: 13 }}
                >
                  {isCreating ? "Submitting Directive..." : "Issue Official Directive"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. MODAL: ASSIGN OFFICER ── */}
      {assignModalOpen && actionToOperate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 520,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 24,
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Assign Officer to Directive {actionToOperate.action_number}
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-muted)" }}>
              {actionToOperate.title}
            </p>

            <form onSubmit={handleAssignSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Select Designated Monitoring Officer *
                </label>
                <select
                  required
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    outline: "none",
                  }}
                >
                  <option value="">-- Choose Authorized Officer --</option>
                  {officers.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.full_name || off.email} ({off.designation || off.role}) — {off.department_or_ministry || "MoSPI"} ({off.active_actions_count} active)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Handover Notes / Specific Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Delegation scope, immediate action item priority, field contact..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !selectedOfficerId}
                  className="btn btn-primary"
                  style={{ padding: "8px 18px", fontSize: 13 }}
                >
                  {isAssigning ? "Assigning..." : "Confirm Officer Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. MODAL: COMPLETE ACTION & SUBMIT EVIDENCE ── */}
      {completeModalOpen && actionToOperate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 520,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 24,
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Submit Milestone Completion Evidence
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-muted)" }}>
              {actionToOperate.action_number} — {actionToOperate.title}
            </p>

            <form onSubmit={handleCompleteSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Actual Remediation Outcome *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the exact ground outcome achieved (e.g. Forest department Stage-II clearance certificate issued on 14-Apr)..."
                  value={actualOutcome}
                  onChange={(e) => setActualOutcome(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Evidence Document URL or Storage Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://digilocker.gov.in/doc/FC-2026-991"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Officer Sign-off Notes
                </label>
                <input
                  type="text"
                  placeholder="Verified by field team; ready for senior administrative review"
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompleting || !actualOutcome.trim()}
                  className="btn btn-primary"
                  style={{ padding: "8px 18px", fontSize: 13, background: "#10b981", borderColor: "#10b981" }}
                >
                  {isCompleting ? "Submitting..." : "Submit for Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. MODAL: SENIOR OFFICIAL VERIFY & SIGN-OFF ── */}
      {verifyModalOpen && actionToOperate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 520,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 24,
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Senior Official Verification &amp; Closure
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-muted)" }}>
              Directive: {actionToOperate.action_number} — {actionToOperate.title}
            </p>

            <form onSubmit={handleVerifySubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
                  Verification Decision *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsApprovedDecision(true)}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      border: `1px solid ${isApprovedDecision ? "#10b981" : "var(--border)"}`,
                      background: isApprovedDecision ? "rgba(16,185,129,0.15)" : "transparent",
                      color: isApprovedDecision ? "#10b981" : "var(--text-muted)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {Icons.checkCircle} Approve &amp; Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsApprovedDecision(false)}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      border: `1px solid ${!isApprovedDecision ? "#f43f5e" : "var(--border)"}`,
                      background: !isApprovedDecision ? "rgba(244,63,94,0.15)" : "transparent",
                      color: !isApprovedDecision ? "#f43f5e" : "var(--text-muted)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {Icons.alertTriangle} Request Rework
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                  Administrative Verification Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={
                    isApprovedDecision
                      ? "Evidence inspected and validated; directive officially closed in PRISM central database."
                      : "Ground clearance insufficient; contractor penalty clause invoked, rework required."
                  }
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !verifyNotes.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: "8px 18px",
                    fontSize: 13,
                    background: isApprovedDecision ? "#8b5cf6" : "#f43f5e",
                    borderColor: isApprovedDecision ? "#8b5cf6" : "#f43f5e",
                  }}
                >
                  {isVerifying ? "Submitting..." : isApprovedDecision ? "Confirm & Close" : "Return for Rework"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
