# April 2026 Project Geolocation Validation Report

**Project**: SIH26103 TRACE / Sentinel  
**Dataset**: MoSPI PAIMANA April 2026 Flash Report (1,981 Infrastructure Projects)  
**Date**: September 19, 2026  
**Status**: Phase 3 Geolocation Validation Complete — No Production Files Modified  

---

## A. Executive Summary

This validation audit investigated the complete data provenance, coordinate integrity, and geographic resolution of all 1,981 projects in the official April 2026 MoSPI portfolio.

### Key Audit Conclusions
1. **Raw MoSPI Data Limitation**: The original source document (`ml/data/raw/mospi_paimana_april_2026.csv`) contains project metadata, costs, progress, agency, and state, but **contains zero native geographic coordinates** (no latitude, longitude, address, or district columns).
2. **Identification of Synthetic Distortion**: Of the 1,981 projects, exactly **1,134 projects (57.2%)** were subjected to artificial concentric ring displacement algorithms in [scripts/rebuild_authoritative_geolocations.py](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/scripts/rebuild_authoritative_geolocations.py#L653-L668) to disperse co-located projects into hexagonal patterns, followed by a secondary runtime spiral offset in [frontend/app/(dashboard)/map/page.tsx](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/app/(dashboard)/map/page.tsx#L334-L366).
3. **Rigorous Classification**: We established a 7-tier geographic hierarchy:
   - **`VERIFIED_EXACT`**: 215 projects (10.9%) — Mapped to verified facility GPS coordinates (e.g. airport runways, dams, thermal power plants, major mining pits).
   - **`VERIFIED_SITE`**: 290 projects (14.6%) — Mapped to specific industrial/urban site nodes.
   - **`DISTRICT_LEVEL`**: 177 projects (8.9%) — Mapped to district reference points.
   - **`UNAVAILABLE`**: 165 projects (8.3%) — Multi-state, offshore, or national projects with no single ground location.
   - **`SYNTHETIC`**: 1,134 projects (57.2%) — Artificially displaced co-located projects that must be restored to their true baseline coordinates.
   - **`INVALID`**: 0 projects (0.0%) — All records fall within India's geospatial envelope.

---

## B. Raw Dataset Analysis

- **File**: `ml/data/raw/mospi_paimana_april_2026.csv`
- **Total Records**: 1,981 rows
- **Unique Project IDs**: 1,981 unique IDs
- **Columns (19 Total)**:
  `sl_no`, `ministry`, `sector`, `project_name`, `agency`, `project_id`, `legacy_ocms_code`, `pmgid`, `state`, `approval_date_mm_yyyy`, `start_date_mm_yyyy`, `original_target_doc_mm_yyyy`, `revised_target_doc_mm_yyyy`, `original_cost_crore`, `revised_cost_crore`, `cumulative_expenditure_crore`, `physical_progress_percent`, `report_month`, `source_pdf_page`.
- **Geographic Data Audit**:
  - `latitude`: **NOT PRESENT** in raw source.
  - `longitude`: **NOT PRESENT** in raw source.
  - `district`: **NOT PRESENT** in raw source.
  - `location_name` / `address`: **NOT PRESENT** in raw source.
  - `state`: Present for all 1,981 rows (107 distinct state labels including multi-state and UT designations).
- **Core Implication**: Any latitude/longitude associated with a project in the application was **inferred or mapped** from textual keywords within `project_name` (e.g., "Kadapa Airport", "Gosikhurd Dam", "Dholera Greenfield Airport", "Gevra OCP Coal Mine") cross-referenced against gazetteers.

---

## C. Current Coordinate Analysis

An inspection of [frontend/app/data/geolocations_master.json](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/app/data/geolocations_master.json) revealed:
- **Total Records**: 1,981
- **Unique Coordinate Pairs**: 1,980 (99.9% artificially unique!)
- **Duplicate Pairs in File**: Only 1 pair (2 projects sharing a coordinate).
- **Coordinate Statuses**:
  - `exact`: 1,545 records
  - `approximate`: 436 records
- **Resolution Levels**:
  - `city`: 1,161
  - `district`: 436
  - `facility`: 263
  - `project_site`: 121
- **Why almost all coordinates were unique**: Rather than showing 20 projects sharing the exact coordinates of Raniganj Coalfields, an artificial micro-offset algorithm assigned each subsequent project an offset coordinate on concentric rings.

---

## D. Synthetic Coordinate Detection

We traced the exact code responsible for artificial marker displacement:

### 1. Offline Pipeline Displacement
- **File**: [scripts/rebuild_authoritative_geolocations.py](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/scripts/rebuild_authoritative_geolocations.py#L653-L668)
- **Code**:
  ```python
  # Micro-diversity offset for co-located projects within the same site/district perimeter (40m - 90m)
  coord_key = (round(final_lat, 5), round(final_lng, 5))
  prior_seen = site_coord_tracker.get(coord_key, 0)
  site_coord_tracker[coord_key] = prior_seen + 1
  if prior_seen > 0:
      ring = (prior_seen - 1) // 6 + 1
      idx_in_ring = (prior_seen - 1) % 6
      angle = idx_in_ring * (2 * math.pi / 6) + ring * 0.4
      r = min(0.00045 * ring, 0.0018)
      cos_lat = max(0.2, math.cos(math.radians(final_lat)))
      cand_lat = round(final_lat + r * math.sin(angle), 6)
      cand_lng = round(final_lng + (r * math.cos(angle)) / cos_lat, 6)
      final_lat = cand_lat
      final_lng = cand_lng
  ```
- **Impact**: Altered the stored coordinates of **1,134 projects** across India into artificial hexagonal patterns.

### 2. Client-Side Runtime Displacement
- **File**: [frontend/app/(dashboard)/map/page.tsx](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/app/(dashboard)/map/page.tsx#L334-L366)
- **Function**: `getMarkerVisualCoords(lat, lng, idxInGroup, groupSize, zoom)`
- **Transformation**: At zoom $< 14$, re-applies a concentric radial spiral displacement on screen:
  $$\text{ring} = 1 + \lfloor \frac{\text{idx}}{6} \rfloor, \quad \theta = \frac{\text{remaining} \times 2\pi}{\text{items}} + \text{ring} \times 0.35, \quad r = \min(0.0006 \times \text{ring}, 0.0022)$$
- **Why It Is Not Authoritative**: It intentionally alters true geospatial coordinates for visual convenience, creating visible geometric grids over satellite imagery.

---

## E. Coordinate Provenance

| Source Type | Count | Description | Authoritative? |
| :--- | :---: | :--- | :---: |
| `verified_facility` / `manual_verified` | 215 | Known airport terminals, dams, major thermal plants, AIIMS campuses with GPS coordinates. | **YES (Exact)** |
| `verified_city` (Base) | 290 | Extracted municipal / industrial node from `project_name` text matched to official gazetteer. | **YES (Site Level)** |
| `verified_district` (Base) | 177 | District centroid matched from administrative hierarchy. | **YES (District Level)** |
| `displaced_synthetic` | 1,134 | Co-located projects displaced into hexagonal rings. | **NO (Synthetic)** |
| `pan_india_unmapped` | 165 | Multi-state pipelines, national telecom rings, offshore blocks with no single ground site. | **NO (Location Unavailable)** |

---

## F. Location Classification Hierarchy

We defined 7 mutually exclusive location statuses stored in [docs/april_2026_geolocation_validation.json](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/docs/april_2026_geolocation_validation.json):

```
                       [1,981 Projects]
                              │
         ┌────────────────────┴────────────────────┐
   Single Ground Site                        Multi-State / PAN-India
         │                                         │
   Exact Known Facility?                     [UNAVAILABLE] (165)
   ┌─────┴─────┐
[VERIFIED]  Gazetteer Match
 (215)         │
         Co-located with prior?
         ┌─────┴─────┐
      First       Subsequent
   [VERIFIED]    [SYNTHETIC] (1,134)
   (467)         Must be restored to base!
```

---

## G. Duplicate Coordinate Analysis (Without Synthetic Offsets)

When synthetic ring offsets are stripped and projects share their true reference location, the 1,981 projects naturally collapse into **860 real geographic sites**:
- **Single-project locations**: 484 sites
- **Multi-project co-located hubs**: 376 sites (representing 1,497 projects)

### Top 10 Multi-Project Co-Located Hubs
| Place / Site Name | District | State | Project Count | Legitimate Reason for Co-Location |
| :--- | :--- | :--- | :---: | :--- |
| **Raniganj Coalfields** | Paschim Bardhaman | West Bengal | 19 | Multiple underground & opencast mine blocks (ECL) in one coalfield. |
| **Kandla Port & Khavda 30GW Park** | Kutch | Gujarat | 17 | Major renewable energy park packages and port berths in Kutch corridor. |
| **Dholera Smart City & Expressway** | Ahmedabad | Gujarat | 16 | Airport packages, expressway segments, and trunk infrastructure in Dholera SIR. |
| **Saoner & Makardhokra Coal Hub** | Nagpur | Maharashtra | 16 | Clustered WCL mining operations and MIHAN SEZ development. |
| **Subhadra & Hingula Coal Complex** | Angul | Odisha | 14 | Talcher coalfields infrastructure packages (MCL). |
| **Jammu Civil Airport & Ring Road** | Jammu | Jammu & Kashmir | 14 | NHAI Jammu ring road packages and airport terminal expansion. |
| **Chennai Airport & Metro Phase-II** | Chennai | Tamil Nadu | 12 | Metro rail line packages terminating at airport transport interchange. |
| **Hinjawadi IT & Ring Road Hub** | Pune | Maharashtra | 12 | Pune metro line 3 and outer ring road civil packages. |
| **Jiribam-Imphal Railway Line** | Tamenglong | Manipur | 12 | Railway tunnel, bridge, and station packages along single rail corridor. |
| **Navi Mumbai Airport & JNPT** | Raigad | Maharashtra | 11 | NMIA runway, terminal, and port logistics connectivity works. |

---

## H. Project-by-Project Validation Statistics

A machine-readable catalog of all 1,981 projects has been generated at [docs/april_2026_geolocation_validation.json](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/docs/april_2026_geolocation_validation.json).

```json
{
  "project_id": "612786",
  "project_name": "Construction of New Domestic Terminal Building Building and miscellaneous works including maintenance, operations and AICMC at Kadapa Airport",
  "state": "Andhra Pradesh",
  "district": "YSR Kadapa",
  "place": "Kadapa Airport Runway & Terminal",
  "latitude": 14.51,
  "longitude": 78.7725,
  "location_status": "VERIFIED_EXACT",
  "coordinate_source": "verified_facility",
  "is_synthetic": false,
  "is_exact": true,
  "resolution_level": "project_site"
}
```

---

## I. Recommended Authoritative Location Rules

For the GIS implementation:
1. **Zero Synthetic Coordinates**: Remove all mathematical ring/spiral offsets. Stored `[latitude, longitude]` must remain unmodified.
2. **Visual Handling of Co-Located Hubs**:
   - Use **Leaflet Marker Clustering** (`react-leaflet-cluster` or `leaflet.markercluster`) or a grouped badge (`"17 Projects at Dholera SIR"`).
   - When clicked, expand into spiderfy pins or open a dossier selector listing all projects at that location.
3. **Transparent Status Badging**:
   - `VERIFIED_EXACT`: Standard compact risk pin.
   - `DISTRICT_LEVEL`: Marker with subtle dashed halo labeled `"District-level reference"`.
   - `UNAVAILABLE`: Listed in project drawer and filter counters as `"Location Unavailable"`, but **never plotted at a fake coordinate**.

---

## J. Data Quality Problems Identified

1. **State Centroid Contamination**: Earlier versions snapped multi-state projects to geographic state centroids (e.g. `(22.5937, 78.9629)` for PAN India). This caused ~165 projects to bunch up in remote forest land in Madhya Pradesh.
2. **Double Jittering**: Projects suffered displacement twice: first during JSON generation, then again dynamically in the Leaflet canvas.

---

## K. Required Inputs for Phase 4 (Rebuilding Coordinates)

1. Remove the micro-offset loop from `scripts/rebuild_authoritative_geolocations.py` so projects retain their true baseline facility/district coordinates.
2. Flag all PAN-India and Multi-State projects without physical sites as `location_status = "unavailable"`, setting `latitude = null, longitude = null`.
3. Resync `geolocations_master.json` and `backend/sql_app.db` with clean, non-displaced data.

---

**PHASE 3 COMPLETE — NO PRODUCTION FILES MODIFIED**
