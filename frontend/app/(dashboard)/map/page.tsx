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
  STATE_DISTRICTS_DATA,
  STATE_DISTRICT_PLACES,
  STATE_COORDINATES,
} from "@/lib/districtData";

const TIER_COLOR: Record<string, string> = {
  critical: "#f43f5e",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#10b981",
};

const SECTOR_COLOR: Record<string, string> = {
  "Roads & Bridges": "#f97316",
  "Railways": "#3b82f6",
  "Urban Transport": "#06b6d4",
  "Power": "#eab308",
  "Renewable Energy": "#10b981",
  "Petroleum & Natural Gas": "#e11d48",
  "Telecommunications": "#a855f7",
  "Water Resources": "#0284c7",
  "Coal": "#64748b",
  "Steel": "#475569",
  "Civil Aviation": "#0ea5e9",
  "Chemicals & Fert.": "#14b8a6",
  "Heavy Industry": "#d97706",
};

function normalizeState(s: string = ""): string {
  const clean = s.toUpperCase().replace(/[^A-Z]/g, "");
  if (clean === "ODISHA" || clean === "ORISSA") return "ODISHA";
  if (clean === "UTTARAKHAND" || clean === "UTTARANCHAL") return "UTTARAKHAND";
  if (clean.includes("JAMMU")) return "JAMMU & KASHMIR";
  if (clean.includes("ANDAMAN")) return "ANDAMAN & NICOBAR";
  return clean;
}

function getExecutiveAiBriefing(project: ProjectListItem) {
  const cleanName = (project.project_name || "").replace(/\s*\([A-Za-z\s&]+\)\s*$/, "");
  const tier = (project.risk_tier || "low").toLowerCase();
  const gap = project.burn_progress_gap != null ? project.burn_progress_gap : 0;
  const progress = project.physical_progress_pct != null ? project.physical_progress_pct : null;
  const sector = project.category || project.sector || "Infrastructure";
  const place = project.place || "Key Infrastructure Hub";
  const district = project.district || "District Hub";
  const state = project.state || "State";

  let statusBadge = { label: "Optimal Trajectory", color: "#10b981", bg: "rgba(16, 185, 129, 0.16)" };
  let narrative = "";
  let action = "";

  if (tier === "critical") {
    statusBadge = { label: "Critical Escalation", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.16)" };
    narrative = `This ${sector} undertaking stationed in ${place}, ${district} (${state}) displays acute fiscal distortion. Financial disbursements currently outpace certified physical completion by ${gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}, signaling heightened project exposure without commensurate asset commissioning.`;
    action = "Mandate an emergency joint MoSPI-Ministry site inspection within 48 hours, freeze non-verified contractor milestone invoices, and institute daily physical progress velocity monitoring.";
  } else if (tier === "high") {
    statusBadge = { label: "High Variance", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.16)" };
    narrative = `Located in ${place}, ${district} (${state}), this ${sector} facility is encountering measurable execution friction. Capital expenditure leads on-ground physical delivery by ${gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}, primarily driven by Right-of-Way (ROW) access hurdles or equipment delivery bottlenecks.`;
    action = "Convene an inter-ministerial coordination review within 7 business days to clear ROW obstacles and mandate dual-shift contractor workforce deployment.";
  } else if (tier === "medium") {
    statusBadge = { label: "Moderate Risk", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.16)" };
    narrative = `Stationed across the ${place} corridor in ${district} (${state}), development progress is tracking near baseline with a modest budget variance gap of ${gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}. Physical milestones remain within recoverable operational tolerance.`;
    action = "Enforce fortnightly contractor milestone compliance tracking and institute value-engineering reviews on upcoming procurement packages.";
  } else {
    statusBadge = { label: "Optimal Trajectory", color: "#10b981", bg: "rgba(16, 185, 129, 0.16)" };
    if (gap <= 0) {
      narrative = `Located in ${place}, ${district} (${state}), this ${sector} project demonstrates exemplary operational discipline. Certified physical execution (${progress != null ? `${progress.toFixed(0)}%` : "on schedule"}) is leading cumulative disbursements by a favorable ${Math.abs(gap).toFixed(1)}%, indicating strong contractor momentum and zero cost-overrun exposure.`;
    } else {
      narrative = `Located in ${place}, ${district} (${state}), this ${sector} project is maintaining steady delivery cadence (${progress != null ? `${progress.toFixed(0)}%` : "on track"}) with capital expenditure tightly aligned to verified ground completion (+${gap.toFixed(1)}% variance).`;
    }
    action = "Project execution satisfies all MoSPI benchmark criteria. Maintain routine monthly milestone audits and standard progress-linked disbursement tranches.";
  }

  return { cleanName, statusBadge, narrative, action, sector, place, district, state };
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

  // 4-Tier Hierarchy: State -> District -> Place -> Category
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedPlace, setSelectedPlace] = useState<string>("all");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [colorMode, setColorMode] = useState<"risk" | "sector">("risk");
  const [drawerTab, setDrawerTab] = useState<"project" | "districts">("project");

  useEffect(() => {
    fetch("/india_states_simplified.geojson")
      .then((r) => r.json())
      .then((data) => setGeoJsonData(data))
      .catch((err) => console.error("Error loading India states GeoJSON", err));

    listProjects({ limit: 1200 })
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

  // Filtered project list strictly mapped to inland places (zero in ocean/water)
  const filteredProjects = useMemo(() => {
    return allProjects
      .map((p, idx) => {
        const loc = getProjectLocation(p, idx);
        // Anchor directly to verified place coordinate on solid land
        // Micro-separation of 0.001 deg (~100m) ensures points in the same place don't fully overlap
        const lat = loc.coords[0] + ((idx * 7) % 6 - 3) * 0.0012;
        const lng = loc.coords[1] + ((idx * 11) % 6 - 3) * 0.0012;

        return {
          ...p,
          state: loc.state,
          district: loc.district,
          place: loc.place,
          category: p.sector || loc.category,
          latitude: lat,
          longitude: lng,
        };
      })
      .filter((p) => {
        if (selectedState !== "all" && p.state !== selectedState) return false;
        if (selectedDistrict !== "all" && p.district !== selectedDistrict) return false;
        if (selectedPlace !== "all" && p.place !== selectedPlace) return false;
        if (selectedSector !== "all" && p.sector !== selectedSector && p.category !== selectedSector) return false;
        if (selectedTier !== "all" && p.risk_tier !== selectedTier) return false;
        return true;
      });
  }, [allProjects, selectedState, selectedDistrict, selectedPlace, selectedSector, selectedTier]);

  const stateOptions = useMemo(() => {
    const states = new Set(allProjects.map((p) => p.state).filter(Boolean));
    return Array.from(states).sort();
  }, [allProjects]);

  const districtOptions = useMemo(() => {
    if (selectedState === "all") return [];
    const stUpper = selectedState.toUpperCase();
    const distDefs = STATE_DISTRICTS_DATA[stUpper];
    if (distDefs && distDefs.length > 0) {
      return distDefs.map((d) => d.district);
    }
    const places = STATE_DISTRICT_PLACES[stUpper] || [];
    return Array.from(new Set(places.map((pl) => pl.district))).sort();
  }, [selectedState]);

  const placeOptions = useMemo(() => {
    if (selectedState === "all") return [];
    const stUpper = selectedState.toUpperCase();
    const distDefs = STATE_DISTRICTS_DATA[stUpper] || [];
    if (selectedDistrict !== "all") {
      const d = distDefs.find((item) => item.district === selectedDistrict);
      return d ? d.places.map((p) => p.place) : [];
    }
    return distDefs.flatMap((d) => d.places.map((p) => p.place));
  }, [selectedState, selectedDistrict]);

  const districtSummaries = useMemo(() => {
    if (selectedState === "all") return [];
    const stProjs = allProjects.filter((p) => p.state === selectedState);
    return aggregateDistrictData(stProjs);
  }, [allProjects, selectedState]);

  const sectorOptions = useMemo(() => {
    const sectors = new Set(allProjects.map((p) => p.sector).filter(Boolean));
    return Array.from(sectors).sort();
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

  // Leaflet map setup with dynamic state isolation, district/place zoom & auto-fit
  useEffect(() => {
    if (loading || !mapRef.current) return;

    import("leaflet").then((L) => {
      if (!leafletMapRef.current) {
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
        const normSelected = normalizeState(selectedState);
        const stateFeature = geoJsonData.features?.find((f: any) => {
          const name = f.properties?.name || f.properties?.NAME_1 || f.properties?.st_nm || "";
          return normalizeState(name) === normSelected;
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

          // Focus on State bounds if district or place is not specifically selected
          if (selectedDistrict === "all" && selectedPlace === "all") {
            map.fitBounds(stateLayer.getBounds().pad(0.08), {
              animate: true,
              duration: 0.8,
              maxZoom: 9,
            });
          }
        }
      } else if (selectedState === "all" && geoJsonData) {
        // Render subtle state boundaries for all states across India
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

      // Render vector circle markers for the filtered projects
      filteredProjects.forEach((p) => {
        const color =
          colorMode === "sector"
            ? SECTOR_COLOR[p.category || p.sector || ""] || "#3b82f6"
            : TIER_COLOR[p.risk_tier || "low"] || "#3b82f6";

        const popupContent = `
          <div style="font-family:Inter,sans-serif;min-width:250px;padding:6px;color:#0f172a">
            <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px;line-height:1.3">${p.project_name}</div>
            <div style="font-size:11px;color:#475569;margin-bottom:8px;line-height:1.6">
              <span style="display:inline-block;padding:1px 6px;background:#e0f2fe;color:#0369a1;border-radius:4px;font-weight:700;font-size:10px;margin-bottom:4px">
                📍 ${p.place}
              </span><br/>
              <strong>District:</strong> ${p.district} • <strong>State:</strong> ${p.state}<br/>
              <strong>Category:</strong> ${p.category || p.sector}
            </div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
              <span style="background:${color};color:white;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;text-transform:uppercase">${colorMode === "sector" ? (p.category || p.sector) : p.risk_tier}</span>
              ${p.composite_risk_score != null ? `<span style="font-size:11px;color:#475569;font-weight:600">${(p.composite_risk_score * 100).toFixed(0)}% Risk</span>` : ""}
            </div>
            <div style="font-size:11px;color:#0ea5e9;font-weight:600;">Click to view Full Details →</div>
          </div>
        `;

        const circle = L.circleMarker([p.latitude!, p.longitude!], {
          radius: selectedPlace !== "all" ? 11 : selectedDistrict !== "all" ? 9 : selectedState !== "all" ? 8 : 6.5,
          fillColor: color,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.92,
        }).addTo(map);

        circle.bindPopup(popupContent, { offset: [0, -6] });

        circle.on("mouseover", function (this: any) {
          this.setRadius(selectedPlace !== "all" ? 15 : selectedDistrict !== "all" ? 13 : 11);
          this.setStyle({ fillOpacity: 1, weight: 3 });
        });

        circle.on("mouseout", function (this: any) {
          this.setRadius(selectedPlace !== "all" ? 11 : selectedDistrict !== "all" ? 9 : selectedState !== "all" ? 8 : 6.5);
          this.setStyle({ fillOpacity: 0.92, weight: 2 });
        });

        circle.on("click", () => {
          setSelectedProject(p);
          setDrawerTab("project");
        });

        markersRef.current.push(circle);
      });

      // Hierarchical Camera Zoom: Place > District > State > All India
      if (selectedPlace !== "all") {
        const pl = filteredProjects.find((p) => p.place === selectedPlace);
        if (pl && pl.latitude && pl.longitude) {
          map.setView([pl.latitude, pl.longitude], 12, { animate: true, duration: 0.8 });
        }
      } else if (selectedDistrict !== "all") {
        const stUpper = selectedState.toUpperCase();
        const distDef = STATE_DISTRICTS_DATA[stUpper]?.find((d) => d.district === selectedDistrict);
        if (distDef) {
          map.setView(distDef.coords, 10, { animate: true, duration: 0.8 });
        } else if (markersRef.current.length > 0) {
          const group = L.featureGroup(markersRef.current);
          map.fitBounds(group.getBounds().pad(0.35), { animate: true, maxZoom: 11 });
        }
      } else if (selectedState !== "all" && !stateFeatureFound) {
        if (markersRef.current.length > 0) {
          const group = L.featureGroup(markersRef.current);
          map.fitBounds(group.getBounds().pad(0.20), {
            animate: true,
            duration: 0.8,
            maxZoom: 8,
          });
        } else if (STATE_COORDINATES[selectedState.toUpperCase()]) {
          map.setView(STATE_COORDINATES[selectedState.toUpperCase()], 7, { animate: true });
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
  }, [filteredProjects, loading, colorMode, selectedState, selectedDistrict, selectedPlace, geoJsonData]);

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
        subtitle="Hierarchy drilldown: State › District › Place / Locality › Category across all 23 Indian states (Zero-ocean verified)"
      />

      {/* Filter Bar with Full Hierarchy: State, District, Place, Category */}
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
        {/* 1. STATE SELECTOR */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>State:</span>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedDistrict("all");
              setSelectedPlace("all");
            }}
            className="input"
            style={{ width: 160, padding: "4px 8px", fontSize: 12 }}
          >
            <option value="all">All 23 States ({stateOptions.length})</option>
            {stateOptions.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* 2. DISTRICT SELECTOR (Active when State is selected) */}
        {selectedState !== "all" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase" }}>District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedPlace("all");
              }}
              className="input"
              style={{
                width: 160,
                padding: "4px 8px",
                fontSize: 12,
                borderColor: selectedDistrict !== "all" ? "var(--accent)" : undefined,
                background: selectedDistrict !== "all" ? "rgba(6, 182, 212, 0.08)" : undefined,
              }}
            >
              <option value="all">All Districts ({districtOptions.length})</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* 3. PLACE SELECTOR (Active when State is selected) */}
        {selectedState !== "all" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700, textTransform: "uppercase" }}>Place:</span>
            <select
              value={selectedPlace}
              onChange={(e) => setSelectedPlace(e.target.value)}
              className="input"
              style={{
                width: 175,
                padding: "4px 8px",
                fontSize: 12,
                borderColor: selectedPlace !== "all" ? "#10b981" : undefined,
                background: selectedPlace !== "all" ? "rgba(16, 185, 129, 0.08)" : undefined,
              }}
            >
              <option value="all">All Places ({placeOptions.length})</option>
              {placeOptions.map((pl) => (
                <option key={pl} value={pl}>{pl}</option>
              ))}
            </select>
          </div>
        )}

        {/* 4. CATEGORY / SECTOR SELECTOR */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Category:</span>
          <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="input" style={{ width: 160, padding: "4px 8px", fontSize: 12 }}>
            <option value="all">All Categories ({sectorOptions.length})</option>
            {sectorOptions.map((sec) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>

        {/* 5. RISK TIER SELECTOR */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Risk:</span>
          <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} className="input" style={{ width: 115, padding: "4px 8px", fontSize: 12 }}>
            <option value="all">All Tiers</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
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

        {/* Active Hierarchy Breadcrumb & Nationwide Reset */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {selectedState !== "all" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: 6, padding: "3px 10px" }}>
              <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>
                📍 {selectedState} {selectedDistrict !== "all" ? `› ${selectedDistrict}` : ""} {selectedPlace !== "all" ? `› ${selectedPlace}` : ""} ({filteredProjects.length} Projects)
              </span>
              <button
                onClick={() => {
                  setSelectedState("all");
                  setSelectedDistrict("all");
                  setSelectedPlace("all");
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
                ✕ All India
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-sub)", fontWeight: 500 }}>
              Showing <strong style={{ color: "var(--accent)" }}>{filteredProjects.length}</strong> projects across India
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
            : Object.entries(SECTOR_COLOR).map(([sector, color]) => (
                <div key={sector} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
                  <span style={{ fontSize: 12, color: "var(--text-sub)" }}>{sector}</span>
                  <span className="tabular" style={{ fontSize: 12, color: "var(--text)", marginLeft: "auto", paddingLeft: 16, fontWeight: 700 }}>
                    {sectorCounts[sector] || 0}
                  </span>
                </div>
              ))}
        </div>

        {/* Selected Project / District Hierarchy Drawer Panel */}
        {(selectedProject || selectedState !== "all") && (
          <div
            className="animate-fade map-drawer-panel"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              bottom: 16,
              width: 390,
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
            {/* Drawer Tab Switcher when a state is active */}
            {selectedState !== "all" && (
              <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "var(--surface-2)", padding: 3, borderRadius: 8 }}>
                <button
                  onClick={() => setDrawerTab("project")}
                  style={{
                    flex: 1,
                    padding: "5px 10px",
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
                  onClick={() => setDrawerTab("districts")}
                  style={{
                    flex: 1,
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: drawerTab === "districts" ? "var(--accent)" : "transparent",
                    color: drawerTab === "districts" ? "#ffffff" : "var(--text-sub)",
                    transition: "all 0.15s ease",
                  }}
                >
                  District &amp; Place Matrix ({districtSummaries.length})
                </button>
              </div>
            )}

            {drawerTab === "districts" && selectedState !== "all" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {selectedState} Districts ({districtSummaries.length})
                  </span>
                  {(selectedDistrict !== "all" || selectedPlace !== "all") && (
                    <button
                      onClick={() => {
                        setSelectedDistrict("all");
                        setSelectedPlace("all");
                      }}
                      style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                <div style={{ fontSize: 11, color: "var(--text-sub)", lineHeight: 1.4 }}>
                  Click any district to filter local infrastructure and zoom directly into verified municipal territory:
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {districtSummaries.map((d) => {
                    const isSelected = selectedDistrict === d.district;
                    return (
                      <div
                        key={d.district}
                        onClick={() => {
                          setSelectedDistrict(isSelected ? "all" : d.district);
                          setSelectedPlace("all");
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

                        {/* Inland Places list under this district */}
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {d.places.slice(0, 3).map((pl) => (
                            <span key={pl} style={{ background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 3 }}>
                              📍 {pl.split("(")[0].trim()}
                            </span>
                          ))}
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
            ) : selectedProject ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <RiskBadge tier={selectedProject.risk_tier || "low"} suffix={selectedProject.composite_risk_score != null ? ` (${(selectedProject.composite_risk_score * 100).toFixed(0)}%)` : ""} />
                  <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Active Selection</span>
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6, lineHeight: 1.4 }}>
                  {selectedProject.project_name}
                </h3>

                {/* 4-Tier Hierarchy Display */}
                <div style={{ background: "var(--surface-2)", padding: "10px 12px", borderRadius: 8, marginBottom: 14, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-sub)", marginBottom: 4 }}>
                    <strong style={{ color: "var(--text)" }}>Place:</strong>{" "}
                    <span style={{ color: "#10b981", fontWeight: 600 }}>📍 {selectedProject.place}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-sub)", marginBottom: 4 }}>
                    <strong style={{ color: "var(--text)" }}>District:</strong> {selectedProject.district} • <strong style={{ color: "var(--text)" }}>State:</strong> {selectedProject.state}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-sub)" }}>
                    <strong style={{ color: "var(--text)" }}>Category:</strong> {selectedProject.category || selectedProject.sector} ({selectedProject.ministry})
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, background: "var(--surface-2)", padding: 12, borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Revised Cost</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
                      {selectedProject.revised_cost_cr != null ? `₹${selectedProject.revised_cost_cr.toLocaleString("en-IN")} Cr` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Physical Progress</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--low)" }}>
                      {selectedProject.physical_progress_pct != null ? `${selectedProject.physical_progress_pct.toFixed(0)}%` : "—"}
                    </div>
                  </div>
                </div>

                {/* PRISM AI Executive Briefing Card (Human-Readable, Professional Format) */}
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
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13 }}>🤖</span>
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
                          ⚡ Recommended Strategic Action:
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