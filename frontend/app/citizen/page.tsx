"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  listPublicProjects,
  getPublicProject,
  getPublicFilterOptions,
  submitCitizenGrievance,
  trackCitizenGrievance,
} from "../../lib/api";
import type {
  PublicProjectListItem,
  PublicProjectDetail,
  PublicFilterOptions,
  CitizenGrievanceOut,
} from "../../lib/types";

export default function CitizenPortalPage() {
  // Projects & Pagination State
  const [projects, setProjects] = useState<PublicProjectListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(1981);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);
  const [loading, setLoading] = useState<boolean>(true);

  // Status Counts
  const [countsByStatus, setCountsByStatus] = useState<{
    ALL?: number;
    ON_SCHEDULE?: number;
    ACTIVE_MONITORING?: number;
    DELAYED?: number;
    [key: string]: number | undefined;
  }>({
    ALL: 1981,
    ON_SCHEDULE: 1501,
    ACTIVE_MONITORING: 324,
    DELAYED: 156,
  });

  // Filter Options for Dropdowns
  const [filterOptions, setFilterOptions] = useState<PublicFilterOptions>({
    states: [],
    sectors: [],
    ministries: [],
    agencies: [],
    counts_by_status: {},
    total: 1981,
  });

  // Active Filter Controls
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [sectorFilter, setSectorFilter] = useState<string>("");
  const [ministryFilter, setMinistryFilter] = useState<string>("");
  const [sortField, setSortField] = useState<string>("revised_cost_cr");
  const [sortOrder, setSortOrder] = useState<string>("desc");

  // Project Detail Modal
  const [selectedProject, setSelectedProject] = useState<PublicProjectDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Grievance Filing Modal
  const [showGrievanceModal, setShowGrievanceModal] = useState<boolean>(false);
  const [grievanceTarget, setGrievanceTarget] = useState<PublicProjectListItem | null>(null);
  const [citizenName, setCitizenName] = useState<string>("");
  const [citizenPhone, setCitizenPhone] = useState<string>("");
  const [citizenEmail, setCitizenEmail] = useState<string>("");
  const [category, setCategory] = useState<string>("Work Delay");
  const [description, setDescription] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [coords, setCoords] = useState<{ lat?: number; lon?: number }>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // Grievance Tracking Modal
  const [showTrackerModal, setShowTrackerModal] = useState<boolean>(false);
  const [trackingId, setTrackingId] = useState<string>("");
  const [trackedRecord, setTrackedRecord] = useState<CitizenGrievanceOut | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const listTopRef = useRef<HTMLDivElement>(null);

  // Load filter options on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const opts = await getPublicFilterOptions();
        setFilterOptions(opts);
        if (opts.counts_by_status) {
          setCountsByStatus(opts.counts_by_status);
          if (opts.total) setTotalCount(opts.total);
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    }
    loadOptions();
  }, []);

  // Handle URL query parameter `?project={project_id}`
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const projParam = urlParams.get("project");
      if (projParam) {
        handleOpenProjectById(projParam);
      }
    }
  }, []);

  // Fetch projects whenever filters or page change
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listPublicProjects({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        state: stateFilter || undefined,
        sector: sectorFilter || undefined,
        ministry: ministryFilter || undefined,
        sort: sortField,
        order: sortOrder,
        page: currentPage,
        page_size: pageSize,
      });

      setProjects(res.data);
      setTotalCount(res.pagination.total);
      setTotalPages(res.pagination.total_pages);
      if (res.counts_by_status && Object.keys(res.counts_by_status).length > 0) {
        setCountsByStatus(res.counts_by_status);
      }
    } catch (err) {
      console.error("Failed to load public projects", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, stateFilter, sectorFilter, ministryFilter, sortField, sortOrder, currentPage, pageSize]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSearchInput("");
    setStatusFilter("");
    setStateFilter("");
    setSectorFilter("");
    setMinistryFilter("");
    setSortField("revised_cost_cr");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleOpenProjectById = async (idOrProjectId: string) => {
    try {
      setLoadingDetail(true);
      const detail = await getPublicProject(idOrProjectId);
      setSelectedProject(detail);
    } catch (err) {
      console.error("Failed to load project details for:", idOrProjectId, err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleViewDetail = async (proj: PublicProjectListItem) => {
    handleOpenProjectById(proj.project_id || proj.id);
  };

  const openGrievanceModal = (proj: PublicProjectListItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setGrievanceTarget(proj);
    setCitizenName("");
    setCitizenPhone("");
    setCitizenEmail("");
    setCategory("Work Delay");
    setDescription("");
    setPincode("");
    setSubmittedRef(null);
    setShowGrievanceModal(true);
  };

  const handleDetectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: Number(pos.coords.latitude.toFixed(5)),
            lon: Number(pos.coords.longitude.toFixed(5)),
          });
        },
        () => alert("Location permission denied or unavailable.")
      );
    }
  };

  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievanceTarget) return;

    try {
      setSubmitting(true);
      const res = await submitCitizenGrievance({
        project_id: grievanceTarget.project_id || grievanceTarget.id,
        citizen_name: citizenName,
        citizen_phone: citizenPhone || undefined,
        citizen_email: citizenEmail || undefined,
        category,
        description,
        pincode: pincode || undefined,
        latitude: coords.lat,
        longitude: coords.lon,
      });
      setSubmittedRef(res.reference_id);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || "Failed to submit grievance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    try {
      setTrackingLoading(true);
      setTrackingError(null);
      const record = await trackCitizenGrievance(trackingId.trim());
      setTrackedRecord(record);
    } catch (err: any) {
      setTrackingError(err.message || "Grievance record not found");
      setTrackedRecord(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Helper for rendering pagination page numbers with ellipsis
  const renderPaginationButtons = () => {
    const pages: (number | string)[] = [];
    const maxButtons = 7;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages.map((p, idx) => {
      if (p === "...") {
        return (
          <span key={`ellipsis-${idx}`} style={{ padding: "6px 10px", color: "#64748b", fontSize: 13 }}>
            ...
          </span>
        );
      }
      const pageNum = Number(p);
      const isActive = pageNum === currentPage;
      return (
        <button
          key={`page-${pageNum}`}
          onClick={() => handlePageChange(pageNum)}
          style={{
            minWidth: 36,
            height: 36,
            padding: "0 8px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: isActive ? 700 : 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
            background: isActive ? "#0284c7" : "#1e293b",
            color: isActive ? "#ffffff" : "#cbd5e1",
            border: isActive ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {pageNum}
        </button>
      );
    });
  };

  const hasActiveFilters = Boolean(
    search || statusFilter || stateFilter || sectorFilter || ministryFilter || sortField !== "revised_cost_cr" || sortOrder !== "desc"
  );

  return (
    <div style={{ minHeight: "100vh", background: "#090d16", color: "#e2e8f0", fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>
      {/* Top National Header Bar */}
      <div style={{ background: "linear-gradient(90deg, #1e293b 0%, #0f172a 100%)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/logo.jpg"
              alt="PRISM Logo"
              style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(56, 189, 248, 0.3)" }}
            />
            <div style={{ width: 4, height: 28, background: "linear-gradient(180deg, #f97316 0%, #ffffff 50%, #22c55e 100%)", borderRadius: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "#38bdf8", textTransform: "uppercase" }}>
                Government of India • MoSPI PRISM
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                National Public Infrastructure Transparency & Citizen Social Audit Portal • Flash Report April 2026
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => { setShowTrackerModal(true); setTrackedRecord(null); setTrackingError(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6,
                background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#38bdf8", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Track Grievance Status
            </button>
            <Link
              href="/dashboard"
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6,
                background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1", fontSize: 12, fontWeight: 500, textDecoration: "none",
              }}
            >
              Officer Login →
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div style={{ background: "radial-gradient(ellipse at 50% -20%, rgba(56, 189, 248, 0.15), transparent 70%), #0b1120", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "40px 24px 32px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 14px", borderRadius: 999, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.25)", color: "#4ade80", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
            Authoritative Dataset: April 2026 Complete Flash Report Registry (1,981 Ongoing Projects)
          </div>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, color: "#f8fafc", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Track Every Central Infrastructure Project in India
          </h1>
          <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 760, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Direct access to all 1,981 major ongoing central infrastructure projects sanctioned by the Government of India.
            Search across Project IDs, executing agencies, sectors, and states with verified April 2026 flash report metrics.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, maxWidth: 680, margin: "0 auto 20px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                placeholder="Search by project name, ID (e.g. 612786), agency, PMGiD, sector, or state..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 8,
                  background: "#1e293b", border: "1px solid rgba(255,255,255,0.15)",
                  color: "white", fontSize: 14, outline: "none",
                }}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "transparent", border: "none", color: "#94a3b8", fontSize: 14, cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              style={{
                padding: "12px 24px", borderRadius: 8, background: "#0284c7",
                color: "white", fontWeight: 600, border: "none", cursor: "pointer", fontSize: 14,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Search
            </button>
          </form>

          {/* Status Tabs with Dynamic Counts */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "All Projects", val: "", count: countsByStatus.ALL || 1981, color: "#38bdf8" },
              { label: "On Schedule", val: "ON_SCHEDULE", count: countsByStatus.ON_SCHEDULE || 1501, color: "#4ade80" },
              { label: "Active Monitoring", val: "ACTIVE_MONITORING", count: countsByStatus.ACTIVE_MONITORING || 324, color: "#facc15" },
              { label: "Critical Delay", val: "DELAYED", count: countsByStatus.DELAYED || 156, color: "#f87171" },
            ].map((f) => {
              const active = statusFilter === f.val;
              return (
                <button
                  key={f.val}
                  onClick={() => {
                    setStatusFilter(f.val);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "7px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s ease",
                    background: active ? f.color : "rgba(255,255,255,0.05)",
                    color: active ? "#090d16" : "#cbd5e1",
                    border: active ? `1px solid ${f.color}` : "1px solid rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span>{f.label}</span>
                  <span
                    style={{
                      background: active ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)",
                      padding: "1px 6px",
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                  >
                    {f.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Public Registry Section */}
      <div ref={listTopRef} style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        
        {/* Filter Controls Bar */}
        <div
          style={{
            background: "#0f172a",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Dropdown Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            {/* State Filter */}
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                background: "#1e293b", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)",
                padding: "8px 12px", borderRadius: 6, fontSize: 12, outline: "none", minWidth: 150,
              }}
            >
              <option value="">All States / UTs ({filterOptions.states.length})</option>
              {filterOptions.states.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* Sector Filter */}
            <select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                background: "#1e293b", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)",
                padding: "8px 12px", borderRadius: 6, fontSize: 12, outline: "none", minWidth: 150,
              }}
            >
              <option value="">All Sectors ({filterOptions.sectors.length})</option>
              {filterOptions.sectors.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            {/* Ministry Filter */}
            <select
              value={ministryFilter}
              onChange={(e) => {
                setMinistryFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                background: "#1e293b", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)",
                padding: "8px 12px", borderRadius: 6, fontSize: 12, outline: "none", minWidth: 170,
              }}
            >
              <option value="">All Ministries ({filterOptions.ministries.length})</option>
              {filterOptions.ministries.map((min) => (
                <option key={min} value={min}>{min}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                style={{
                  padding: "8px 12px", borderRadius: 6, background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>

          {/* Sort & Page Size Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              style={{
                background: "#1e293b", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)",
                padding: "8px 10px", borderRadius: 6, fontSize: 12, outline: "none",
              }}
            >
              <option value="revised_cost_cr">Cost (Sanctioned)</option>
              <option value="physical_progress_pct">Physical Progress %</option>
              <option value="project_name">Project Name</option>
              <option value="project_id">Project ID</option>
              <option value="revised_target_doc_mm_yyyy">Target Completion Date</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              title={`Toggle sort order: currently ${sortOrder.toUpperCase()}`}
              style={{
                padding: "8px 10px", borderRadius: 6, background: "#1e293b",
                border: "1px solid rgba(255,255,255,0.12)", color: "#38bdf8",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
            </button>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                background: "#1e293b", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)",
                padding: "8px 10px", borderRadius: 6, fontSize: 12, outline: "none",
              }}
            >
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
              <option value={48}>48 / page</option>
              <option value={96}>96 / page</option>
            </select>
          </div>
        </div>

        {/* Section Header with Dynamic Matching Total */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" }}>
              Public Projects Registry ({totalCount.toLocaleString()})
            </h2>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Showing {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount.toLocaleString()} authoritative April 2026 ongoing projects
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
              Report Month: April 2026
            </span>
            <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
              100% MoSPI Flash Report Certified
            </span>
          </div>
        </div>

        {/* Project Feed */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "100px 0", color: "#64748b" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #38bdf8", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "#cbd5e1" }}>Querying Authoritative April 2026 Central Registry...</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Loading 1,981 flash report records from MoSPI database</div>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", background: "#0f172a", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.12)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "#38bdf8" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc", margin: "0 0 6px" }}>No Central Infrastructure Projects Found</h3>
            <p style={{ color: "#94a3b8", maxWidth: 480, margin: "0 auto 16px", fontSize: 14 }}>
              No ongoing projects match the search query &quot;{search}&quot; with the selected state or sector filters.
            </p>
            <button
              onClick={handleResetFilters}
              style={{
                padding: "8px 18px", borderRadius: 6, background: "#0284c7",
                border: "none", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              Reset Filters & View All 1,981 Projects
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 20 }}>
            {projects.map((proj) => {
              const statusColors = {
                ON_SCHEDULE: { bg: "rgba(34, 197, 94, 0.12)", border: "#22c55e", text: "#4ade80", label: "On Schedule" },
                ACTIVE_MONITORING: { bg: "rgba(234, 179, 8, 0.12)", border: "#eab308", text: "#fde047", label: "Active Monitoring" },
                DELAYED: { bg: "rgba(239, 68, 68, 0.12)", border: "#ef4444", text: "#f87171", label: "Behind Schedule" },
              }[proj.public_status] || { bg: "rgba(148, 163, 184, 0.1)", border: "#64748b", text: "#94a3b8", label: "Standard" };

              const displayCost = proj.revised_cost_cr || proj.original_cost_cr || 0;
              const displayExp = proj.cumulative_expenditure_cr || 0;
              const progressPct = proj.physical_progress_pct ?? 0;
              const targetDoc = proj.revised_target_doc_mm_yyyy || proj.original_target_doc_mm_yyyy || proj.scheduled_completion_date || "N/A";

              return (
                <div
                  key={proj.id}
                  onClick={() => handleViewDetail(proj)}
                  style={{
                    background: "#0f172a", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
                    padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between",
                    cursor: "pointer", transition: "all 0.2s ease", position: "relative",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                >
                  <div>
                    {/* Header Badges */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", textTransform: "uppercase" }}>
                          {proj.sector || "Infrastructure"}
                        </span>
                        {proj.project_id && (
                          <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                            ID: {proj.project_id}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: statusColors.bg, color: statusColors.text, border: `1px solid ${statusColors.border}40`, whiteSpace: "nowrap" }}>
                        {statusColors.label}
                      </span>
                    </div>

                    {/* Project Title */}
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", margin: "0 0 8px", lineHeight: 1.4 }}>
                      {proj.project_name}
                    </h3>

                    {/* Location & Agency */}
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {proj.district ? `${proj.district}, ` : ""}{proj.state}
                      </span>
                      <div style={{ color: "#64748b", marginTop: 2, fontSize: 11 }}>
                        Agency: <span style={{ color: "#cbd5e1" }}>{proj.agency || proj.ministry}</span>
                      </div>
                    </div>

                    {/* Target Date Pill */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#94a3b8", background: "rgba(255,255,255,0.02)", padding: "4px 8px", borderRadius: 4, marginBottom: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span>Target Completion:</span>
                      <span style={{ color: "#f8fafc", fontWeight: 600 }}>{targetDoc}</span>
                    </div>

                    {/* Physical Progress */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#cbd5e1", marginBottom: 4 }}>
                        <span>Physical Progress</span>
                        <span style={{ fontWeight: 700 }}>{progressPct}%</span>
                      </div>
                      <div style={{ width: "100%", height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, Math.max(0, progressPct))}%`, height: "100%", background: progressPct >= 80 ? "#22c55e" : progressPct >= 40 ? "#38bdf8" : "#f59e0b", borderRadius: 3 }} />
                      </div>
                    </div>

                    {/* Sanction & Expenditure Pill */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#1e293b", padding: "8px 12px", borderRadius: 6, fontSize: 11, marginBottom: 14 }}>
                      <div>
                        <div style={{ color: "#64748b", fontSize: 10 }}>Sanctioned Cost</div>
                        <div style={{ fontWeight: 700, color: "#f8fafc" }}>₹{displayCost.toLocaleString()} Cr</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#64748b", fontSize: 10 }}>Cumulative Exp.</div>
                        <div style={{ fontWeight: 700, color: "#38bdf8" }}>₹{displayExp.toLocaleString()} Cr</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {proj.grievances_count} citizen reports
                      </span>
                    </div>
                    <button
                      onClick={(e) => openGrievanceModal(proj, e)}
                      style={{
                        padding: "6px 12px", borderRadius: 6, background: "rgba(249, 115, 22, 0.12)",
                        border: "1px solid rgba(249, 115, 22, 0.3)", color: "#fb923c",
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Report Issue
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {totalCount > 0 && totalPages > 1 && (
          <div
            style={{
              marginTop: 36,
              padding: "16px 20px",
              background: "#0f172a",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount.toLocaleString()} total projects)
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {/* First Page */}
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(1)}
                style={{
                  minWidth: 36, height: 36, padding: "0 8px", borderRadius: 6,
                  background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)",
                  color: currentPage === 1 ? "#475569" : "#cbd5e1",
                  fontSize: 12, fontWeight: 700, cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
                title="First page"
              >
                ««
              </button>

              {/* Prev Page */}
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{
                  minWidth: 36, height: 36, padding: "0 10px", borderRadius: 6,
                  background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)",
                  color: currentPage === 1 ? "#475569" : "#cbd5e1",
                  fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
                title="Previous page"
              >
                ‹ Prev
              </button>

              {/* Page Numbers */}
              {renderPaginationButtons()}

              {/* Next Page */}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{
                  minWidth: 36, height: 36, padding: "0 10px", borderRadius: 6,
                  background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)",
                  color: currentPage === totalPages ? "#475569" : "#cbd5e1",
                  fontSize: 13, fontWeight: 600, cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                }}
                title="Next page"
              >
                Next ›
              </button>

              {/* Last Page */}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(totalPages)}
                style={{
                  minWidth: 36, height: 36, padding: "0 8px", borderRadius: 6,
                  background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)",
                  color: currentPage === totalPages ? "#475569" : "#cbd5e1",
                  fontSize: 12, fontWeight: 700, cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                }}
                title="Last page"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Project Details Modal (19 Flash Report Fields) */}
      {(selectedProject || loadingDetail) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, maxWidth: 740, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 28, position: "relative" }}>
            <button
              onClick={() => setSelectedProject(null)}
              style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}
            >
              ✕
            </button>

            {loadingDetail ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
                <div style={{ width: 32, height: 32, border: "3px solid #38bdf8", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
                Loading authoritative project dossier...
              </div>
            ) : selectedProject ? (
              <div>
                {/* Badges */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", textTransform: "uppercase" }}>
                    {selectedProject.sector}
                  </span>
                  {selectedProject.project_id && (
                    <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "#f8fafc" }}>
                      Project ID: {selectedProject.project_id}
                    </span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: "rgba(34, 197, 94, 0.15)", color: "#4ade80" }}>
                    Status: {selectedProject.public_status}
                  </span>
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", margin: "0 0 6px", lineHeight: 1.4 }}>
                  {selectedProject.project_name}
                </h2>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 18, display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{selectedProject.district ? `${selectedProject.district}, ` : ""}{selectedProject.state} • Ministry of {selectedProject.ministry}</span>
                </div>

                {/* Authoritative Flash Report Matrix */}
                <div style={{ background: "#1e293b", borderRadius: 10, padding: 16, marginBottom: 18, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                    Authoritative Flash Report Specifications (MoSPI April 2026)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 12 }}>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Implementing Agency</span>
                      <strong style={{ color: "#f8fafc" }}>{selectedProject.agency || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Project ID (Flash Report)</span>
                      <strong style={{ color: "#f8fafc" }}>{selectedProject.project_id || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>PMGiD</span>
                      <strong style={{ color: "#f8fafc" }}>{selectedProject.pmgid || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Legacy OCMS Code</span>
                      <strong style={{ color: "#f8fafc" }}>{selectedProject.legacy_ocms_code || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Approval Date (MM/YYYY)</span>
                      <strong style={{ color: "#f8fafc" }}>{selectedProject.approval_date_mm_yyyy || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Start Date (MM/YYYY)</span>
                      <strong style={{ color: "#f8fafc" }}>{selectedProject.start_date_mm_yyyy || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Original Target Date</span>
                      <strong style={{ color: "#f8fafc" }}>{selectedProject.original_target_doc_mm_yyyy || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Revised Target Date</span>
                      <strong style={{ color: "#f8fafc" }}>{selectedProject.revised_target_doc_mm_yyyy || selectedProject.scheduled_completion_date || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Report Month</span>
                      <strong style={{ color: "#4ade80" }}>{selectedProject.report_month || "April 2026"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Source PDF Reference</span>
                      <strong style={{ color: "#cbd5e1" }}>
                        Page {selectedProject.source_pdf_page ?? "N/A"} • Sl No {selectedProject.sl_no ?? "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
                  <div style={{ background: "#1e293b", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Original Sanction Cost</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>₹{selectedProject.original_cost_cr.toLocaleString()} Cr</div>
                  </div>
                  <div style={{ background: "#1e293b", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Revised Sanction Cost</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                      ₹{(selectedProject.revised_cost_cr || selectedProject.original_cost_cr).toLocaleString()} Cr
                    </div>
                  </div>
                  <div style={{ background: "#1e293b", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Cumulative Expenditure</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#38bdf8" }}>
                      ₹{(selectedProject.cumulative_expenditure_cr || 0).toLocaleString()} Cr
                    </div>
                  </div>
                </div>

                {/* Progress & Burn Rate */}
                <div style={{ background: "#1e293b", padding: 14, borderRadius: 8, marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>
                    <span>Physical Progress Certified: <strong>{selectedProject.physical_progress_pct ?? 0}%</strong></span>
                    {selectedProject.burn_rate_pct != null && (
                      <span>Financial Burn Rate: <strong>{selectedProject.burn_rate_pct.toFixed(1)}%</strong></span>
                    )}
                  </div>
                  <div style={{ width: "100%", height: 8, background: "#0f172a", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, selectedProject.physical_progress_pct ?? 0))}%`, height: "100%", background: "#38bdf8", borderRadius: 4 }} />
                  </div>
                </div>

                {/* Key Milestones */}
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" }}>
                  Official Milestones ({selectedProject.milestones?.length || 0})
                </h4>
                {selectedProject.milestones && selectedProject.milestones.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                    {selectedProject.milestones.map((m, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1e293b", padding: "8px 12px", borderRadius: 6, fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: m.is_completed ? "#4ade80" : "#64748b" }}>{m.is_completed ? "✓" : "○"}</span>
                          <span style={{ color: m.is_completed ? "#f8fafc" : "#94a3b8" }}>{m.milestone_name}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{m.scheduled_date || "TBD"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>Detailed physical milestones tracked in administrative execution register.</p>
                )}

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    onClick={() => setSelectedProject(null)}
                    style={{ padding: "8px 16px", borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", cursor: "pointer", fontSize: 13 }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const target = selectedProject;
                      setSelectedProject(null);
                      openGrievanceModal(target);
                    }}
                    style={{ padding: "8px 16px", borderRadius: 6, background: "#f97316", border: "none", color: "white", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                  >
                    Report Citizen Grievance
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Grievance Submission Modal */}
      {showGrievanceModal && grievanceTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, maxWidth: 540, width: "100%", padding: 24, position: "relative" }}>
            <button
              onClick={() => setShowGrievanceModal(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}
            >
              ✕
            </button>

            {submittedRef ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>
                  ✓
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", margin: "0 0 8px" }}>Grievance Registered Successfully</h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>
                  Your public grievance has been recorded in the central MoSPI monitoring register.
                </p>
                <div style={{ background: "#1e293b", padding: 12, borderRadius: 8, fontFamily: "monospace", fontSize: 16, color: "#38bdf8", fontWeight: 700, marginBottom: 20 }}>
                  {submittedRef}
                </div>
                <button
                  onClick={() => setShowGrievanceModal(false)}
                  style={{ padding: "8px 24px", borderRadius: 6, background: "#0284c7", border: "none", color: "white", fontWeight: 600, cursor: "pointer" }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitGrievance}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc", margin: "0 0 4px" }}>Report Site Issue / Grievance</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 16px" }}>
                  Project: <strong>{grievanceTarget.project_name}</strong> {grievanceTarget.project_id ? `(ID: ${grievanceTarget.project_id})` : ""}
                </p>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Full Name *</label>
                  <input
                    required
                    type="text"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Phone Number</label>
                    <input
                      type="tel"
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }}
                    >
                      <option value="Work Delay">Work Stoppage / Delay</option>
                      <option value="Road Condition">Road / Pavement Quality</option>
                      <option value="Environmental Damage">Environmental Hazard</option>
                      <option value="Safety Defect">Public Safety Concern</option>
                      <option value="Corruption">Material / Quality Defect</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Description & Observed Issues *</label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide specific location details and physical observation..."
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: coords.lat ? "#4ade80" : "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{coords.lat ? `GPS: ${coords.lat}, ${coords.lon}` : "Attach device GPS location (optional)"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    style={{ padding: "4px 10px", borderRadius: 4, background: "#1e293b", border: "1px solid rgba(255,255,255,0.2)", color: "#cbd5e1", fontSize: 11, cursor: "pointer" }}
                  >
                    Detect Location
                  </button>
                </div>

                <button
                  disabled={submitting}
                  type="submit"
                  style={{ width: "100%", padding: "10px", borderRadius: 6, background: "#f97316", border: "none", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  {submitting ? "Submitting..." : "Submit Grievance"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Grievance Tracker Modal */}
      {showTrackerModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, maxWidth: 500, width: "100%", padding: 24, position: "relative" }}>
            <button
              onClick={() => setShowTrackerModal(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}
            >
              ✕
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc", margin: "0 0 12px" }}>Track Grievance Status</h3>
            <form onSubmit={handleTrackSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                required
                type="text"
                placeholder="Enter Reference ID (e.g. GRV-2026-10001)"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 6, background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }}
              />
              <button
                type="submit"
                disabled={trackingLoading}
                style={{ padding: "8px 16px", borderRadius: 6, background: "#0284c7", border: "none", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Track
              </button>
            </form>

            {trackingLoading && <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center" }}>Searching registry...</div>}
            {trackingError && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{trackingError}</div>}

            {trackedRecord && (
              <div style={{ background: "#1e293b", padding: 16, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8" }}>{trackedRecord.reference_id}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
                    {trackedRecord.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#f8fafc", marginBottom: 4 }}><strong>Project:</strong> {trackedRecord.project_name || "Central Project"}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}><strong>Category:</strong> {trackedRecord.category}</div>
                <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 10, background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 4 }}>
                  {trackedRecord.description}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  Submitted on: {new Date(trackedRecord.created_at).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
