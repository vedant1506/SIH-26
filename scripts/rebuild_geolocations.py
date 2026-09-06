#!/usr/bin/env python3
"""
scripts/rebuild_geolocations.py
================================
Full rebuild pipeline for all 1,981 April 2026 project geolocations.

Strategy (per project):
  Priority 1: Nominatim -- project_name + place + district + state + India
  Priority 2: Nominatim -- place + district + state + India
  Priority 3: Nominatim -- district + state + India
  Priority 4: Keyword lookup from resolved_state_districts.json
  Priority 5: State centroid

Usage:
  python scripts/rebuild_geolocations.py [--dry-run] [--limit N] [--skip-nominatim]
"""

import sqlite3, json, time, os, sys, re, argparse, requests
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "sql_app.db"
CACHE_PATH = ROOT / "scratch" / "geocode_cache.json"
DISTRICT_DATA_PATH = ROOT / "scratch" / "resolved_state_districts.json"
GEO_MASTER_OUT = ROOT / "frontend" / "app" / "data" / "geolocations_master.json"

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {"User-Agent": "SIH26103-PRISM-GeoRebuild/1.0 (contact@sih26103.in)"}
RATE_LIMIT_SLEEP = 1.1

INDIA_LAT_MIN, INDIA_LAT_MAX = 7.0, 38.0
INDIA_LNG_MIN, INDIA_LNG_MAX = 68.0, 98.0

STATE_CENTROIDS = {
    "ANDHRA PRADESH": (15.9129, 79.7400), "ARUNACHAL PRADESH": (28.2180, 94.7278),
    "ASSAM": (26.2006, 92.9376), "BIHAR": (25.0961, 85.3131),
    "CHANDIGARH": (30.7333, 76.7794), "CHHATTISGARH": (21.2787, 81.8661),
    "DADRA & NAGAR HAVELI AND DAMAN & DIU": (20.1809, 73.0169), "DELHI": (28.7041, 77.1025),
    "GOA": (15.2993, 74.1240), "GUJARAT": (22.2587, 71.1924),
    "HARYANA": (29.0588, 76.0856), "HIMACHAL PRADESH": (31.1048, 77.1734),
    "JAMMU & KASHMIR": (33.7782, 76.5762), "JHARKHAND": (23.6102, 85.2799),
    "KARNATAKA": (15.3173, 75.7139), "KERALA": (10.8505, 76.2711),
    "LADAKH": (34.1526, 77.5771), "LAKSHADWEEP": (10.5667, 72.6417),
    "MADHYA PRADESH": (22.9734, 78.6569), "MAHARASHTRA": (19.7515, 75.7139),
    "MANIPUR": (24.6637, 93.9063), "MEGHALAYA": (25.4670, 91.3662),
    "MIZORAM": (23.1645, 92.9376), "NAGALAND": (26.1584, 94.5624),
    "ODISHA": (20.9517, 85.0985), "PUDUCHERRY": (11.9416, 79.8083),
    "PUNJAB": (31.1471, 75.3412), "RAJASTHAN": (27.0238, 74.2179),
    "SIKKIM": (27.5330, 88.5122), "TAMIL NADU": (11.1271, 78.6569),
    "TELANGANA": (18.1124, 79.0193), "TRIPURA": (23.9408, 91.9882),
    "UTTAR PRADESH": (26.8467, 80.9462), "UTTARAKHAND": (30.0668, 79.0193),
    "WEST BENGAL": (22.9868, 87.8550), "ANDAMAN & NICOBAR": (11.7401, 92.6586),
    "MULTI-STATE": (23.5000, 78.0000), "OFFSHORE": (19.0000, 72.0000),
}

DISTRICT_CENTROIDS = {
    ("BIHAR","PATNA"):(25.5941,85.1376), ("BIHAR","GAYA"):(24.7914,85.0002),
    ("BIHAR","MUZAFFARPUR"):(26.1209,85.3647), ("BIHAR","BHAGALPUR"):(25.2425,87.0139),
    ("BIHAR","DARBHANGA"):(26.1542,85.8918), ("BIHAR","BEGUSARAI"):(25.4184,86.1272),
    ("BIHAR","VAISHALI"):(25.7144,85.2091), ("BIHAR","NALANDA"):(25.1315,85.4476),
    ("BIHAR","ROHTAS"):(24.9935,84.0022), ("BIHAR","ARWAL"):(25.2500,84.6800),
    ("BIHAR","JEHANABAD"):(25.2122,84.9891), ("BIHAR","AURANGABAD"):(24.7519,84.3740),
    ("BIHAR","NAWADA"):(24.8876,85.5410), ("BIHAR","MUNGER"):(25.3722,86.4734),
    ("BIHAR","JAMUI"):(24.9264,86.2243), ("BIHAR","BANKA"):(24.8840,86.9184),
    ("BIHAR","SAHARSA"):(25.8784,86.5953), ("BIHAR","SUPAUL"):(26.1219,86.5992),
    ("BIHAR","MADHEPURA"):(25.9258,87.0118), ("BIHAR","SITAMARHI"):(26.5912,85.4891),
    ("BIHAR","SHEOHAR"):(26.5218,85.2994), ("BIHAR","EAST CHAMPARAN"):(26.6580,84.9100),
    ("BIHAR","WEST CHAMPARAN"):(27.0000,84.3667), ("BIHAR","GOPALGANJ"):(26.4674,84.4391),
    ("BIHAR","SIWAN"):(26.2246,84.3563), ("BIHAR","BHOJPUR"):(25.5702,84.4616),
    ("BIHAR","BUXAR"):(25.5647,83.9680), ("BIHAR","KAIMUR"):(25.0489,83.5834),
    ("BIHAR","PURNIA"):(25.7771,87.4753), ("BIHAR","KATIHAR"):(25.5394,87.5667),
    ("BIHAR","KISHANGANJ"):(26.1020,87.9421), ("BIHAR","ARARIA"):(26.1482,87.4735),
    ("BIHAR","MADHUBANI"):(26.3568,86.0712), ("BIHAR","SARAN"):(25.9257,84.8783),
    ("BIHAR","SHEIKHPURA"):(25.1403,85.8527), ("BIHAR","LAKHISARAI"):(25.1550,86.0865),
    ("SIKKIM","EAST SIKKIM"):(27.3389,88.6065), ("SIKKIM","WEST SIKKIM"):(27.2924,88.2632),
    ("SIKKIM","NORTH SIKKIM"):(27.6733,88.4293), ("SIKKIM","SOUTH SIKKIM"):(27.2320,88.5135),
    ("SIKKIM","GANGTOK"):(27.3389,88.6065), ("SIKKIM","PAKYONG"):(27.2340,88.5878),
    ("SIKKIM","SORENG"):(27.1586,88.1700), ("SIKKIM","NAMCHI"):(27.1647,88.3646),
}


def normalize_state(s):
    if not s: return "MULTI-STATE"
    s = s.strip().upper()
    if "ODISHA" in s or "ORISSA" in s: return "ODISHA"
    if "UTTARAKHAND" in s or "UTTARANCHAL" in s: return "UTTARAKHAND"
    if "JAMMU" in s: return "JAMMU & KASHMIR"
    if "ANDAMAN" in s: return "ANDAMAN & NICOBAR"
    if "DADRA" in s or "DAMAN" in s or "DIU" in s: return "DADRA & NAGAR HAVELI AND DAMAN & DIU"
    if "PUDUCHERRY" in s or "PONDICHERRY" in s: return "PUDUCHERRY"
    if "MULTI" in s or "PAN INDIA" in s or "PAN-INDIA" in s: return "MULTI-STATE"
    if "OFFSHORE" in s: return "OFFSHORE"
    return s


def in_india(lat, lng):
    return INDIA_LAT_MIN <= lat <= INDIA_LAT_MAX and INDIA_LNG_MIN <= lng <= INDIA_LNG_MAX


def nominatim_geocode(query):
    params = {"q": query, "format": "json", "limit": 5, "countrycodes": "in", "addressdetails": 1}
    try:
        resp = requests.get(NOMINATIM_URL, params=params, headers=NOMINATIM_HEADERS, timeout=12)
        resp.raise_for_status()
        results = resp.json()
        for res in results:
            lat, lng = float(res["lat"]), float(res["lon"])
            if in_india(lat, lng):
                return {"lat": round(lat,6), "lng": round(lng,6),
                        "importance": float(res.get("importance",0)),
                        "osm_type": res.get("osm_type",""),
                        "address": res.get("address",{})}
        return None
    except Exception as e:
        print(f"  [NOM ERR] {query[:50]}: {e}")
        return None


def load_district_kw(path):
    if not path.exists(): return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    dm = data.get("districts_map", {})
    return {st: [(e["district"], e["coords"], e.get("keywords",[])) for e in ents]
            for st, ents in dm.items()}


def keyword_lookup(pname, state_norm, district_raw, dkm):
    p_up = pname.upper()
    for dist_name, coords, kws in dkm.get(state_norm, []):
        for kw in kws:
            if kw and kw in p_up:
                return {"lat": round(coords[0],6), "lng": round(coords[1],6),
                        "district": dist_name, "source": "keyword_lookup"}
    if district_raw and "administrative" not in district_raw.lower():
        d_up = district_raw.upper().strip()
        for dist_name, coords, _ in dkm.get(state_norm, []):
            dn = dist_name.upper()
            if dn in d_up or d_up in dn or (len(d_up)>=5 and d_up[:5] in dn):
                return {"lat": round(coords[0],6), "lng": round(coords[1],6),
                        "district": dist_name, "source": "district_keyword"}
    return None


def hardcoded_district(state_norm, district_raw):
    if not district_raw: return None
    d_up = district_raw.upper().strip()
    key = (state_norm, d_up)
    if key in DISTRICT_CENTROIDS:
        lat, lng = DISTRICT_CENTROIDS[key]
        return {"lat": lat, "lng": lng, "district": district_raw, "source": "district_centroid"}
    for (st, dt), coords in DISTRICT_CENTROIDS.items():
        if st == state_norm and (dt in d_up or d_up in dt or (len(d_up)>=5 and d_up[:5] in dt)):
            return {"lat": coords[0], "lng": coords[1], "district": dt.title(), "source": "district_centroid"}
    return None


def resolve_level(source, nom_result):
    if source == "manual_verified": return "project_site"
    if source == "nominatim":
        if nom_result:
            addr = nom_result.get("address", {})
            if any(k in addr for k in ("amenity","building","aeroway")): return "facility"
            if any(k in addr for k in ("city","town","village","suburb","quarter")): return "city"
        return "city"
    if source == "keyword_lookup": return "facility"
    if source == "district_keyword": return "city"
    if source == "district_centroid": return "district"
    return "state"


def geocode_project(proj, cache, dkm, skip_nominatim):
    pname = proj["project_name"] or ""
    state_raw = proj["state"] or ""
    district_raw = proj["district"] or ""
    place = proj["place"] or proj["location_name"] or ""
    state_norm = normalize_state(state_raw)

    if proj.get("coordinate_source") == "manual_verified":
        return {"lat": proj["latitude"], "lng": proj["longitude"],
                "source": "manual_verified", "confidence": 1.0,
                "district": district_raw, "geocoding_query": "PRESERVED_MANUAL",
                "resolution": "project_site"}

    ck = pname.strip().lower()
    if ck in cache and cache[ck].get("lat"):
        cached = cache[ck]
        cached["cache_hit"] = True
        return cached

    nom, geocoding_query = None, ""

    if not skip_nominatim:
        q1 = ", ".join(filter(None, [pname[:80], place, district_raw, state_raw, "India"]))
        nom = nominatim_geocode(q1)
        time.sleep(RATE_LIMIT_SLEEP)
        geocoding_query = q1

        if not nom and place:
            q2 = ", ".join(filter(None, [place, district_raw, state_raw, "India"]))
            nom = nominatim_geocode(q2)
            time.sleep(RATE_LIMIT_SLEEP)
            geocoding_query = q2

        if not nom and district_raw and "administrative" not in district_raw.lower():
            q3 = f"{district_raw}, {state_raw}, India"
            nom = nominatim_geocode(q3)
            time.sleep(RATE_LIMIT_SLEEP)
            geocoding_query = q3

    if nom:
        result = {"lat": nom["lat"], "lng": nom["lng"], "source": "nominatim",
                  "confidence": min(0.92, nom.get("importance",0.5) + 0.1),
                  "district": district_raw, "geocoding_query": geocoding_query,
                  "resolution": resolve_level("nominatim", nom), "_nom": nom}
        cache[ck] = result
        return result

    hc = hardcoded_district(state_norm, district_raw)
    if hc:
        result = {"lat": hc["lat"], "lng": hc["lng"], "source": hc["source"],
                  "confidence": 0.55, "district": hc.get("district", district_raw),
                  "geocoding_query": f"HARDCODED:{state_norm}:{district_raw}",
                  "resolution": "district"}
        cache[ck] = result
        return result

    kw = keyword_lookup(pname, state_norm, district_raw, dkm)
    if kw:
        result = {"lat": kw["lat"], "lng": kw["lng"], "source": kw["source"],
                  "confidence": 0.60, "district": kw.get("district", district_raw),
                  "geocoding_query": f"KEYWORD:{state_norm}:{pname[:40]}",
                  "resolution": resolve_level(kw["source"], None)}
        cache[ck] = result
        return result

    sc = STATE_CENTROIDS.get(state_norm, (22.5937, 78.9629))
    result = {"lat": sc[0], "lng": sc[1], "source": "state_centroid",
              "confidence": 0.20, "district": district_raw or f"{state_raw} District",
              "geocoding_query": f"STATE_CENTROID:{state_norm}",
              "resolution": "state"}
    cache[ck] = result
    return result


def coord_status(source):
    if source in ("nominatim","manual_verified","keyword_lookup"): return "exact"
    return "approximate"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--skip-nominatim", action="store_true")
    parser.add_argument("--force-all", action="store_true")
    args = parser.parse_args()

    print("="*70)
    print("PRISM Geo Rebuild v2 -- April 2026 (1,981 projects)")
    print(f"  dry-run={args.dry_run}  skip-nominatim={args.skip_nominatim}")
    print("="*70)

    cache = {}
    if not args.force_all and CACHE_PATH.exists():
        try:
            cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
            print(f"[CACHE] Loaded {len(cache)} entries")
        except Exception: pass

    dkm = load_district_kw(DISTRICT_DATA_PATH)
    print(f"[DATA] District keyword map: {len(dkm)} states")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT project_id, project_name, state, district, place, location_name,
               latitude, longitude, coordinate_status, coordinate_source,
               category, ministry, original_cost_cr, revised_cost_cr,
               physical_progress_pct, dataset_version
        FROM project_geolocations ORDER BY state, project_name
    """).fetchall()

    total = len(rows)
    limit = args.limit if args.limit > 0 else total
    print(f"[DB] {total} projects, processing {limit}")

    stats = {}
    results = []

    for i, row in enumerate(rows[:limit]):
        proj = dict(row)
        pname = proj["project_name"] or f"P{i}"
        if (i+1) % 100 == 0:
            pct = (i+1)/limit*100
            hits = stats.get("cache_hit",0)
            nom = stats.get("nominatim",0)
            print(f"  [{i+1}/{limit} {pct:.0f}%] cache={hits} nominatim={nom} -- {proj['state']} | {pname[:50]}")
        elif (i+1) % 10 == 0:
            sys.stdout.write(f"\r  [{i+1}/{limit}] {pname[:60]:<60}")
            sys.stdout.flush()

        geo = geocode_project(proj, cache, dkm, args.skip_nominatim)
        src = geo.get("source","state_centroid")
        if geo.get("cache_hit"): src = "cache_hit"
        stats[src] = stats.get(src,0) + 1

        fd = geo.get("district") or proj.get("district") or ""
        if fd and any(x in fd for x in ["Administrative","Zone","Infrastructure"]):
            if src not in ("nominatim","manual_verified"):
                fd = ""

        results.append({
            "project_name": pname,
            "latitude": geo["lat"], "longitude": geo["lng"],
            "district": fd,
            "coordinate_status": coord_status(src if src != "cache_hit" else geo.get("source","state_centroid")),
            "coordinate_source": geo.get("source","state_centroid"),
            "geocoding_confidence": geo.get("confidence",0.5),
            "geocoding_query": geo.get("geocoding_query",""),
            "location_resolution_level": geo.get("resolution","state"),
            "validation_status": "VALIDATED" if coord_status(geo.get("source","")) == "exact" else "APPROXIMATE",
            "dataset_version": "april_2026_nominatim_v2",
        })

        if (i+1) % 200 == 0:
            CACHE_PATH.parent.mkdir(parents=True,exist_ok=True)
            CACHE_PATH.write_text(json.dumps(cache,indent=2,ensure_ascii=False),encoding="utf-8")
            print(f"\n  [CACHE] Checkpoint {i+1}")

    print()
    CACHE_PATH.parent.mkdir(parents=True,exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache,indent=2,ensure_ascii=False),encoding="utf-8")
    print(f"[CACHE] Final save: {len(cache)} entries")

    if not args.dry_run:
        print(f"\n[DB] Updating {len(results)} rows...")
        now = datetime.utcnow().isoformat()
        for r in results:
            conn.execute("""
                UPDATE project_geolocations SET
                    latitude=?, longitude=?,
                    district=CASE WHEN ?!='' THEN ? ELSE district END,
                    coordinate_status=?, coordinate_source=?,
                    geocoding_confidence=?, geocoding_query=?,
                    location_resolution_level=?, validation_status=?,
                    dataset_version=?, validated_at=?
                WHERE project_name=? AND (coordinate_source!='manual_verified')
            """, (r["latitude"],r["longitude"],r["district"],r["district"],
                  r["coordinate_status"],r["coordinate_source"],
                  r["geocoding_confidence"],r["geocoding_query"],
                  r["location_resolution_level"],r["validation_status"],
                  r["dataset_version"],now, r["project_name"]))
        conn.commit()
        print(f"[DB] Done (manual_verified preserved)")

        print(f"\n[JSON] Writing {GEO_MASTER_OUT}...")
        all_rows = conn.execute("""
            SELECT project_id, project_name, state, state_normalized, district,
                   district_normalized, place, location_name, latitude, longitude,
                   coordinate_status, coordinate_source, location_resolution_level,
                   geocoding_confidence, geocoding_query, validation_status,
                   category, ministry, original_cost_cr, revised_cost_cr,
                   physical_progress_pct, dataset_version
            FROM project_geolocations ORDER BY state, district, project_name
        """).fetchall()
        master = [{
            "project_id":r[0],"project_name":r[1],"state":r[2],"state_normalized":r[3],
            "district":r[4],"district_normalized":r[5],"place":r[6],"location_name":r[7],
            "latitude":float(r[8]) if r[8] is not None else None,
            "longitude":float(r[9]) if r[9] is not None else None,
            "coordinate_status":r[10],"coordinate_source":r[11],
            "location_resolution_level":r[12],
            "geocoding_confidence":float(r[13]) if r[13] is not None else None,
            "geocoding_query":r[14],"validation_status":r[15],
            "category":r[16],"ministry":r[17],
            "original_cost_cr":float(r[18]) if r[18] is not None else None,
            "revised_cost_cr":float(r[19]) if r[19] is not None else None,
            "physical_progress_pct":float(r[20]) if r[20] is not None else None,
            "dataset_version":r[21],
        } for r in all_rows]
        GEO_MASTER_OUT.write_text(json.dumps(master,indent=2,ensure_ascii=False),encoding="utf-8")
        print(f"[JSON] Written {len(master)} entries")
    else:
        print(f"\n[DRY-RUN] Would write {len(results)} rows")

    conn.close()
    print("\n"+"="*70)
    print("REBUILD COMPLETE -- Source Distribution")
    print("="*70)
    total_p = sum(stats.values())
    for src, cnt in sorted(stats.items(),key=lambda x:-x[1]):
        print(f"  {src:28s}: {cnt:4d} ({cnt/total_p*100:5.1f}%)")
    print(f"  {'TOTAL':28s}: {total_p}")
    print("="*70)


if __name__ == "__main__":
    main()
