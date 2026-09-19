# Comprehensive GIS Audit — ISRO Bhuvan Integration & Project Markers

**Project**: SIH26103 TRACE / Sentinel  
**Target Screen**: Geospatial GIS Intelligence Map (`/map`)  
**Audit Date**: September 19, 2026  
**Status**: Phase 1 Complete (Audit Only — Zero Code Modifications Made)

---

## 1. Current Map Library
- **Dual Architecture**: The application implements a dual-engine architecture:
  1. **Leaflet (`v1.9.4`)**: Renders `standard`, `dark`, `satellite`, `light`, and `osm` basemaps inside `<div ref={mapRef} />`.
  2. **MapLibre GL JS (`v6.6.0`)**: Renders when `baseLayer === "bhuvan"` inside `<div ref={maplibreContainerRef} />`.
- **Toggle Mechanism**: In [frontend/app/(dashboard)/map/page.tsx](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/app/(dashboard)/map/page.tsx#L2100-L2120), container visibility is controlled via CSS display toggles (`display: baseLayer === "bhuvan" ? "block" : "none"`).

---

## 2. Current Base Map
- **Standard Layer**: Esri World Dark Gray Canvas XYZ tiles (`server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`).
- **Dark Layer**: Esri Dark Canvas.
- **Satellite Layer**: Esri World Imagery XYZ (`server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`).
- **Bhuvan Layer (MapLibre & Leaflet)**:
  - Underlay: Esri World Imagery (used as a fail-safe fallback).
  - Raster Overlay: Bhuvan OCM Satellite Mosaic WMS from `https://bhuvan-ras1.nrsc.gov.in/tilecache/tilecache.py` (`layers=bhuvan_ocm_wbase`).
  - Administrative Vector Overlay: Bhuvan WMS from `https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms` (`layers=basemap:admin_group_ntl`).

---

## 3. Current Bhuvan Configuration
- Defined in [frontend/lib/bhuvan-maplibre-style.ts](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/lib/bhuvan-maplibre-style.ts) and [frontend/app/(dashboard)/map/page.tsx](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/app/(dashboard)/map/page.tsx#L90-L112):
  - **Tilecache WMS**: `https://bhuvan-ras1.nrsc.gov.in/tilecache/tilecache.py`
  - **Layers**: `bhuvan_ocm_wbase` (format `image/png`, SRS `EPSG:3857`, maxZoom 8).
  - **Admin Overlay**: `https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms` (`basemap:admin_group_ntl`, SRS `EPSG:3857`).
  - **Known Issue**: The Bhuvan imagery layer currently relies on `bhuvan_ocm_wbase` (an ocean/coastal color mosaic with max zoom 8) overlaid on top of an Esri World Imagery fallback layer rather than the true Bhuvan high-resolution multispectral imagery service from the official NRSC GeoWebCache / WMS endpoint (`bhuvan-vec2.nrsc.gov.in/bhuvan/gwc` or `bhuvan-vec1.nrsc.gov.in/bhuvan/wms`).

---

## 4. Current Marker Implementation
- **Leaflet Engine**:
  - Circle markers instantiated via `L.circleMarker([plotLat, plotLng], { radius: baseRadius, fillColor: color, ... })`.
  - Base radius: 5.5px to 11px depending on risk tier and zoom.
- **MapLibre Engine**:
  - Injects GeoJSON source `bhuvan-projects` with three layered circle styles:
    1. `bhuvan-projects-glow`: Circle radius 8–16px, blur 0.5, opacity 0.45.
    2. `bhuvan-projects-pulse`: Circle radius 4–11px, white circle, opacity 0.95.
    3. `bhuvan-projects-circle`: Circle radius 3–7px, colored by risk tier, 1.2px stroke.
- **Problem**:
  - The combination of `bhuvan-projects-glow` and `bhuvan-projects-pulse` creates large, glowing circular emblems that obscure underlying satellite imagery.
  - In earlier iterations, large `/logo.jpg` or `/icon.png` graphics were referenced in UI components, confusing the display.

---

## 5. Current Coordinate Source
- **Database**: Backend SQLite `projects` table (`backend/sql_app.db`), populated by [backend/app/seed.py](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/backend/app/seed.py#L130-L138).
- **Frontend Master Cache**: [frontend/app/data/geolocations_master.json](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/app/data/geolocations_master.json) (1,981 records).
- In [frontend/app/(dashboard)/map/page.tsx](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/app/(dashboard)/map/page.tsx#L477-L500), the frontend merges live API data with `geolocations_master.json` lookup.

---

## 6. Current 1,981 Project Source
- **Authoritative Dataset**: `ml/data/raw/mospi_paimana_april_2026.csv` (1,981 projects).
  - Schema: `sl_no, ministry, sector, project_name, agency, project_id, legacy_ocms_code, pmgid, state, approval_date_mm_yyyy, start_date_mm_yyyy, original_target_doc_mm_yyyy, revised_target_doc_mm_yyyy, original_cost_crore, revised_cost_crore, cumulative_expenditure_crore, physical_progress_percent, report_month, source_pdf_page`.
  - **Crucial Finding**: The raw MoSPI Flash Report CSV does **NOT** contain native `latitude` or `longitude` columns.
  - Coordinates were derived during pipeline execution via [scripts/rebuild_authoritative_geolocations.py](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/scripts/rebuild_authoritative_geolocations.py) and [scripts/india_authoritative_gazetteer.py](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/scripts/india_authoritative_gazetteer.py).

---

## 7. Current Coordinate Transformation & Artificial Displacements
The codebase contains **two distinct synthetic offset algorithms**:

1. **Client-Side Visual Ring/Spiral Offset (`frontend/app/(dashboard)/map/page.tsx` lines 334–366)**:
   ```typescript
   function getMarkerVisualCoords(lat, lng, idxInGroup, groupSize, zoom): [number, number] {
     if (groupSize <= 1) return [lat, lng];
     if (zoom >= 14) return [lat, lng];
     let remaining = idxInGroup;
     let ring = 1;
     let ringCapacity = 6;
     while (remaining >= ringCapacity) {
       remaining -= ringCapacity;
       ring += 1;
       ringCapacity = 6 * ring;
     }
     const itemsInThisRing = Math.min(ringCapacity, groupSize - itemsBeforeRing);
     const angle = (remaining * 2 * Math.PI) / itemsInThisRing + ring * 0.35;
     const r = Math.min(0.0006 * ring, 0.0022);
     const offsetLat = r * Math.sin(angle);
     const offsetLng = (r * Math.cos(angle)) / cosLat;
     return [lat + offsetLat, lng + offsetLng];
   }
   ```
2. **Offline Data Generation Micro-Diversity Rings (`scripts/rebuild_authoritative_geolocations.py` lines 653–668)**:
   ```python
   # Micro-diversity offset for co-located projects within the same site/district perimeter
   if prior_seen > 0:
       ring = (prior_seen - 1) // 6 + 1
       idx_in_ring = (prior_seen - 1) % 6
       angle = idx_in_ring * (2 * math.pi / 6) + ring * 0.4
       r = min(0.00045 * ring, 0.0018)
       cand_lat = round(final_lat + r * math.sin(angle), 6)
       cand_lng = round(final_lng + (r * math.cos(angle)) / cos_lat, 6)
   ```

---

## 8. Why Markers Appear in the Current Grid / Regular Pattern
1. **Centroid Snapping**: Because raw MoSPI records lack precise GPS coordinates for projects without known facility overrides, the pipeline snapped projects to district gazetteer centers or state centroids (`STATE_CENTROIDS`).
2. **Concentric Radial Dispersal**: When dozens of projects shared the exact same district or state centroid, both the offline script (`rebuild_authoritative_geolocations.py`) and the live map renderer (`getMarkerVisualCoords` in `map/page.tsx`) applied concentric circular rings (`ringCapacity = 6 * ring`).
3. **Resulting Artifact**: Across India, multiple clusters of 6, 12, 18, and 24 points formed regular geometric hexagons/rings radiating outward around district/state centers, creating an artificial, synthetic grid-like appearance on the satellite map.

---

## 9. Exact Files That Must Be Changed

| File | Nature of Change |
| :--- | :--- |
| [`frontend/app/(dashboard)/map/page.tsx`](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/app/(dashboard)/map/page.tsx) | **REMOVE** `getMarkerVisualCoords` artificial spiral/ring displacement. Plot markers strictly at stored `[latitude, longitude]`. Implement true clustering/spiderfy for co-located facilities. Remove oversize glow/pulse circles and replace with compact GIS risk pins. Connect official verified Bhuvan WMS service. Enforce data-driven HUD ("1,981 loaded, X plotted, Y unavailable"). |
| [`frontend/lib/bhuvan-maplibre-style.ts`](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/lib/bhuvan-maplibre-style.ts) | **RECONFIGURE** MapLibre style to connect directly to official Bhuvan WMS / GeoWebCache verified imagery service instead of relying on Esri World Imagery fallback underlay. |
| [`scripts/rebuild_authoritative_geolocations.py`](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/scripts/rebuild_authoritative_geolocations.py) | **REMOVE** synthetic micro-diversity offsets (`site_coord_tracker`) and state-centroid fallback rings. If coordinates cannot be verified, set `location_status = "unavailable"` rather than placing them on fake geometric circles. |
| [`frontend/app/data/geolocations_master.json`](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/frontend/app/data/geolocations_master.json) | **REGENERATE** without synthetic ring offsets, ensuring authentic project coordinates or explicit `"unavailable"` status. |
| [`backend/app/seed.py`](file:///c:/Users/shaha/.gemini/antigravity-ide/scratch/SIH-26/backend/app/seed.py) | **RESYNC** database with cleaned authoritative coordinates and `location_status`. |

---

**AUDIT COMPLETED. STOPPING HERE PER PHASE 1 INSTRUCTIONS FOR USER REVIEW.**
