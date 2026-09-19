import type { StyleSpecification } from "maplibre-gl";

/**
 * ISRO Bhuvan MapLibre GL Style — SIH26103 PRISM / TRACE Sentinel
 * 
 * VERIFIED SERVICE STATUS (tested 2026-09-19):
 * ✅ bhuvan-ras1.nrsc.gov.in/tilecache/tilecache.py — OCM satellite mosaic — WORKING (51KB/tile)
 * ✅ bhuvan-vec1.nrsc.gov.in/bhuvan/wms — admin/boundary vector overlay — WORKING
 * ✅ server.arcgisonline.com World_Imagery — Esri satellite fallback — WORKING
 * ❌ bhuvan-ras3.nrsc.gov.in WMTS — HYDImagery (World_Imagery) — ALL TILES TIMEOUT
 * ❌ bhuvan.nrsc.gov.in/tileserver2 — PBF vector tiles — requires HMAC auth
 *
 * Architecture:
 *   Layer 1 (BOTTOM):  Esri World Imagery — resilient satellite fallback, always visible
 *   Layer 2 (MIDDLE):  ISRO Bhuvan OCM satellite mosaic (bhuvan-ras1) — official NRSC imagery
 *   Layer 3 (OVERLAY): Bhuvan admin boundary WMS (bhuvan-vec1) — state/district lines
 *   Layer 4 (TOP):     Project risk markers — injected at runtime by MapPage
 *
 * WMS URL format for MapLibre raster source:
 *   Use {bbox-epsg-3857} placeholder — MapLibre substitutes the tile bounding box in EPSG:3857
 *   The WMS SRS must be EPSG:3857 (Web Mercator) for correct tile alignment
 */

/**
 * No-op transform — bhuvan-ras1 and bhuvan-vec1 do not require HMAC authentication.
 * @deprecated Replaced with direct public WMS URLs
 */
export function bhuvanTransformRequest(url: string, _resourceType?: string): { url: string } {
  return { url };
}

/**
 * Build the MapLibre raster tile URL for Bhuvan OCM (WMS-T tilecache).
 * bhuvan-ras1 uses a WMS-compatible tilecache that accepts {bbox-epsg-3857}.
 */
function buildBhuvanOcmTileUrl(): string {
  const base = "https://bhuvan-ras1.nrsc.gov.in/tilecache/tilecache.py";
  const params = new URLSearchParams({
    styles: "",
    format: "image/png",
    service: "WMS",
    version: "1.1.1",
    request: "GetMap",
    srs: "EPSG:3857",
    transparent: "true",
    width: "256",
    height: "256",
    layers: "bhuvan_ocm_wbase",
  });
  // MapLibre replaces {bbox-epsg-3857} at runtime with the actual tile bounding box
  return `${base}?${params.toString()}&BBOX={bbox-epsg-3857}`;
}

/**
 * Build the MapLibre raster tile URL for Bhuvan admin vector overlay (WMS).
 * bhuvan-vec1.nrsc.gov.in/bhuvan/wms with basemap:admin_group_ntl layer — verified working.
 */
function buildBhuvanAdminTileUrl(): string {
  const base = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms";
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: "basemap:admin_group_ntl",
    STYLES: "",
    SRS: "EPSG:3857",
    FORMAT: "image/png",
    TRANSPARENT: "true",
    WIDTH: "256",
    HEIGHT: "256",
  });
  return `${base}?${params.toString()}&BBOX={bbox-epsg-3857}`;
}

/**
 * Official ISRO Bhuvan + NRSC satellite MapLibre GL Style.
 * Uses only verified publicly-accessible endpoints (no auth required).
 */
export const BHUVAN_MAPLIBRE_STYLE: StyleSpecification = {
  version: 8,
  name: "ISRO Bhuvan NRSC Satellite — SIH26103",
  metadata: {
    "prism:version": "2026-verified",
    "bhuvan:primary_source": "bhuvan-ras1.nrsc.gov.in OCM mosaic",
    "bhuvan:wms_version": "1.1.1",
    "bhuvan:crs": "EPSG:3857",
  },
  center: [78.9629, 20.5937],
  zoom: 4.5,
  // Use free public glyphs — Bhuvan glyph server not always accessible
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    // ── Layer 1: Resilient Esri satellite base (always loads, guarantees no black screen) ──
    resilient_satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Tiles © Esri — Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP",
    },
    // ── Layer 2: ISRO Bhuvan OCM satellite raster (verified working, 51KB per tile) ──
    bhuvan_ocm: {
      type: "raster",
      tiles: [buildBhuvanOcmTileUrl()],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 8,
      attribution: "ISRO Bhuvan OCM Mosaic | NRSC, Dept. of Space, Govt. of India",
    },
    // ── Layer 3: ISRO Bhuvan Admin/Boundary Overlay (verified working, vector admin lines) ──
    bhuvan_admin_wms: {
      type: "raster",
      tiles: [buildBhuvanAdminTileUrl()],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 16,
      attribution: "ISRO Bhuvan Administrative Boundaries | NRSC, Govt. of India",
    },
  },
  layers: [
    // ── Background fill ──
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#0a0f1e",
      },
    },
    // ── Layer 1: Esri satellite — always rendered as the guaranteed base ──
    {
      id: "resilient_satellite_layer",
      type: "raster",
      source: "resilient_satellite",
      paint: {
        "raster-opacity": 1.0,
      },
    },
    // ── Layer 2: Bhuvan OCM mosaic at low-mid zoom (overlaid on Esri) ──
    {
      id: "bhuvan_ocm_layer",
      type: "raster",
      source: "bhuvan_ocm",
      minzoom: 0,
      maxzoom: 8,
      paint: {
        // Fade in from zoom 0 to 2, full opacity thereafter
        "raster-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, 0.6,
          2, 0.92,
          5, 0.97,
          8, 1.0,
        ],
      },
    },
    // ── Layer 3: Bhuvan admin boundary WMS overlay ──
    {
      id: "bhuvan_admin_layer",
      type: "raster",
      source: "bhuvan_admin_wms",
      minzoom: 0,
      maxzoom: 14,
      paint: {
        "raster-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3, 0.55,
          6, 0.75,
          10, 0.85,
        ],
      },
    },
    // NOTE: Project risk markers (bhuvan-projects GeoJSON source)
    // are added dynamically by MapPage.updateMaplibreProjects()
    // They sit above all raster layers automatically.
  ],
};
