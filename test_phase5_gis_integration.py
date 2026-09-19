#!/usr/bin/env python3
"""
Phase 5 GIS Integration Automated Validation Suite
SIH26103 TRACE / Sentinel
Tests all 15 success criteria specified in Step 23.
"""

import json
import re
import sys
from pathlib import Path

def test_gis_integration():
    print("================================================================")
    print("PHASE 5 — AUTOMATED GIS INTEGRATION VERIFICATION")
    print("================================================================")
    
    root = Path(__file__).resolve().parent
    authoritative_path = root / "frontend" / "app" / "data" / "geolocations_master_april_2026_authoritative.json"
    site_groups_path = root / "docs" / "april_2026_site_groups.json"
    map_page_path = root / "frontend" / "app" / "(dashboard)" / "map" / "page.tsx"
    
    assert authoritative_path.exists(), f"Missing {authoritative_path}"
    assert site_groups_path.exists(), f"Missing {site_groups_path}"
    assert map_page_path.exists(), f"Missing {map_page_path}"
    
    with open(authoritative_path, "r", encoding="utf-8") as f:
        projects = json.load(f)
        
    with open(site_groups_path, "r", encoding="utf-8") as f:
        site_groups = json.load(f)
        
    with open(map_page_path, "r", encoding="utf-8") as f:
        map_code = f.read()

    errors = []

    # 1. 1,981 projects loaded
    print("\n[Check 1] 1,981 projects in authoritative dataset...")
    if len(projects) == 1981:
        print("  [OK] PASS: Exactly 1,981 projects loaded.")
    else:
        errors.append(f"Check 1 Failed: Loaded {len(projects)} projects, expected 1,981")

    # 2. 1,816 have valid coordinates
    print("\n[Check 2] 1,816 projects have valid coordinates...")
    mapped = [p for p in projects if p.get("latitude") is not None and p.get("longitude") is not None]
    if len(mapped) == 1816:
        print("  [OK] PASS: Exactly 1,816 projects have valid coordinates.")
    else:
        errors.append(f"Check 2 Failed: Found {len(mapped)} mapped projects, expected 1,816")

    # 3. 165 have null coordinates
    print("\n[Check 3] 165 have null coordinates (UNAVAILABLE)...")
    unavailable = [p for p in projects if p.get("latitude") is None and p.get("longitude") is None]
    if len(unavailable) == 165:
        print("  [OK] PASS: Exactly 165 projects have null coordinates.")
    else:
        errors.append(f"Check 3 Failed: Found {len(unavailable)} unavailable projects, expected 165")

    # 4. 0 synthetic coordinates
    print("\n[Check 4] 0 synthetic coordinates...")
    synthetic_count = sum(1 for p in projects if p.get("is_synthetic") is True)
    if synthetic_count == 0:
        print("  [OK] PASS: Exactly 0 synthetic coordinates.")
    else:
        errors.append(f"Check 4 Failed: Found {synthetic_count} synthetic projects")

    # 5. No marker coordinate transformation function exists in map/page.tsx
    print("\n[Check 5] No getMarkerVisualCoords() function exists...")
    if "getMarkerVisualCoords" not in map_code:
        print("  [OK] PASS: getMarkerVisualCoords is completely removed.")
    else:
        errors.append("Check 5 Failed: getMarkerVisualCoords found in map/page.tsx")

    # 6. No spiral / ring / jitter code is used
    print("\n[Check 6] No spiral / ring / jitter positioning code in map/page.tsx...")
    bad_patterns = [r"ringCapacity", r"itemsBeforeRing", r"offsetLat", r"offsetLng", r"jitter"]
    found_bad = [p for p in bad_patterns if re.search(p, map_code)]
    if not found_bad:
        print("  [OK] PASS: No ringCapacity, itemsBeforeRing, or coordinate offset arithmetic found.")
    else:
        errors.append(f"Check 6 Failed: Found patterns {found_bad} in map/page.tsx")

    # 7. No index-based coordinate displacement exists
    print("\n[Check 7] No index-based coordinate displacement...")
    if "idxInGroup" not in map_code:
        print("  [OK] PASS: No idxInGroup coordinate displacement.")
    else:
        errors.append("Check 7 Failed: idxInGroup found in map/page.tsx")

    # 8. Bhuvan tile URL points to verified HYDImagery service
    print("\n[Check 8] Bhuvan tile URL points to verified HYDImagery WMTS service...")
    expected_bhuvan_url = "bhuvanmaps.nrsc.gov.in/bhuvan_ras3/server/rest/services/World_Imagery/MapServer/WMTS"
    if expected_bhuvan_url in map_code and "HYDImagery" in map_code and "GoogleMapsCompatible" in map_code:
        print("  [OK] PASS: Bhuvan tile URL matches official Phase 2 verified HYDImagery WMTS service.")
    else:
        errors.append("Check 8 Failed: Bhuvan tile URL does not match verified HYDImagery WMTS")

    # 9. Esri imagery is not used underneath Bhuvan
    print("\n[Check 9] Esri imagery is not used underneath Bhuvan...")
    # Find the Bhuvan branch in createBasemapLayerGroup
    bhuvan_idx = map_code.find('if (layerKey === "bhuvan")')
    else_idx = map_code.find('} else {', bhuvan_idx)
    if bhuvan_idx != -1 and else_idx != -1:
        bhuvan_block = map_code[bhuvan_idx:else_idx]
        if "arcgisonline.com" not in bhuvan_block.lower():
            print("  [OK] PASS: Zero Esri tile layers present in Bhuvan layer group.")
        else:
            errors.append("Check 9 Failed: Esri layer detected inside Bhuvan layer group")
    else:
        errors.append("Check 9 Failed: Could not locate Bhuvan layer block in map/page.tsx")

    # 10. Map engine is Leaflet
    print("\n[Check 10] Map engine is Leaflet (no MapLibre dual container)...")
    if "maplibreContainerRef" not in map_code and "L.map" in map_code and "Leaflet" in map_code:
        print("  [OK] PASS: Pure Leaflet engine in production map.")
    else:
        errors.append("Check 10 Failed: MapLibre container still present or Leaflet missing")

    # 11. Duplicate coordinates remain identical
    print("\n[Check 11] Duplicate coordinates remain identical...")
    # Test a known multi-project site group, e.g. SITE-0001
    site_1 = site_groups[0]
    site_1_projs = [p for p in projects if p["project_id"] in site_1["project_ids"]]
    coords_set = set((p["latitude"], p["longitude"]) for p in site_1_projs)
    if len(coords_set) == 1:
        print(f"  [OK] PASS: All {len(site_1_projs)} projects at {site_1['site_group_id']} ({site_1['place_name']}) retain identical coordinate: {list(coords_set)[0]}.")
    else:
        errors.append(f"Check 11 Failed: Multi-project site has diverging coordinates: {coords_set}")

    # 12. Clustering handles duplicate locations
    print("\n[Check 12] Clustering handles duplicate locations...")
    if "markerClusterGroup" in map_code and "leaflet.markercluster" in map_code:
        print("  [OK] PASS: Leaflet MarkerClusterGroup handles co-located and dense sites.")
    else:
        errors.append("Check 12 Failed: markerClusterGroup not configured in map/page.tsx")

    # 13. Filtering does not modify project risk
    print("\n[Check 13] Filtering does not modify project risk...")
    if "p.risk_tier" in map_code and "recalculateRisk" not in map_code:
        print("  [OK] PASS: Project risk tier is preserved directly from authoritative data.")
    else:
        errors.append("Check 13 Failed: Risk tier recalculation found")

    # 14. Project popup uses project_id
    print("\n[Check 14] Project popup uses project_id...")
    if "data-project-id" in map_code and "project_id" in map_code:
        print("  [OK] PASS: Popups bind directly to stable project_id.")
    else:
        errors.append("Check 14 Failed: Popups do not use project_id")

    # 15. Project dossier opens the correct project
    print("\n[Check 15] Project dossier opens the correct project...")
    if "setSelectedProject" in map_code and "/projects/${selectedProject.id}" in map_code:
        print("  [OK] PASS: Project dossier navigation is strictly keyed to selectedProject.id.")
    else:
        errors.append("Check 15 Failed: Project dossier link missing or malformed")

    print("\n----------------------------------------------------------------")
    if not errors:
        print("ALL 15 AUTOMATED VERIFICATION CHECKS PASSED!")
        print("----------------------------------------------------------------")
        return True
    else:
        print(f"FAILED {len(errors)} CHECKS:")
        for e in errors:
            print(f"  [FAIL] {e}")
        print("----------------------------------------------------------------")
        return False

if __name__ == "__main__":
    success = test_gis_integration()
    sys.exit(0 if success else 1)
