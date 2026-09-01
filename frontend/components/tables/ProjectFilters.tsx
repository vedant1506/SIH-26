"use client";

interface Filters {
  ministry?: string;
  sector?: string;
  state?: string;
  risk_tier?: string;
  project_scale?: string;
  search?: string;
  delayed?: string;
}
interface Props { filters: Filters; onChange: (f: Filters) => void; }

const SECTORS = ["Roads", "Railways", "Power", "Petroleum", "Urban Dev", "Water Resources", "Telecom", "Shipping"];
const SCALES = [{ value: "", label: "All Scales" }, { value: "mega", label: "Mega (≥₹1000 Cr)" }, { value: "major", label: "Major (₹150–1000 Cr)" }, { value: "other", label: "Other" }];
const TIERS = [{ value: "", label: "All Tiers" }, { value: "critical", label: "Critical" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }];

export default function ProjectFilters({ filters, onChange }: Props) {
  function set(key: keyof Filters, val: string) { onChange({ ...filters, [key]: val || undefined }); }
  
  const inputStyle = { fontSize: 13, background: "var(--surface-2)", border: "1px solid var(--border-2)", padding: "6px 12px" };
  const labelStyle = { fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textAlign: "left" as const, textTransform: "uppercase" as const, letterSpacing: "0.05em" };

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div style={{ flex: "1 1 200px" }}>
        <div style={labelStyle}>Search</div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
          <input className="input" placeholder="Search by Project Name or ID..." value={filters.search || ""} onChange={e => set("search", e.target.value)} style={{ ...inputStyle, paddingLeft: 32, width: "100%" }} />
        </div>
      </div>
      <div style={{ flex: "1 1 140px" }}>
        <div style={labelStyle}>Ministry</div>
        <input id="filter-ministry" className="input" placeholder="Filter ministry…" value={filters.ministry || ""} onChange={e => set("ministry", e.target.value)} style={{ ...inputStyle, width: "100%" }} />
      </div>
      <div style={{ flex: "1 1 140px" }}>
        <div style={labelStyle}>Sector</div>
        <select id="filter-sector" className="input" value={filters.sector || ""} onChange={e => set("sector", e.target.value)} style={{ ...inputStyle, width: "100%" }}>
          <option value="">All Sectors</option>
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ flex: "1 1 120px" }}>
        <div style={labelStyle}>State</div>
        <input id="filter-state" className="input" placeholder="State…" value={filters.state || ""} onChange={e => set("state", e.target.value)} style={{ ...inputStyle, width: "100%" }} />
      </div>
      <div style={{ flex: "1 1 120px" }}>
        <div style={labelStyle}>Risk Tier</div>
        <select id="filter-tier" className="input" value={filters.risk_tier || ""} onChange={e => set("risk_tier", e.target.value)} style={{ ...inputStyle, width: "100%" }}>
          {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div style={{ flex: "1 1 130px" }}>
        <div style={labelStyle}>Schedule Status</div>
        <select
          id="filter-delayed"
          className="input"
          value={filters.delayed || ""}
          onChange={e => set("delayed", e.target.value)}
          style={{
            ...inputStyle,
            width: "100%",
            color: filters.delayed ? "#a855f7" : "inherit",
            fontWeight: filters.delayed ? 700 : 400,
            borderColor: filters.delayed ? "rgba(168, 85, 247, 0.4)" : "var(--border-2)",
          }}
        >
          <option value="">All Statuses</option>
          <option value="true">⏱️ Delayed Only (1,805)</option>
        </select>
      </div>
      <div style={{ flex: "1 1 130px" }}>
        <div style={labelStyle}>Scale</div>
        <select id="filter-scale" className="input" value={filters.project_scale || ""} onChange={e => set("project_scale", e.target.value)} style={{ ...inputStyle, width: "100%" }}>
          {SCALES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <button className="btn" style={{ marginBottom: 1, background: "transparent", border: "1px solid var(--critical)", color: "var(--critical)", fontSize: 13, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }} onClick={() => onChange({})}>
        <span>⨯</span> Clear Filters
      </button>
    </div>
  );
}
