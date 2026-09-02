// ============================================================================
// State-Wise Geospatial Coordinates & Metrics Knowledge Base (April 2026 Dataset)
// Strictly State-Wise Plotting across all 36 Indian States & Union Territories
// ============================================================================

export interface StateCoordinatesMap {
  [state: string]: [number, number];
}

export const STATE_COORDINATES: Record<string, [number, number]> = {
  "ANDHRA PRADESH": [16.5062, 80.6480],        // Vijayawada / Amaravati
  "ARUNACHAL PRADESH": [27.0844, 93.6053],     // Itanagar
  "ASSAM": [26.1445, 91.7362],                 // Guwahati / Dispur
  "BIHAR": [25.5941, 85.1376],                 // Patna
  "CHANDIGARH": [30.7333, 76.7794],            // Chandigarh
  "CHHATTISGARH": [21.2514, 81.6296],          // Raipur
  "DADRA & NAGAR HAVELI AND DAMAN & DIU": [20.4283, 72.8397], // Daman / Silvassa
  "DELHI": [28.6139, 77.2090],                 // New Delhi
  "GOA": [15.4909, 73.8278],                   // Panaji
  "GUJARAT": [23.2156, 72.6369],               // Gandhinagar / Ahmedabad
  "HARYANA": [29.0588, 76.0856],               // Rohtak / Chandigarh
  "HIMACHAL PRADESH": [31.1048, 77.1734],      // Shimla
  "JAMMU & KASHMIR": [34.0837, 74.7973],       // Srinagar / Jammu
  "JHARKHAND": [23.3441, 85.3096],             // Ranchi
  "KARNATAKA": [12.9716, 77.5946],             // Bengaluru
  "KERALA": [8.5241, 76.9366],                 // Thiruvananthapuram / Kochi
  "LADAKH": [34.1526, 77.5771],                // Leh
  "LAKSHADWEEP": [10.5667, 72.6417],           // Kavaratti
  "MADHYA PRADESH": [23.2599, 77.4126],        // Bhopal
  "MAHARASHTRA": [19.0760, 72.8777],           // Mumbai / Pune
  "MANIPUR": [24.8170, 93.9368],               // Imphal
  "MEGHALAYA": [25.5788, 91.8933],             // Shillong
  "MIZORAM": [23.7271, 92.7176],               // Aizawl
  "NAGALAND": [25.6751, 94.1086],              // Kohima
  "ODISHA": [20.2961, 85.8245],                // Bhubaneswar
  "PUDUCHERRY": [11.9416, 79.8083],            // Puducherry
  "PUNJAB": [30.9010, 75.8573],                // Ludhiana / Chandigarh
  "RAJASTHAN": [26.9124, 75.7873],             // Jaipur
  "SIKKIM": [27.3389, 88.6065],                // Gangtok (Strictly inside Sikkim!)
  "TAMIL NADU": [13.0827, 80.2707],            // Chennai
  "TELANGANA": [17.3850, 78.4867],             // Hyderabad
  "TRIPURA": [23.8315, 91.2868],               // Agartala
  "UTTAR PRADESH": [26.8467, 80.9462],         // Lucknow
  "UTTARAKHAND": [30.3165, 78.0322],           // Dehradun
  "WEST BENGAL": [22.5726, 88.3639],           // Kolkata
  "ANDAMAN & NICOBAR": [11.6234, 92.7265],     // Port Blair
  "OFFSHORE": [19.2000, 71.5000],              // Mumbai High / Offshore Basin
  "MULTI-STATE": [23.5000, 78.5000],           // Central India Axis
};

export function normalizeStateName(rawState: string = ""): string {
  const s = rawState.trim();
  const sUpper = s.toUpperCase();
  if (sUpper.includes("MULTI") || sUpper.includes("PAN INDIA") || s.includes(",")) return "MULTI-STATE";
  if (sUpper.includes("OFFSHORE")) return "OFFSHORE";
  if (sUpper.includes("ODISHA") || sUpper.includes("ORISSA")) return "ODISHA";
  if (sUpper.includes("UTTARAKHAND") || sUpper.includes("UTTARANCHAL")) return "UTTARAKHAND";
  if (sUpper.includes("JAMMU")) return "JAMMU & KASHMIR";
  if (sUpper.includes("ANDAMAN")) return "ANDAMAN & NICOBAR";
  if (sUpper.includes("DADRA") || sUpper.includes("DAMAN") || sUpper.includes("DIU")) return "DADRA & NAGAR HAVELI AND DAMAN & DIU";
  if (sUpper.includes("PUDUCHERRY") || sUpper.includes("PONDICHERRY")) return "PUDUCHERRY";
  if (sUpper.includes("SIKKIM")) return "SIKKIM";
  if (sUpper.includes("MANIPUR")) return "MANIPUR";
  if (sUpper.includes("MIZORAM")) return "MIZORAM";
  if (sUpper.includes("NAGALAND")) return "NAGALAND";
  if (sUpper.includes("ARUNACHAL")) return "ARUNACHAL PRADESH";
  if (sUpper.includes("MEGHALAYA")) return "MEGHALAYA";
  if (sUpper.includes("TRIPURA")) return "TRIPURA";
  if (sUpper.includes("LADAKH")) return "LADAKH";
  if (sUpper.includes("GOA")) return "GOA";

  for (const k of Object.keys(STATE_COORDINATES)) {
    if (sUpper.includes(k)) return k;
  }
  return sUpper;
}

export function projectMatchesState(projectState: string = "", filterState: string = ""): boolean {
  if (!filterState || filterState === "all") return true;
  const pNorm = normalizeStateName(projectState);
  const fNorm = normalizeStateName(filterState);
  if (pNorm === fNorm) return true;

  // Multi-state cross matching (e.g., if filter is "Bihar", match "Multi-States (Bihar, Jharkhand)")
  const pUpper = projectState.toUpperCase();
  const fUpper = filterState.toUpperCase();
  if (pUpper.includes(fUpper) || fUpper.includes(pUpper)) return true;
  return false;
}

/**
 * Resolves clean state-wise coordinates strictly within that state
 */
export function getProjectLocation(
  project: { id?: string; project_name?: string; state?: string; sector?: string; latitude?: number | null; longitude?: number | null },
  index: number = 0
): { state: string; coords: [number, number]; category: string } {
  const rawState = project.state || "Delhi";
  const stKey = normalizeStateName(rawState);
  const center = STATE_COORDINATES[stKey] || [22.5937, 78.9629];

  // If project already has valid coordinates in DB, use them directly
  if (project.latitude != null && project.longitude != null && !isNaN(project.latitude) && !isNaN(project.longitude)) {
    return {
      state: rawState,
      coords: [project.latitude, project.longitude],
      category: project.sector || "Infrastructure",
    };
  }

  // Micro-spread strictly around state center (< 2 km radius)
  const angle = (index * 137.5 * Math.PI) / 180.0;
  const radius = Math.sqrt(index % 40) * 0.0035;
  const lat = center[0] + radius * Math.cos(angle);
  const lng = center[1] + radius * Math.sin(angle);

  return {
    state: rawState,
    coords: [round6(lat), round6(lng)],
    category: project.sector || "Infrastructure",
  };
}

function round6(num: number): number {
  return Math.round(num * 1000000) / 1000000;
}

/**
 * Aggregates projects by State
 */
export function aggregateStateData(projects: any[]): {
  state: string;
  projectCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalCostCr: number;
  avgProgress: number;
  coords: [number, number];
}[] {
  const map = new Map<string, {
    state: string;
    projectCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalCostCr: number;
    avgProgress: number;
    coords: [number, number];
  }>();

  projects.forEach((p, idx) => {
    const st = p.state || "National / Pan-India";
    const stKey = normalizeStateName(st);
    const coords = STATE_COORDINATES[stKey] || [22.5937, 78.9629];

    if (!map.has(st)) {
      map.set(st, {
        state: st,
        projectCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        totalCostCr: 0,
        avgProgress: 0,
        coords,
      });
    }

    const item = map.get(st)!;
    item.projectCount += 1;
    item.totalCostCr += p.revised_cost_cr || p.original_cost_cr || 0;
    item.avgProgress += p.physical_progress_pct || 0;

    const tier = (p.risk_tier || "low").toLowerCase();
    if (tier === "critical") item.criticalCount += 1;
    else if (tier === "high") item.highCount += 1;
    else if (tier === "medium") item.mediumCount += 1;
    else item.lowCount += 1;
  });

  return Array.from(map.values())
    .map((s) => ({
      ...s,
      totalCostCr: Math.round(s.totalCostCr),
      avgProgress: s.projectCount > 0 ? Math.round(s.avgProgress / s.projectCount) : 0,
    }))
    .sort((a, b) => b.projectCount - a.projectCount);
}

export interface DistrictSummary {
  district: string;
  state: string;
  projectCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalCostCr: number;
  avgProgress: number;
  coords: [number, number];
  places: string[];
}

export const STATE_DISTRICTS_DATA: Record<string, any[]> = {};
export const STATE_DISTRICT_PLACES: Record<string, any[]> = {};

export function aggregateDistrictData(projects: any[]): DistrictSummary[] {
  const map = new Map<string, DistrictSummary>();

  projects.forEach((p) => {
    const dist = p.state || "State Zone";
    if (!map.has(dist)) {
      map.set(dist, {
        district: dist,
        state: p.state || "State",
        projectCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        totalCostCr: 0,
        avgProgress: 0,
        coords: [p.latitude || 22.5937, p.longitude || 78.9629],
        places: [],
      });
    }

    const item = map.get(dist)!;
    item.projectCount += 1;
    item.totalCostCr += p.revised_cost_cr || p.original_cost_cr || 0;
    item.avgProgress += p.physical_progress_pct || 0;

    const tier = (p.risk_tier || "low").toLowerCase();
    if (tier === "critical") item.criticalCount += 1;
    else if (tier === "high") item.highCount += 1;
    else if (tier === "medium") item.mediumCount += 1;
    else item.lowCount += 1;
  });

  return Array.from(map.values())
    .map((d) => ({
      ...d,
      totalCostCr: Math.round(d.totalCostCr),
      avgProgress: d.projectCount > 0 ? Math.round(d.avgProgress / d.projectCount) : 0,
    }))
    .sort((a, b) => b.projectCount - a.projectCount);
}
