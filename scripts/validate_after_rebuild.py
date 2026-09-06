#!/usr/bin/env python3
"""
scripts/validate_after_rebuild.py
===================================
Post-rebuild validation for all 1,981 April 2026 project geolocations.
Produces the Para-51 Final Report and exits 0 on PASS, 1 on FAIL.

Usage:
  python scripts/validate_after_rebuild.py
"""

import sqlite3, json, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "sql_app.db"
GEO_MASTER = ROOT / "frontend" / "app" / "data" / "geolocations_master.json"

INDIA_LAT_MIN, INDIA_LAT_MAX = 7.0, 38.0
INDIA_LNG_MIN, INDIA_LNG_MAX = 68.0, 98.0
MEHSANA_PROJECT_KEYWORDS = ["mehsana","santalpur","visnagar","kadi","palanpur"]


def check(label, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    mark = "[OK]" if passed else "[FAIL]"
    print(f"  {mark} {label}")
    if detail:
        print(f"       {detail}")
    return passed


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    rows = conn.execute("SELECT * FROM project_geolocations").fetchall()
    total = len(rows)

    print("="*72)
    print("PRISM Geo Rebuild -- Post-Rebuild Validation Report")
    print(f"  DB: {DB_PATH}")
    print(f"  Total rows: {total}")
    print("="*72)

    fails = []

    # 1. Total count
    ok = check("Total = 1,981", total == 1981, f"Got {total}")
    if not ok: fails.append("total_count")

    # 2. No null coordinates
    null_coords = [r["project_name"] for r in rows
                   if r["latitude"] is None or r["longitude"] is None]
    ok = check("Null coordinates = 0", len(null_coords) == 0,
               f"{len(null_coords)} nulls: {null_coords[:3]}")
    if not ok: fails.append("null_coordinates")

    # 3. All inside India bounds
    out_of_bounds = [r["project_name"] for r in rows if r["latitude"] is not None
                     and not (INDIA_LAT_MIN <= float(r["latitude"]) <= INDIA_LAT_MAX
                              and INDIA_LNG_MIN <= float(r["longitude"]) <= INDIA_LNG_MAX)]
    ok = check("All coordinates inside India bounds", len(out_of_bounds) == 0,
               f"{len(out_of_bounds)} out-of-bounds: {out_of_bounds[:3]}")
    if not ok: fails.append("out_of_bounds")

    # 4. No "Administrative Center" fake districts
    admin_fake = [r["project_name"] for r in rows
                  if r["district"] and "Administrative" in str(r["district"])]
    ok = check("No 'Administrative Center' fake districts", len(admin_fake) == 0,
               f"{len(admin_fake)} remaining: {admin_fake[:3]}")
    if not ok: fails.append("admin_districts")

    # 5. manual_verified entries preserved
    mv_rows = [r for r in rows if r["coordinate_source"] == "manual_verified"]
    ok = check("manual_verified count = 5", len(mv_rows) == 5,
               f"Got {len(mv_rows)}")
    if not ok: fails.append("manual_verified")

    # 6. Mehsana test -- Gujarat Mehsana projects
    mehsana_rows = [r for r in rows
                    if str(r["state"]).upper() == "GUJARAT"
                    and any(kw in str(r["project_name"]).lower() for kw in MEHSANA_PROJECT_KEYWORDS)]
    mehsana_ok = all(r["coordinate_source"] == "manual_verified" or
                     (r["latitude"] is not None and
                      21.0 <= float(r["latitude"]) <= 25.0 and
                      70.0 <= float(r["longitude"]) <= 74.0)
                     for r in mehsana_rows)
    ok = check(f"Mehsana Gujarat projects geocoded correctly ({len(mehsana_rows)} found)",
               mehsana_ok)
    if not ok: fails.append("mehsana")

    # 7. Bihar -- no more shared Patna centroid for non-Patna districts
    bihar_rows = [r for r in rows if str(r["state"]).upper() == "BIHAR"]
    patna_centroid = sum(1 for r in bihar_rows
                         if r["latitude"] and abs(float(r["latitude"]) - 25.5941) < 0.01
                         and r["district"] and "PATNA" not in str(r["district"]).upper())
    ok = check("Bihar: non-Patna projects not all at Patna centroid",
               patna_centroid < 10,
               f"{patna_centroid} non-Patna Bihar projects at Patna centroid")
    if not ok: fails.append("bihar_centroid")

    # 8. Sikkim -- at least 3 distinct coordinate pairs
    sikkim_rows = [r for r in rows if str(r["state"]).upper() == "SIKKIM"]
    sikkim_coords = set((round(float(r["latitude"]),2), round(float(r["longitude"]),2))
                        for r in sikkim_rows if r["latitude"])
    ok = check(f"Sikkim: >= 3 distinct coordinate pairs ({len(sikkim_coords)} unique)",
               len(sikkim_coords) >= 3)
    if not ok: fails.append("sikkim_diversity")

    # 9. Coordinate status distribution
    exact_count = sum(1 for r in rows if r["coordinate_status"] == "exact")
    approx_count = sum(1 for r in rows if r["coordinate_status"] == "approximate")
    exact_pct = exact_count / total * 100 if total else 0
    ok = check(f"exact >= 60% (currently {exact_pct:.1f}%: {exact_count} exact, {approx_count} approx)",
               exact_pct >= 60.0)
    if not ok: fails.append("exact_pct")

    # 10. geolocations_master.json matches DB
    if GEO_MASTER.exists():
        master = json.loads(GEO_MASTER.read_text(encoding="utf-8"))
        ok = check(f"geolocations_master.json count = {total}",
                   len(master) == total,
                   f"JSON has {len(master)}, DB has {total}")
        if not ok: fails.append("json_count_mismatch")
    else:
        ok = check("geolocations_master.json exists", False, "FILE NOT FOUND")
        fails.append("json_missing")

    # ── Source breakdown ──────────────────────────────────────────────────────
    print("\n  Source Distribution:")
    from collections import Counter
    src_counts = Counter(r["coordinate_source"] for r in rows)
    for src, cnt in sorted(src_counts.items(), key=lambda x:-x[1]):
        print(f"    {src:28s}: {cnt:4d} ({cnt/total*100:5.1f}%)")

    print("\n  Resolution Level Distribution:")
    lvl_counts = Counter(r["location_resolution_level"] for r in rows)
    for lvl, cnt in sorted(lvl_counts.items(), key=lambda x:-x[1]):
        print(f"    {lvl:28s}: {cnt:4d} ({cnt/total*100:5.1f}%)")

    conn.close()

    # ── Final verdict ─────────────────────────────────────────────────────────
    print("\n" + "="*72)
    if not fails:
        print("OVERALL: PASS -- All invariants satisfied")
        print("="*72)
        sys.exit(0)
    else:
        print(f"OVERALL: FAIL -- {len(fails)} invariant(s) failed: {fails}")
        print("="*72)
        sys.exit(1)


if __name__ == "__main__":
    main()
