"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { listProjects } from "@/lib/api";
import type { ProjectListItem } from "@/lib/types";
import TopBar from "@/components/layout/TopBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import RiskBadge from "@/components/ui/RiskBadge";
import {
  getProjectLocation,
  aggregateDistrictData,
  aggregateStateData,
  normalizeStateName,
  projectMatchesState,
  STATE_DISTRICTS_MAP,
  STATE_COORDINATES,
} from "@/lib/districtData";

const TIER_COLOR: Record<string, string> = {
  critical: "#f43f5e",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#10b981",
};

const SECTOR_COLOR: Record<string, string> = {
  "Roads & Highways": "#f97316",
  "Roads & Bridges": "#f97316",
  "Railways": "#3b82f6",
  "Coal": "#78716c",
  "Oil & Gas": "#e11d48",
  "Petroleum & Natural Gas": "#e11d48",
  "Transmission & Distribution": "#a855f7",
  "Power": "#eab308",
  "Electricity Generation": "#eab308",
  "Renewable Energy": "#10b981",
  "Water Resources": "#0284c7",
  "Healthcare": "#ec4899",
  "Education": "#8b5cf6",
  "Urban Public Transport": "#06b6d4",
  "Urban Transport": "#06b6d4",
  "Waste & Water": "#14b8a6",
  "Aviation & Aviation Infrastructure": "#0ea5e9",
  "Civil Aviation": "#0ea5e9",
  "Steel": "#64748b",
  "Energy Storage": "#10b981",
  "Telecommunication": "#6366f1",
  "Telecommunications": "#6366f1",
  "Real Estate": "#d97706",
  "Metals & Mining": "#b45309",
  "Shipping": "#0891b2",
  "Construction": "#84cc16",
  "Inland Waterways": "#065f46",
  "Tourism, Hospitality & Wellness": "#f43f5e",
  "Logistics Infrastructure": "#475569",
};

function normalizeGeoJsonState(s: string = ""): string {
  const clean = s.toUpperCase().replace(/[^A-Z]/g, "");
  if (clean === "ODISHA" || clean === "ORISSA") return "ODISHA";
  if (clean === "UTTARAKHAND" || clean === "UTTARANCHAL") return "UTTARAKHAND";
  if (clean.includes("JAMMU")) return "JAMMU & KASHMIR";
  if (clean.includes("ANDAMAN")) return "ANDAMAN & NICOBAR";
  if (clean.includes("DADRA") || clean.includes("DAMAN") || clean.includes("DIU")) return "DADRA & NAGAR HAVELI AND DAMAN & DIU";
  if (clean.includes("PUDUCHERRY") || clean.includes("PONDICHERRY")) return "PUDUCHERRY";
  return clean;
}

function getExecutiveAiBriefing(project: ProjectListItem) {
  const cleanName = (project.project_name || "").replace(/\s*\([A-Za-z\s&]+\)\s*$/, "");
  const tier = (project.risk_tier || "low").toLowerCase();
  const gap = project.burn_progress_gap != null ? project.burn_progress_gap : 0;
  const progress = project.physical_progress_pct != null ? project.physical_progress_pct : null;
  const sector = project.category || project.sector || "Infrastructure";
  const state = project.state || "State";
  const district = project.district || "District";
  const origCost = project.original_cost_cr || 0;
  const revCost = project.revised_cost_cr || origCost;
  const costEsc = revCost > origCost ? revCost - origCost : 0;

  let statusBadge = { label: "Optimal Trajectory", color: "#10b981", bg: "rgba(16, 185, 129, 0.16)" };
  let narrative = "";
  let action = "";

  if (tier === "critical") {
    statusBadge = { label: "Critical Escalation", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.16)" };
    narrative = `This ${sector} asset in ${district} (${state}) displays acute fiscal distortion. Financial disbursements currently lead certified physical progress by ${gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}${costEsc > 0 ? ` with cost escalation of ₹${costEsc.toFixed(1)} Cr` : ""}, signaling heightened project exposure requiring emergency ministry intervention.`;
    action = "Mandate an emergency joint MoSPI-Ministry site inspection within 48 hours, freeze non-verified contractor milestone invoices, and institute daily physical progress velocity monitoring.";
  } else if (tier === "high") {
    statusBadge = { label: "High Variance", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.16)" };
    narrative = `Located in ${district} (${state}), this ${sector} facility is encountering measurable execution friction. Capital expenditure leads on-ground physical delivery by ${gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}, primarily driven by Right-of-Way (ROW) access hurdles, forest clearances, or contractor utility shifting.`;
    action = "Convene an inter-ministerial coordination review within 7 business days to clear statutory bottlenecks and mandate dual-shift contractor workforce deployment.";
  } else if (tier === "medium") {
    statusBadge = { label: "Moderate Risk", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.16)" };
    narrative = `Stationed across ${district} (${state}), development progress is tracking near baseline with a modest budget variance gap of ${gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}. Physical milestones remain within recoverable operational tolerance.`;
    action = "Enforce fortnightly contractor milestone compliance tracking and institute value-engineering reviews on upcoming procurement packages.";
  } else {
    statusBadge = { label: "Optimal Trajectory", color: "#10b981", bg: "rgba(16, 185, 129, 0.16)" };
    if (gap <= 0) {
      narrative = `Located in ${district} (${state}), this ${sector} project demonstrates exemplary operational discipline. Certified physical execution (${progress != null ? `${progress.toFixed(0)}%` : "on schedule"}) is leading cumulative disbursements by a favorable ${Math.abs(gap).toFixed(1)}%, indicating strong contractor momentum and zero cost-overrun exposure.`;
    } else {
      narrative = `Located in ${district} (${state}), this ${sector} project is maintaining steady delivery cadence (${progress != null ? `${progress.toFixed(0)}%` : "on track"}) with capital expenditure tightly aligned to verified ground completion (+${gap.toFixed(1)}% variance).`;
    }
    action = "Project execution satisfies all MoSPI benchmark criteria. Maintain routine monthly milestone audits and standard progress-linked disbursement tranches.";
  }

  return { cleanName, statusBadge, narrative, action, sector, district, state };
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const geoJsonLayerRef = useRef<any>(null);

  const [allProjects, setAllProjects] = useState<ProjectListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // Filters: Search, State, District (belonging strictly to selected state), Sector, Risk Tier
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [colorMode, setColorMode] = useState<"risk" | "sector">("risk");
  const [drawerTab, setDrawerTab] = useState<"project" | "projects" | "breakdown">("project");

  useEffect(() => {
    fetch("/india_states_simplified.geojson")
      .then((r) => r.json())
      .then((data) => setGeoJsonData(data))
      .catch((err) => console.error("Error loading India states GeoJSON", err));

    listProjects({ limit: 2000 })
      .then((p) => {
        const projs = p || [];
        setAllProjects(projs);
        if (projs.length > 0) {
          setSelectedProject(projs[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to load map projects", err);
        setAllProjects([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filtered project list strictly mapped state-wise and district-wise
  const filteredProjects = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    const selDistNorm = selectedDistrict !== "all" ? selectedDistrict.trim().toUpperCase() : null;

    return allProjects
      .map((p, idx) => {
        const loc = getProjectLocation(p, idx);
        return {
          ...p,
          state: p.state || loc.state,
          district: p.district || loc.district,
          category: p.sector || loc.category,
          latitude: p.latitude ?? loc.coords[0],
          longitude: p.longitude ?? loc.coords[1],
        };
      })
      .filter((p) => {
        if (qLower) {
          const tokens = qLower.split(/\s+/).filter((t) => t.length > 1);
          const fullText = `${p.project_name || ""} ${p.sector || ""} ${p.state || ""} ${p.district || ""} ${p.ministry || ""}`.toLowerCase();
          const matchAll = tokens.every((t) => fullText.includes(t));
          if (!matchAll) return false;
        }

        // State matching
        if (selectedState !== "all" && !projectMatchesState(p.state, selectedState)) {
          return false;
        }

        // District matching (Strictly within selected state)
        if (selDistNorm && (p.district || "").trim().toUpperCase() !== selDistNorm) {
          return false;
        }

        // Sector / Category matching
        if (selectedSector !== "all" && p.sector !== selectedSector && p.category !== selectedSector) {
          return false;
        }

        // Risk tier matching
        if (selectedTier !== "all" && p.risk_tier !== selectedTier) {
          return false;
        }

        return true;
      });
  }, [allProjects, searchQuery, selectedState, selectedDistrict, selectedSector, selectedTier]);

  // Clean State Options with exact project counts
  const stateOptionsWithCount = useMemo(() => {
    const map = new Map<string, number>();

    allProjects.forEach((p) => {
      const st = p.state || "National / Pan-India";
      map.set(st, (map.get(st) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allProjects]);

  // Districts for selected state with project counts
  const districtOptionsWithCount = useMemo(() => {
    if (selectedState === "all") return [];
    const normSt = normalizeStateName(selectedState);
    const stProjs = allProjects.filter((p) => projectMatchesState(p.state, selectedState));

    const map = new Map<string, number>();
    stProjs.forEach((p, idx) => {
      const loc = getProjectLocation(p, idx);
      const d = p.district || loc.district;
      map.set(d, (map.get(d) || 0) + 1);
    });

    // Also include any registered districts for that state even if count is 0
    const registered = STATE_DISTRICTS_MAP[normSt] || [];
    registered.forEach((r) => {
      if (!map.has(r.district)) {
        map.set(r.district, 0);
      }
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allProjects, selectedState]);

  // District summaries when a state is selected
  const districtSummaries = useMemo(() => {
    if (selectedState === "all") return [];
    const stProjs = allProjects.filter((p) => projectMatchesState(p.state, selectedState));
    return aggregateDistrictData(stProjs);
  }, [allProjects, selectedState]);

  // Nationwide State summaries for State Portfolio Tab
  const stateSummaries = useMemo(() => {
    return aggregateStateData(allProjects);
  }, [allProjects]);

  // Category / Sector options with exact counts
  const sectorOptionsWithCount = useMemo(() => {
    const map = new Map<string, number>();
    allProjects.forEach((p) => {
      const sec = p.sector || p.category || "General";
      map.set(sec, (map.get(sec) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allProjects]);

  useEffect(() => {
    if (filteredProjects.length > 0) {
      if (!selectedProject || !filteredProjects.some((p) => p.id === selectedProject.id)) {
        setSelectedProject(filteredProjects[0]);
      }
    } else {
      setSelectedProject(null);
    }
  }, [filteredProjects]);

  // Leaflet map setup with state isolation, boundary zoom & markers
  useEffect(() => {
    if (loading || !mapRef.current) return;

    import("leaflet").then((L) => {
      if (!leafletMapRef.current && mapRef.current) {
        // Center on India [22.5937, 78.9629], zoom 5
        const map = L.map(mapRef.current, { zoomControl: true }).setView([22.5937, 78.9629], 5);
        leafletMapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        setMapLoading(false);

        [100, 300, 800].forEach((ms) => {
          setTimeout(() => {
            if (leafletMapRef.current) leafletMapRef.current.invalidateSize();
          }, ms);
        });
      }

      const map = leafletMapRef.current;
      map.invalidateSize();

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Clear existing GeoJSON layer
      if (geoJsonLayerRef.current) {
        geoJsonLayerRef.current.remove();
        geoJsonLayerRef.current = null;
      }

      // Handle State Boundary Highlight & Focus
      let stateFeatureFound = false;
      if (selectedState !== "all" && geoJsonData) {
        const normSelected = normalizeGeoJsonState(selectedState);
        const stateFeature = geoJsonData.features?.find((f: any) => {
          const name = f.properties?.name || f.properties?.NAME_1 || f.properties?.st_nm || "";
          return normalizeGeoJsonState(name) === normSelected;
        });

        if (stateFeature) {
          stateFeatureFound = true;
          const stateLayer = L.geoJSON(stateFeature, {
            style: {
              color: "#06b6d4",
              weight: 3.5,
              opacity: 0.95,
              fillColor: "#06b6d4",
              fillOpacity: 0.12,
              dashArray: "6, 4",
            },
          }).addTo(map);
          geoJsonLayerRef.current = stateLayer;

          if (selectedDistrict === "all") {
            map.fitBounds(stateLayer.getBounds().pad(0.08), {
              animate: true,
              duration: 0.8,
              maxZoom: 9,
            });
          }
        }
      } else if (selectedState === "all" && geoJsonData) {
        const allStatesLayer = L.geoJSON(geoJsonData, {
          style: {
            color: "rgba(56, 189, 248, 0.25)",
            weight: 1,
            opacity: 0.45,
            fillColor: "rgba(56, 189, 248, 0.02)",
            fillOpacity: 0.02,
          },
        }).addTo(map);
        geoJsonLayerRef.current = allStatesLayer;
      }

      // Render circle markers for filtered projects
      filteredProjects.forEach((p) => {
        const color =
          colorMode === "sector"
            ? SECTOR_COLOR[p.category || p.sector || ""] || "#3b82f6"
            : TIER_COLOR[p.risk_tier || "low"] || "#3b82f6";

        const popupContent = `
          <div style="font-family:Inter,sans-serif;min-width:260px;padding:6px;color:#0f172a">
            <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px;line-height:1.3">${p.project_name}</div>
            <div style="font-size:11px;color:#475569;margin-bottom:8px;line-height:1.6">
              <span style="display:inline-block;padding:1px 6px;background:#e0f2fe;color:#0369a1;border-radius:4px;font-weight:700;font-size:10px;margin-bottom:4px">
                <svg style="display:inline-block;vertical-align:middle;margin-right:2px" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${p.district || p.state}
              </span><br/>
              <strong>State:</strong> ${p.state} • <strong>Category:</strong> ${p.category || p.sector}<br/>
              <strong>Outlay:</strong> ${p.revised_cost_cr != null ? `₹${p.revised_cost_cr.toLocaleString("en-IN")} Cr` : "—"} • <strong>Progress:</strong> ${p.physical_progress_pct != null ? `${p.physical_progress_pct.toFixed(0)}%` : "—"}
            </div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
              <span style="background:${color};color:white;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;text-transform:uppercase">${colorMode === "sector" ? (p.category || p.sector) : p.risk_tier}</span>
              ${p.composite_risk_score != null ? `<span style="font-size:11px;color:#475569;font-weight:600">${(p.composite_risk_score * 100).toFixed(0)}% Risk Index</span>` : ""}
            </div>
            <div style="font-size:11px;color:#0ea5e9;font-weight:600;">Click marker to view AI Mitigation Brief →</div>
          </div>
        `;

        const circle = L.circleMarker([p.latitude!, p.longitude!], {
          radius: selectedDistrict !== "all" ? 11 : selectedState !== "all" ? 9 : 7,
          fillColor: color,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.92,
        }).addTo(map);

        circle.bindPopup(popupContent, { offset: [0, -6] });

        circle.on("mouseover", function (this: any) {
          this.setRadius(selectedDistrict !== "all" ? 15 : selectedState !== "all" ? 13 : 11);
          this.setStyle({ fillOpacity: 1, weight: 3 });
        });

        circle.on("mouseout", function (this: any) {
          this.setRadius(selectedDistrict !== "all" ? 11 : selectedState !== "all" ? 9 : 7);
          this.setStyle({ fillOpacity: 0.92, weight: 2 });
        });

        circle.on("click", () => {
          setSelectedProject(p);
          setDrawerTab("project");
        });

        markersRef.current.push(circle);
      });

      // Camera Zoom based on state & district selection
      if (selectedDistrict !== "all") {
        const normSt = normalizeStateName(selectedState);
        const distDef = STATE_DISTRICTS_MAP[normSt]?.find((d) => d.district.toUpperCase() === selectedDistrict.toUpperCase());
        if (distDef) {
          map.setView(distDef.coords, 10, { animate: true, duration: 0.8 });
        } else if (markersRef.current.length > 0) {
          const group = L.featureGroup(markersRef.current);
          map.fitBounds(group.getBounds().pad(0.30), { animate: true, maxZoom: 11 });
        }
      } else if (selectedState !== "all" && !stateFeatureFound) {
        const normSt = normalizeStateName(selectedState);
        const center = STATE_COORDINATES[normSt];
        if (center) {
          map.setView(center, 8, { animate: true, duration: 0.8 });
        } else if (markersRef.current.length > 0) {
          const group = L.featureGroup(markersRef.current);
          map.fitBounds(group.getBounds().pad(0.20), {
            animate: true,
            duration: 0.8,
            maxZoom: 8,
          });
        }
      } else if (selectedState === "all") {
        if (markersRef.current.length > 0) {
          const group = L.featureGroup(markersRef.current);
          map.fitBounds(group.getBounds().pad(0.05), { animate: true, duration: 0.8 });
        } else {
          map.setView([22.5937, 78.9629], 5, { animate: true });
        }
      }
    }).catch((err) => {
      console.error("Failed to load Leaflet map engine", err);
      setMapLoading(false);
    });
  }, [filteredProjects, loading, colorMode, selectedState, selectedDistrict, geoJsonData]);

  const riskCounts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    filteredProjects.forEach((p) => {
      if (p.risk_tier && p.risk_tier in c) c[p.risk_tier as keyof typeof c]++;
    });
    return c;
  }, [filteredProjects]);

  const sectorCounts = useMemo(() => {
    const s: Record<string, number> = {};
    filteredProjects.forEach((p) => {
      const cat = p.category || p.sector;
      if (cat) s[cat] = (s[cat] || 0) + 1;
    });
    return s;
  }, [filteredProjects]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <TopBar
        title="Geospatial Infrastructure Intelligence Map"
        subtitle="MoSPI PAIMANA · April 2026 National Portfolio (1,981 Real Infrastructure Projects) · State & District Intelligence"
      />

      {/* Filter Bar with State, District (belonging strictly to selected state), Category, Risk Tier */}
      <div
        style={{
          padding: "10px 24px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          zIndex: 10,
        }}
      >
        {/* SEARCH INPUT */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Search:</span>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", color: "var(--text-muted)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search project, state, district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: 190, padding: "4px 8px 4px 26px", fontSize: 12 }}
            />
          </div>
        </div>

        {/* 1. STATE SELECTOR */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>State:</span>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedDistrict("all");
            }}
            className="input"
            style={{ width: 180, padding: "4px 8px", fontSize: 12 }}
          >
            <option value="all">All India ({allProjects.length} Projects)</option>
            {stateOptionsWithCount.map((st) => (
              <option key={st.name} value={st.name}>{st.name} ({st.count})</option>
            ))}
          </select>
        </div>

        {/* 2. DISTRICT SELECTOR (Active when State is selected) */}
        {selectedState !== "all" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase" }}>District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="input"
              style={{
                width: 175,
                padding: "4px 8px",
                fontSize: 12,
                borderColor: selectedDistrict !== "all" ? "var(--accent)" : undefined,
                background: selectedDistrict !== "all" ? "rgba(6, 182, 212, 0.08)" : undefined,
              }}
            >
              <option value="all">All Districts ({districtOptionsWithCount.length})</option>
              {districtOptionsWithCount.map((d) => (
                <option key={d.name} value={d.name}>{d.name} ({d.count})</option>
              ))}
            </select>
          </div>
        )}

        {/* 3. CATEGORY / SECTOR SELECTOR */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Category:</span>
          <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="input" style={{ width: 175, padding: "4px 8px", fontSize: 12 }}>
            <option value="all">All Categories ({sectorOptionsWithCount.length})</option>
            {sectorOptionsWithCount.map((sec) => (
              <option key={sec.name} value={sec.name}>{sec.name} ({sec.count})</option>
            ))}
          </select>
        </div>

        {/* 4. RISK TIER SELECTOR */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Risk:</span>
          <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} className="input" style={{ width: 125, padding: "4px 8px", fontSize: 12 }}>
            <option value="all">All Tiers ({allProjects.length})</option>
            <option value="critical">Critical (140)</option>
            <option value="high">High (447)</option>
            <option value="medium">Medium (1,199)</option>
            <option value="low">Low (195)</option>
          </select>
        </div>

        {/* Color Mode Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--surface-2)", padding: "2px 6px", borderRadius: 8, border: "1px solid var(--border)" }}>
          <button
            onClick={() => setColorMode("risk")}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: colorMode === "risk" ? "var(--accent)" : "transparent",
              color: colorMode === "risk" ? "#ffffff" : "var(--text-sub)",
            }}
          >
            Risk Tier
          </button>
          <button
            onClick={() => setColorMode("sector")}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: colorMode === "sector" ? "#3b82f6" : "transparent",
              color: colorMode === "sector" ? "#ffffff" : "var(--text-sub)",
            }}
          >
            Category
          </button>
        </div>

        {/* Active Breadcrumb & Reset */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {selectedState !== "all" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: 6, padding: "3px 10px" }}>
              <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {selectedState} {selectedDistrict !== "all" ? `› ${selectedDistrict}` : ""} ({filteredProjects.length} Projects)
              </span>
              <button
                onClick={() => {
                  setSelectedState("all");
                  setSelectedDistrict("all");
                }}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-2)",
                  color: "var(--text)",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 6px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                title="Reset to All India"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                All India
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-sub)", fontWeight: 500 }}>
              Showing <strong style={{ color: "var(--accent)" }}>{filteredProjects.length}</strong> real projects across India
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div style={{ position: "relative", flex: 1, height: "calc(100vh - 120px)", minHeight: 500, width: "100%", overflow: "hidden" }}>
        {mapLoading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#090d16", zIndex: 20 }}>
            <LoadingSpinner size={40} label="Loading OpenStreetMap geospatial vector engine..." />
          </div>
        )}

        <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: 500, zIndex: 1 }} />

        {/* Dynamic Legend Overlay */}
        <div
          className="map-legend-overlay"
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            backdropFilter: "blur(12px)",
            border: "1px solid var(--border-2)",
            borderRadius: 10,
            padding: "14px 18px",
            zIndex: 5,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {colorMode === "risk" ? "Risk Tier Breakdown" : "Infrastructure Category Breakdown"}
          </div>

          {colorMode === "risk"
            ? Object.entries(TIER_COLOR).map(([tier, color]) => (
                <div key={tier} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
                  <span style={{ fontSize: 12, color: "var(--text-sub)", textTransform: "capitalize" }}>{tier}</span>
                  <span className="tabular" style={{ fontSize: 12, color: "var(--text)", marginLeft: "auto", paddingLeft: 16, fontWeight: 700 }}>
                    {riskCounts[tier as keyof typeof riskCounts]}
                  </span>
                </div>
              ))
            : Object.entries(SECTOR_COLOR).slice(0, 10).map(([sector, color]) => (
                <div key={sector} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
                  <span style={{ fontSize: 12, color: "var(--text-sub)" }}>{sector}</span>
                  <span className="tabular" style={{ fontSize: 12, color: "var(--text)", marginLeft: "auto", paddingLeft: 16, fontWeight: 700 }}>
                    {sectorCounts[sector] || 0}
                  </span>
                </div>
              ))}
        </div>

        {/* Selected Project / State / District Drawer Panel */}
        {(selectedProject || allProjects.length > 0) && (
          <div
            className="animate-fade map-drawer-panel"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              bottom: 16,
              width: 420,
              maxWidth: "92vw",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--border-2)",
              borderRadius: 12,
              padding: 20,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {/* Drawer Tab Switcher */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "var(--surface-2)", padding: 3, borderRadius: 8 }}>
              <button
                onClick={() => setDrawerTab("project")}
                style={{
                  flex: 1,
                  padding: "6px 6px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: drawerTab === "project" ? "var(--accent)" : "transparent",
                  color: drawerTab === "project" ? "#ffffff" : "var(--text-sub)",
                  transition: "all 0.15s ease",
                }}
              >
                Project Details
              </button>
              <button
                onClick={() => setDrawerTab("projects")}
                style={{
                  flex: 1,
                  padding: "6px 6px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: drawerTab === "projects" ? "var(--accent)" : "transparent",
                  color: drawerTab === "projects" ? "#ffffff" : "var(--text-sub)",
                  transition: "all 0.15s ease",
                }}
              >
                Projects ({filteredProjects.length})
              </button>
              <button
                onClick={() => setDrawerTab("breakdown")}
                style={{
                  flex: 1,
                  padding: "6px 6px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: drawerTab === "breakdown" ? "var(--accent)" : "transparent",
                  color: drawerTab === "breakdown" ? "#ffffff" : "var(--text-sub)",
                  transition: "all 0.15s ease",
                }}
              >
                {selectedState !== "all" ? `Districts (${districtSummaries.length})` : `States (${stateSummaries.length})`}
              </button>
            </div>

            {/* TAB 2: PROJECTS LIST */}
            {drawerTab === "projects" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {selectedState !== "all" ? `${selectedState} ${selectedDistrict !== "all" ? `› ${selectedDistrict}` : ""}` : "All India"} Projects ({filteredProjects.length})
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    April 2026 Real Dataset
                  </span>
                </div>

                <div style={{ fontSize: 11, color: "var(--text-sub)", lineHeight: 1.4 }}>
                  Click any project to focus on map and view full AI mitigation analysis:
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredProjects.map((p) => {
                    const isSelected = selectedProject?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProject(p);
                          setDrawerTab("project");
                          if (leafletMapRef.current && p.latitude && p.longitude) {
                            leafletMapRef.current.setView([p.latitude, p.longitude], 10, { animate: true });
                          }
                        }}
                        style={{
                          padding: "10px 12px",
                          background: isSelected ? "rgba(6, 182, 212, 0.14)" : "var(--surface-2)",
                          border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", flex: 1, paddingRight: 6 }}>
                            {p.project_name}
                          </span>
                          <RiskBadge tier={p.risk_tier || "low"} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-sub)" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            {p.district ? `${p.district}, ${p.state}` : p.state}
                          </span>
                          <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                            {p.revised_cost_cr != null ? `₹${p.revised_cost_cr.toLocaleString("en-IN")} Cr` : "—"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                          <span>{p.sector || p.category}</span>
                          <span>Progress: {p.physical_progress_pct != null ? `${p.physical_progress_pct.toFixed(0)}%` : "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : drawerTab === "breakdown" ? (
              /* TAB 3: DISTRICT OR STATE BREAKDOWN */
              selectedState !== "all" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {selectedState} Districts ({districtSummaries.length})
                    </span>
                    {selectedDistrict !== "all" && (
                      <button
                        onClick={() => setSelectedDistrict("all")}
                        style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                      >
                        All Districts
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: "var(--text-sub)", lineHeight: 1.4 }}>
                    Click any district to isolate and focus on local projects:
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {districtSummaries.map((d) => {
                      const isSelected = selectedDistrict === d.district;
                      return (
                        <div
                          key={d.district}
                          onClick={() => {
                            setSelectedDistrict(isSelected ? "all" : d.district);
                          }}
                          style={{
                            padding: "10px 12px",
                            background: isSelected ? "rgba(6, 182, 212, 0.14)" : "var(--surface-2)",
                            border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "var(--accent)" : "var(--text)" }}>
                              {d.district}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 9999, color: "var(--text)" }}>
                              {d.projectCount} {d.projectCount === 1 ? "project" : "projects"}
                            </span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-sub)", marginTop: 4 }}>
                            <span>Outlay: <strong style={{ color: "var(--text)" }}>₹{d.totalCostCr.toLocaleString("en-IN")} Cr</strong></span>
                            <span>Avg Progress: <strong style={{ color: "#10b981" }}>{d.avgProgress}%</strong></span>
                          </div>

                          <div style={{ display: "flex", gap: 6, marginTop: 6, fontSize: 10 }}>
                            {d.criticalCount > 0 && (
                              <span style={{ background: "rgba(244, 63, 94, 0.15)", color: "#f43f5e", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                                {d.criticalCount} Critical
                              </span>
                            )}
                            {d.highCount > 0 && (
                              <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                                {d.highCount} High Risk
                              </span>
                            )}
                            {d.lowCount > 0 && (
                              <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                                {d.lowCount} On Track
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      All States & UTs Portfolio ({stateSummaries.length})
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--text-sub)", lineHeight: 1.4 }}>
                    Click any state to isolate and zoom into its projects & district hierarchy:
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stateSummaries.map((s) => (
                      <div
                        key={s.state}
                        onClick={() => {
                          setSelectedState(s.state);
                          setSelectedDistrict("all");
                        }}
                        style={{
                          padding: "10px 12px",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                            {s.state}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(6,182,212,0.12)", color: "var(--accent)", padding: "2px 8px", borderRadius: 9999 }}>
                            {s.projectCount} {s.projectCount === 1 ? "project" : "projects"}
                          </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-sub)", marginTop: 4 }}>
                          <span>Outlay: <strong style={{ color: "var(--text)" }}>₹{s.totalCostCr.toLocaleString("en-IN")} Cr</strong></span>
                          <span>Avg Progress: <strong style={{ color: "#10b981" }}>{s.avgProgress}%</strong></span>
                        </div>

                        <div style={{ display: "flex", gap: 6, marginTop: 6, fontSize: 10 }}>
                          {s.criticalCount > 0 && (
                            <span style={{ background: "rgba(244, 63, 94, 0.15)", color: "#f43f5e", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                              {s.criticalCount} Critical
                            </span>
                          )}
                          {s.highCount > 0 && (
                            <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                              {s.highCount} High Risk
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : selectedProject ? (
              /* TAB 1: ACTIVE PROJECT DETAILS */
              <>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <RiskBadge tier={selectedProject.risk_tier || "low"} suffix={selectedProject.composite_risk_score != null ? ` (${(selectedProject.composite_risk_score * 100).toFixed(0)}% Index)` : ""} />
                  <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Active Selection</span>
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6, lineHeight: 1.4 }}>
                  {selectedProject.project_name}
                </h3>

                {/* State & District Metadata Card */}
                <div style={{ background: "var(--surface-2)", padding: "10px 12px", borderRadius: 8, marginBottom: 14, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-sub)", marginBottom: 4 }}>
                    <strong style={{ color: "var(--text)" }}>District:</strong>{" "}
                    <span style={{ color: "#10b981", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      {selectedProject.district || "District Hub"}
                    </span>
                    {" "}• <strong style={{ color: "var(--text)" }}>State:</strong> {selectedProject.state}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-sub)" }}>
                    <strong style={{ color: "var(--text)" }}>Category:</strong> {selectedProject.category || selectedProject.sector} ({selectedProject.ministry})
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12, background: "var(--surface-2)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Revised Outlay</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
                      {selectedProject.revised_cost_cr != null ? `₹${selectedProject.revised_cost_cr.toLocaleString("en-IN")} Cr` : selectedProject.original_cost_cr != null ? `₹${selectedProject.original_cost_cr.toLocaleString("en-IN")} Cr` : "—"}
                    </div>
                    {selectedProject.original_cost_cr != null && selectedProject.revised_cost_cr != null && selectedProject.revised_cost_cr > selectedProject.original_cost_cr && (
                      <div style={{ fontSize: 10, color: "#f43f5e", fontWeight: 600 }}>
                        +₹{(selectedProject.revised_cost_cr - selectedProject.original_cost_cr).toFixed(1)} Cr Escalation
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Physical Progress</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--low)" }}>
                      {selectedProject.physical_progress_pct != null ? `${selectedProject.physical_progress_pct.toFixed(0)}%` : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {selectedProject.burn_progress_gap != null ? `Variance Gap: ${selectedProject.burn_progress_gap > 0 ? `+${selectedProject.burn_progress_gap.toFixed(1)}%` : `${selectedProject.burn_progress_gap.toFixed(1)}%`}` : "On Baseline"}
                    </div>
                  </div>
                </div>

                {/* Real AI ML Prediction Metrics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14, background: "rgba(6, 182, 212, 0.06)", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(6, 182, 212, 0.2)" }}>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Delay Risk</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: (selectedProject.delay_probability || 0) > 0.5 ? "#f43f5e" : "#10b981" }}>
                      {selectedProject.delay_probability != null ? `${(selectedProject.delay_probability * 100).toFixed(0)}%` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Cost Risk</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: (selectedProject.cost_overrun_probability || 0) > 0.5 ? "#f43f5e" : "#10b981" }}>
                      {selectedProject.cost_overrun_probability != null ? `${(selectedProject.cost_overrun_probability * 100).toFixed(0)}%` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Risk Index</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                      {selectedProject.composite_risk_score != null ? `${(selectedProject.composite_risk_score * 100).toFixed(0)}%` : "—"}
                    </div>
                  </div>
                </div>

                {/* PRISM AI Executive Briefing Card */}
                {(() => {
                  const briefing = getExecutiveAiBriefing(selectedProject);
                  return (
                    <div
                      className="map-briefing-card"
                      style={{
                        borderRadius: 10,
                        padding: "14px 16px",
                        marginBottom: 16,
                      }}
                    >
                      {/* Card Header with Status Tag */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 18, height: 18, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                              border: "1px solid var(--accent-glow)",
                            }}
                          >
                            <img src="/logo.jpg" alt="PRISM AI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <span className="executive-advisory-title" style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            PRISM AI Executive Briefing
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 9999,
                            background: briefing.statusBadge.bg,
                            color: briefing.statusBadge.color,
                            border: `1px solid ${briefing.statusBadge.color}40`,
                          }}
                        >
                          {briefing.statusBadge.label}
                        </span>
                      </div>

                      {/* Natural, Professional Narrative */}
                      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.6, marginBottom: 12 }}>
                        {briefing.narrative}
                      </div>

                      {/* Strategic Action Recommendation Box */}
                      <div
                        className="map-briefing-action"
                        style={{
                          borderLeft: `3px solid ${briefing.statusBadge.color}`,
                          padding: "8px 12px",
                          borderRadius: "0 6px 6px 0",
                          fontSize: 11,
                          lineHeight: 1.5,
                          color: "var(--text-sub)",
                        }}
                      >
                        <strong className="map-briefing-action-label" style={{ display: "block", marginBottom: 2, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Recommended Strategic Action:
                        </strong>
                        {briefing.action}
                      </div>
                    </div>
                  );
                })()}

                <a
                  href={`/projects/${selectedProject.id}`}
                  className="btn btn-primary"
                  style={{ marginTop: "auto", textAlign: "center", justifyContent: "center", width: "100%" }}
                >
                  Open Full Project Dashboard →
                </a>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
