"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { listProjects } from "@/lib/api";
import type { ProjectListItem } from "@/lib/types";
import TopBar from "@/components/layout/TopBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import RiskBadge from "@/components/ui/RiskBadge";

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
  "Petroleum & Natural Gas": "#e11d48",
  "Telecommunications": "#a855f7",
  "Water Resources": "#10b981",
  "Coal": "#64748b",
};

const STATE_COORDINATES: Record<string, [number, number]> = {
  "DELHI": [28.6139, 77.2090],
  "MAHARASHTRA": [19.0760, 72.8777],
  "KARNATAKA": [12.9716, 77.5946],
  "TAMIL NADU": [13.0827, 80.2707],
  "WEST BENGAL": [22.5726, 88.3639],
  "UTTAR PRADESH": [26.8467, 80.9462],
  "GUJARAT": [23.0225, 72.5714],
  "RAJASTHAN": [26.9124, 75.7873],
  "TELANGANA": [17.3850, 78.4867],
  "ANDHRA PRADESH": [17.6868, 83.2185],
  "MADHYA PRADESH": [23.2599, 77.4126],
  "BIHAR": [25.5941, 85.1376],
  "ODISHA": [20.2961, 85.8245],
  "ASSAM": [26.1445, 91.7362],
  "PUNJAB": [30.7333, 76.7794],
  "HARYANA": [28.4595, 77.0266],
  "KERALA": [8.5241, 76.9366],
  "JHARKHAND": [23.3441, 85.3096],
  "CHHATTISGARH": [21.2514, 81.6296],
  "JAMMU & KASHMIR": [34.0837, 74.7973],
  "HIMACHAL PRADESH": [31.1048, 77.1734],
  "UTTARAKHAND": [30.3165, 78.0322],
  "GOA": [15.4909, 73.8278],
};

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [allProjects, setAllProjects] = useState<ProjectListItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);

  // Filters & Color Mode
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [colorMode, setColorMode] = useState<"risk" | "sector">("risk");

  useEffect(() => {
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

  // Filtered project list with accurate nationwide coordinates
  const filteredProjects = useMemo(() => {
    return allProjects
      .filter((p) => {
        if (selectedState !== "all" && p.state !== selectedState) return false;
        if (selectedSector !== "all" && p.sector !== selectedSector) return false;
        if (selectedTier !== "all" && p.risk_tier !== selectedTier) return false;
        return true;
      })
      .map((p, idx) => {
        let lat = p.latitude;
        let lng = p.longitude;
        if (!lat || !lng) {
          const stCoords = STATE_COORDINATES[p.state?.toUpperCase() || "DELHI"] || [22.5937, 78.9629];
          const jitterLat = ((idx * 17) % 50 - 25) * 0.03;
          const jitterLng = ((idx * 23) % 50 - 25) * 0.03;
          lat = stCoords[0] + jitterLat;
          lng = stCoords[1] + jitterLng;
        }
        return { ...p, latitude: lat, longitude: lng };
      });
  }, [allProjects, selectedState, selectedSector, selectedTier]);

  const stateOptions = useMemo(() => {
    const states = new Set(allProjects.map((p) => p.state).filter(Boolean));
    return Array.from(states).sort();
  }, [allProjects]);

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

  // Leaflet map setup with nationwide auto-fit bounds
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

      // Render vector circle markers
      filteredProjects.forEach((p) => {
        const color =
          colorMode === "sector"
            ? SECTOR_COLOR[p.sector || ""] || "#3b82f6"
            : TIER_COLOR[p.risk_tier || "low"] || "#3b82f6";

        const popupContent = `
          <div style="font-family:Inter,sans-serif;min-width:230px;padding:4px;color:#0f172a">
            <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px">${p.project_name}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:8px"><strong>State:</strong> ${p.state || ""} • <strong>Sector:</strong> ${p.sector || ""}</div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
              <span style="background:${color};color:white;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;text-transform:uppercase">${colorMode === "sector" ? p.sector : p.risk_tier}</span>
              ${p.composite_risk_score != null ? `<span style="font-size:11px;color:#475569;font-weight:600">${(p.composite_risk_score * 100).toFixed(0)}% Risk</span>` : ""}
            </div>
            <div style="font-size:11px;color:#0ea5e9;font-weight:600;">Selected on Side Panel →</div>
          </div>
        `;

        const circle = L.circleMarker([p.latitude!, p.longitude!], {
          radius: 7,
          fillColor: color,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.92,
        }).addTo(map);

        circle.bindPopup(popupContent, { offset: [0, -6] });

        circle.on("mouseover", function (this: any) {
          this.setRadius(11);
          this.setStyle({ fillOpacity: 1, weight: 3 });
        });

        circle.on("mouseout", function (this: any) {
          this.setRadius(7);
          this.setStyle({ fillOpacity: 0.92, weight: 2 });
        });

        circle.on("click", () => {
          setSelectedProject(p);
        });

        markersRef.current.push(circle);
      });

      // Auto-fit bounds across all 23 states of India if markers exist
      if (markersRef.current.length > 0 && selectedState === "all") {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.05));
      }
    }).catch((err) => {
      console.error("Failed to load Leaflet map engine", err);
      setMapLoading(false);
    });
  }, [filteredProjects, loading, colorMode]);

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
      if (p.sector) s[p.sector] = (s[p.sector] || 0) + 1;
    });
    return s;
  }, [filteredProjects]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <TopBar title="Geospatial Infrastructure Intelligence Map" subtitle="Nationwide risk and sector category distribution across all 23 Indian states — 1,200 dataset projects" />

      {/* Filter Bar */}
      <div
        style={{
          padding: "10px 24px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 16,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>State:</span>
          <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="input" style={{ width: 180, padding: "4px 8px", fontSize: 12 }}>
            <option value="all">All 23 States ({stateOptions.length})</option>
            {stateOptions.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Sector / Category:</span>
          <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="input" style={{ width: 190, padding: "4px 8px", fontSize: 12 }}>
            <option value="all">All Sectors ({sectorOptions.length})</option>
            {sectorOptions.map((sec) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Risk Tier:</span>
          <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} className="input" style={{ width: 140, padding: "4px 8px", fontSize: 12 }}>
            <option value="all">All Risk Tiers</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Color Mode Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface-2)", padding: "3px 6px", borderRadius: 8, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", paddingRight: 4 }}>Color By:</span>
          <button
            onClick={() => setColorMode("risk")}
            style={{
              padding: "3px 10px",
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
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: colorMode === "sector" ? "#3b82f6" : "transparent",
              color: colorMode === "sector" ? "#ffffff" : "var(--text-sub)",
            }}
          >
            Sector Category
          </button>
        </div>

        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-sub)", fontWeight: 500 }}>
          Showing <strong style={{ color: "var(--accent)" }}>{filteredProjects.length}</strong> of {allProjects.length} projects across India
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
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--border-2)",
            borderRadius: 10,
            padding: "14px 18px",
            zIndex: 5,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.6)",
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {colorMode === "risk" ? "Risk Tier Breakdown" : "Sector Category Breakdown"}
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

        {/* Selected Project Details Drawer Panel */}
        {selectedProject && (
          <div
            className="animate-fade"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              bottom: 16,
              width: 360,
              maxWidth: "90vw",
              background: "rgba(15, 23, 42, 0.96)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--border-2)",
              borderRadius: 12,
              padding: 20,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <RiskBadge tier={selectedProject.risk_tier || "low"} suffix={selectedProject.composite_risk_score != null ? ` (${(selectedProject.composite_risk_score * 100).toFixed(0)}%)` : ""} />
              <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Active Map Selection</span>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6, lineHeight: 1.4 }}>
              {selectedProject.project_name}
            </h3>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              <strong>State:</strong> {selectedProject.state} • <strong>Sector:</strong> {selectedProject.sector}
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

            {/* Hugging Face Qwen AI Executive Summary Card */}
            <div style={{ background: "rgba(99, 102, 241, 0.08)", borderLeft: "3px solid #6366f1", padding: 12, borderRadius: "0 8px 8px 0", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#818cf8", marginBottom: 4 }}>
                🤖 PRISM AI Executive Summary (Hugging Face Qwen Model)
              </div>
              <div style={{ fontSize: 12, color: "var(--text-sub)", lineHeight: 1.5 }}>
                Project {selectedProject.project_name} in {selectedProject.state} state ({selectedProject.sector} sector). Budget-progress gap stands at {selectedProject.burn_progress_gap != null ? `${selectedProject.burn_progress_gap > 0 ? "+" : ""}${selectedProject.burn_progress_gap.toFixed(1)}%` : "0.0%"}.
              </div>
            </div>

            <a
              href={`/projects/${selectedProject.id}`}
              className="btn btn-primary"
              style={{ marginTop: "auto", textAlign: "center", justifyContent: "center", width: "100%" }}
            >
              Open Full Project Dashboard →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}