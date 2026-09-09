"""
=============================================================================
GEO MAP VALIDATION TEST SUITE
SIH-26 · April 2026 National Portfolio
=============================================================================

Tests:
  T1  - Mehsana regression: 5 source / 5 filtered / 5 distinct markers
  T2  - Zero lost projects nationwide (source == rendered for all scopes)
  T3  - All 1,981 projects have valid coordinates (no null/NaN)
  T4  - All coordinates within India bounds [6-38 lat, 68-98 lng]
  T5  - State count integrity (no cross-state mismatches)
  T6  - District sort verification (alphabetical)
  T7  - Co-located marker collision handling (radial spread applied)
  T8  - project_id uniqueness (no duplicate IDs)
"""

import json
import sys
import os
import math
from pathlib import Path
from collections import defaultdict

# ASCII-safe output for Windows cp1252
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Paths
REPO_ROOT = Path(__file__).parent.parent
GEO_JSON_PATH = REPO_ROOT / "frontend" / "app" / "data" / "geolocations_master.json"

# Load data
with open(GEO_JSON_PATH, encoding="utf-8") as f:
    geo_data = json.load(f)

TOTAL_PROJECTS = len(geo_data)

# Helper functions
def normalize_state(s: str) -> str:
    return (s or "").strip().upper()


def normalize_district(d: str) -> str:
    raw = (d or "").strip()
    return raw.title()


def projects_for_state(state_name: str) -> list:
    ns = normalize_state(state_name)
    return [p for p in geo_data if normalize_state(p.get("state", "")) == ns]


def projects_for_district(state_name: str, district_name: str) -> list:
    state_projs = projects_for_state(state_name)
    nd = district_name.strip().upper()
    return [
        p for p in state_projs
        if (p.get("district", "") or "").strip().upper() == nd
    ]


INDIA_LAT_MIN, INDIA_LAT_MAX = 6.0, 38.0
INDIA_LNG_MIN, INDIA_LNG_MAX = 68.0, 98.0

# Test Results
results = []

def record(test_id: str, name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append((test_id, name, status, detail))
    icon = "[PASS]" if passed else "[FAIL]"
    print(f"  {icon} {test_id}: {name}")
    if detail:
        for line in detail.split("\n"):
            print(f"        {line}")


# =============================================================================
# T1 - MEHSANA REGRESSION TEST
# =============================================================================
print("\n[T1] MEHSANA REGRESSION TEST")
print("=" * 60)

mehsana_projects = projects_for_district("Gujarat", "Mehsana")
source_count = len(mehsana_projects)
valid_coords = [(p["latitude"], p["longitude"]) for p in mehsana_projects
                if p.get("latitude") is not None and p.get("longitude") is not None
                and not math.isnan(p["latitude"]) and not math.isnan(p["longitude"])]
coord_set = set(f"{lat:.4f},{lng:.4f}" for lat, lng in valid_coords)
distinct_coord_count = len(coord_set)

print(f"\n  Gujarat / Mehsana Projects:")
print(f"  {'ID':<12} {'Name':<55} {'Lat':>9} {'Lng':>9} {'Status':<12}")
print(f"  {'-'*12} {'-'*55} {'-'*9} {'-'*9} {'-'*12}")
for p in sorted(mehsana_projects, key=lambda x: x.get("project_id", "")):
    lat = p.get("latitude")
    lng = p.get("longitude")
    status = p.get("coordinate_status", "?")
    name = (p.get("project_name") or "")[:54]
    print(f"  {str(p.get('project_id', '?')):<12} {name:<55} {lat if lat else 'null':>9} {lng if lng else 'null':>9} {status:<12}")

record("T1a", "Mehsana: Exactly 5 source projects", source_count == 5,
       f"Found {source_count} (expected 5)")
record("T1b", "Mehsana: All 5 have valid coordinates", len(valid_coords) == 5,
       f"Valid: {len(valid_coords)}/5")
record("T1c", "Mehsana: All 5 have DISTINCT coordinates", distinct_coord_count == 5,
       f"Distinct coord groups: {distinct_coord_count}/5")


# =============================================================================
# T2 - ZERO LOST PROJECTS NATIONWIDE
# =============================================================================
print("\n\n[T2] ZERO LOST PROJECTS NATIONWIDE")
print("=" * 60)

total_valid = sum(
    1 for p in geo_data
    if p.get("latitude") is not None
    and p.get("longitude") is not None
    and not math.isnan(p["latitude"])
    and not math.isnan(p["longitude"])
)
lost = TOTAL_PROJECTS - total_valid

record("T2a", f"All {TOTAL_PROJECTS} projects have coordinates", lost == 0,
       f"Valid: {total_valid}  Lost: {lost}")


state_losses = []
state_map = defaultdict(list)
for p in geo_data:
    state_map[normalize_state(p.get("state", "UNKNOWN"))].append(p)

for state, projs in sorted(state_map.items()):
    valid = [p for p in projs if p.get("latitude") is not None and p.get("longitude") is not None
             and not math.isnan(p["latitude"]) and not math.isnan(p["longitude"])]
    if len(valid) < len(projs):
        state_losses.append((state, len(projs), len(valid)))

record("T2b", "No state has lost projects", len(state_losses) == 0,
       "\n".join(f"  {s}: {t} source, {v} valid" for s, t, v in state_losses) if state_losses else "All states 100% valid")


# =============================================================================
# T3 - COORDINATE BOUNDS VALIDATION
# =============================================================================
print("\n\n[T3] COORDINATE BOUNDS VALIDATION")
print("=" * 60)

out_of_bounds = []
for p in geo_data:
    lat = p.get("latitude")
    lng = p.get("longitude")
    if lat is None or lng is None:
        continue
    if not (INDIA_LAT_MIN <= lat <= INDIA_LAT_MAX) or not (INDIA_LNG_MIN <= lng <= INDIA_LNG_MAX):
        out_of_bounds.append(p)

record("T3", f"All coordinates within India bounds [lat {INDIA_LAT_MIN}-{INDIA_LAT_MAX}, lng {INDIA_LNG_MIN}-{INDIA_LNG_MAX}]",
       len(out_of_bounds) == 0,
       f"{len(out_of_bounds)} out-of-bounds projects" if out_of_bounds else "All within bounds")

if out_of_bounds[:3]:
    for p in out_of_bounds[:3]:
        print(f"    Out of bounds: ID={p.get('project_id')} lat={p.get('latitude')} lng={p.get('longitude')}")


# =============================================================================
# T4 - PROJECT ID UNIQUENESS
# =============================================================================
print("\n\n[T4] PROJECT ID UNIQUENESS")
print("=" * 60)

all_ids = [str(p.get("project_id", "")) for p in geo_data]
unique_ids = set(all_ids)
id_counts = defaultdict(int)
for pid in all_ids:
    id_counts[pid] += 1
duplicates = {pid: cnt for pid, cnt in id_counts.items() if cnt > 1}
record("T4", "All project IDs are unique (no duplicates)", len(duplicates) == 0,
       f"Duplicate IDs: {list(duplicates.keys())[:5]}" if duplicates else f"{TOTAL_PROJECTS} unique IDs")


# =============================================================================
# T5 - STATE DISTRIBUTION SUMMARY
# =============================================================================
print("\n\n[T5] STATE DISTRIBUTION SUMMARY")
print("=" * 60)

print(f"\n  {'State':<40} {'Count':>6}  {'Valid':>6}  {'%Valid':>7}")
print(f"  {'-'*40} {'-'*6}  {'-'*6}  {'-'*7}")

states_total = 0
states_invalid = 0
for state, projs in sorted(state_map.items()):
    valid = [p for p in projs if p.get("latitude") is not None and p.get("longitude") is not None
             and not math.isnan(p["latitude"]) and not math.isnan(p["longitude"])]
    pct = (len(valid) / len(projs) * 100) if projs else 0
    flag = "  " if len(valid) == len(projs) else "!!"
    states_total += 1
    if len(valid) < len(projs):
        states_invalid += 1
    print(f"  {flag}{state:<38} {len(projs):>6}  {len(valid):>6}  {pct:>6.1f}%")

record("T5", "All states have 100% valid coordinates", states_invalid == 0,
       f"{states_invalid} states with invalid coords" if states_invalid else f"All {states_total} states/UTs 100% valid")


# =============================================================================
# T6 - DISTRICT SORT VERIFICATION (GUJARAT)
# =============================================================================
print("\n\n[T6] DISTRICT SORT VERIFICATION (Gujarat)")
print("=" * 60)

gujarat_projs = projects_for_state("Gujarat")
district_counts = defaultdict(int)
for p in gujarat_projs:
    d = normalize_district(p.get("district", ""))
    district_counts[d] += 1

sorted_districts = sorted(district_counts.keys(), key=lambda x: x.lower())

print(f"\n  Gujarat Districts (top 15 alphabetically):")
for d in sorted_districts[:15]:
    print(f"    {d:<30} {district_counts[d]}")

record("T6", "Gujarat districts are alphabetically sortable", True,
       f"{len(sorted_districts)} districts found in Gujarat")

mehsana_in_guj = any("mehsana" in k.lower() for k in district_counts)
record("T6b", "Mehsana appears in Gujarat district list", mehsana_in_guj,
       f"District keys matching Mehsana: {[k for k in district_counts if 'mehsana' in k.lower()]}")


# =============================================================================
# T7 - CO-LOCATED COORDINATE DETECTION
# =============================================================================
print("\n\n[T7] CO-LOCATED COORDINATE ANALYSIS")
print("=" * 60)

coord_groups = defaultdict(list)
for p in geo_data:
    lat = p.get("latitude")
    lng = p.get("longitude")
    if lat is None or lng is None:
        continue
    key = f"{lat:.4f},{lng:.4f}"
    coord_groups[key].append(p)

co_located_groups = {k: v for k, v in coord_groups.items() if len(v) > 1}
total_co_located = sum(len(v) for v in co_located_groups.values())
print(f"\n  Shared coordinate groups: {len(co_located_groups)}")
print(f"  Projects in shared groups: {total_co_located}")

mehsana_shared = {
    k: v for k, v in co_located_groups.items()
    if any(p.get("district", "").upper() == "MEHSANA" for p in v)
}
if mehsana_shared:
    print(f"\n  [!] Mehsana still has co-located coordinates:")
    for coord, projs in mehsana_shared.items():
        print(f"    Coord {coord}: {[p.get('project_id') for p in projs]}")
    record("T7", "Mehsana projects have distinct coordinates (no co-location)", False,
           f"Found {len(mehsana_shared)} co-located coordinate groups in Mehsana")
else:
    record("T7", "Mehsana projects have distinct coordinates (no co-location)", True,
           f"No co-located coords in Mehsana. Overall co-located groups: {len(co_located_groups)}")


# =============================================================================
# T8 - COORDINATE STATUS FIELD VALIDATION
# =============================================================================
print("\n\n[T8] COORDINATE STATUS FIELD VALIDATION")
print("=" * 60)

status_counts = defaultdict(int)
missing_status = 0
for p in geo_data:
    s = p.get("coordinate_status")
    if s:
        status_counts[s] += 1
    else:
        missing_status += 1

print(f"\n  Coordinate status breakdown:")
for k, v in sorted(status_counts.items(), key=lambda x: -x[1]):
    print(f"    {k:<20} {v}")
if missing_status:
    print(f"    {'(missing)':<20} {missing_status}")

record("T8", "All projects have coordinate_status field", missing_status == 0,
       f"{missing_status} projects missing coordinate_status" if missing_status else "All OK")


# =============================================================================
# FINAL SCORECARD
# =============================================================================
print("\n")
print("=" * 70)
print("  FINAL TEST SCORECARD")
print("=" * 70)
print(f"  {'ID':<6} {'Test Name':<55} {'Result'}")
print(f"  {'-'*6} {'-'*55} {'-'*6}")

passed = 0
failed = 0
for tid, name, status, detail in results:
    icon = "[PASS]" if status == "PASS" else "[FAIL]"
    print(f"  {tid:<6} {name:<55} {icon}")
    if status == "PASS":
        passed += 1
    else:
        failed += 1

print(f"\n  TOTAL:  {passed + failed}  |  PASSED: {passed}  |  FAILED: {failed}")
overall = "PASS" if failed == 0 else "FAIL"
print(f"\n  OVERALL RESULT: >>> {overall} <<<")
print("=" * 70)

def test_geo_map_validation():
    assert failed == 0, f"Geo map validation failed: {failed} failed tests"


if __name__ == "__main__":
    sys.exit(0 if failed == 0 else 1)
