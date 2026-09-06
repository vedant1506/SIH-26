"""
Geo Router — SIH26103
=====================
Provides authoritative geolocation data for all 1,981 April 2026 projects.
All data comes from the project_geolocations table which is rebuilt by
scripts/rebuild_geolocations.py using Nominatim (OpenStreetMap) geocoding.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List

from app.core.database import get_db
from app.core.security import get_optional_user
from app.models.project import Profile

router = APIRouter(prefix="/geo", tags=["Geolocation"])


@router.get("/projects")
async def get_all_project_geolocations(
    state: Optional[str] = None,
    district: Optional[str] = None,
    coordinate_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    Returns geo metadata for all April 2026 projects from project_geolocations.
    Used by the map page as the single source of truth for all geo data.
    Optionally filterable by state, district, or coordinate_status.
    """
    sql = """
        SELECT
            g.project_id,
            g.project_name,
            g.state,
            g.state_normalized,
            g.district,
            g.district_normalized,
            g.place,
            g.location_name,
            g.latitude,
            g.longitude,
            g.coordinate_status,
            g.coordinate_source,
            g.location_resolution_level,
            g.geocoding_confidence,
            g.geocoding_query,
            g.validation_status,
            g.state_match,
            g.district_match,
            g.category,
            g.ministry,
            g.original_cost_cr,
            g.revised_cost_cr,
            g.physical_progress_pct,
            g.dataset_version
        FROM project_geolocations g
        WHERE 1=1
    """
    params = {}
    if state:
        sql += " AND UPPER(g.state) = UPPER(:state)"
        params["state"] = state
    if district:
        sql += " AND UPPER(g.district) = UPPER(:district)"
        params["district"] = district
    if coordinate_status:
        sql += " AND g.coordinate_status = :coordinate_status"
        params["coordinate_status"] = coordinate_status

    sql += " ORDER BY g.state, g.district, g.project_name"

    rows = db.execute(text(sql), params).fetchall()

    return [
        {
            "project_id": r[0],
            "project_name": r[1],
            "state": r[2],
            "state_normalized": r[3],
            "district": r[4],
            "district_normalized": r[5],
            "place": r[6],
            "location_name": r[7],
            "latitude": float(r[8]) if r[8] is not None else None,
            "longitude": float(r[9]) if r[9] is not None else None,
            "coordinate_status": r[10],
            "coordinate_source": r[11],
            "location_resolution_level": r[12],
            "geocoding_confidence": float(r[13]) if r[13] is not None else None,
            "geocoding_query": r[14],
            "validation_status": r[15],
            "state_match": bool(r[16]) if r[16] is not None else None,
            "district_match": bool(r[17]) if r[17] is not None else None,
            "category": r[18],
            "ministry": r[19],
            "original_cost_cr": float(r[20]) if r[20] is not None else None,
            "revised_cost_cr": float(r[21]) if r[21] is not None else None,
            "physical_progress_pct": float(r[22]) if r[22] is not None else None,
            "dataset_version": r[23],
        }
        for r in rows
    ]


@router.get("/audit")
async def get_geo_audit(
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    Returns a full district-level audit table for all April 2026 geolocations.
    Shows source count, exact/approximate/unresolved breakdown, and state/district mismatch counts.
    """
    rows = db.execute(text("""
        SELECT
            g.state,
            g.district,
            COUNT(*) as total,
            SUM(CASE WHEN g.coordinate_status = 'exact' THEN 1 ELSE 0 END) as exact_count,
            SUM(CASE WHEN g.coordinate_status = 'approximate' THEN 1 ELSE 0 END) as approx_count,
            SUM(CASE WHEN g.coordinate_status = 'unresolved' THEN 1 ELSE 0 END) as unresolved_count,
            SUM(CASE WHEN g.state_match = 0 THEN 1 ELSE 0 END) as state_mismatch,
            SUM(CASE WHEN g.district_match = 0 THEN 1 ELSE 0 END) as district_mismatch,
            MIN(g.latitude) as min_lat,
            MAX(g.latitude) as max_lat
        FROM project_geolocations g
        GROUP BY g.state, g.district
        ORDER BY g.state, g.district
    """)).fetchall()

    return [
        {
            "state": r[0],
            "district": r[1],
            "total": r[2],
            "exact": r[3],
            "approximate": r[4],
            "unresolved": r[5],
            "state_mismatch": r[6],
            "district_mismatch": r[7],
            "status": "PASS" if (r[5] == 0 and r[6] == 0) else "FAIL",
        }
        for r in rows
    ]


@router.get("/summary")
async def get_geo_summary(
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    Returns a top-level summary of geolocation quality across the entire April 2026 portfolio.
    """
    r = db.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN coordinate_status = 'exact' THEN 1 ELSE 0 END) as exact_count,
            SUM(CASE WHEN coordinate_status = 'approximate' THEN 1 ELSE 0 END) as approx_count,
            SUM(CASE WHEN coordinate_status = 'unresolved' THEN 1 ELSE 0 END) as unresolved_count,
            SUM(CASE WHEN coordinate_source = 'nominatim' THEN 1 ELSE 0 END) as nominatim_count,
            SUM(CASE WHEN coordinate_source = 'source_data' THEN 1 ELSE 0 END) as source_data_count,
            SUM(CASE WHEN coordinate_source = 'manual_verified' THEN 1 ELSE 0 END) as manual_count,
            SUM(CASE WHEN coordinate_source = 'district' THEN 1 ELSE 0 END) as district_centroid_count,
            SUM(CASE WHEN coordinate_source = 'state' THEN 1 ELSE 0 END) as state_centroid_count,
            SUM(CASE WHEN location_resolution_level = 'project_site' THEN 1 ELSE 0 END) as project_site_count,
            SUM(CASE WHEN location_resolution_level = 'facility' THEN 1 ELSE 0 END) as facility_count,
            SUM(CASE WHEN location_resolution_level = 'city' THEN 1 ELSE 0 END) as city_count,
            SUM(CASE WHEN location_resolution_level = 'district' THEN 1 ELSE 0 END) as district_count,
            SUM(CASE WHEN location_resolution_level = 'state' THEN 1 ELSE 0 END) as state_count,
            SUM(CASE WHEN state_match = 0 THEN 1 ELSE 0 END) as state_mismatches,
            SUM(CASE WHEN district_match = 0 THEN 1 ELSE 0 END) as district_mismatches,
            SUM(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 ELSE 0 END) as null_coords,
            COUNT(DISTINCT state) as state_count_distinct,
            COUNT(DISTINCT district) as district_count_distinct
        FROM project_geolocations
    """)).fetchone()

    return {
        "dataset": "April 2026",
        "total_projects": r[0],
        "coordinate_status": {
            "exact": r[1],
            "approximate": r[2],
            "unresolved": r[3],
        },
        "coordinate_source": {
            "nominatim": r[4],
            "source_data": r[5],
            "manual_verified": r[6],
            "district_centroid": r[7],
            "state_centroid": r[8],
        },
        "resolution_level": {
            "project_site": r[9],
            "facility": r[10],
            "city": r[11],
            "district": r[12],
            "state": r[13],
        },
        "validation": {
            "state_mismatches": r[14],
            "district_mismatches": r[15],
            "null_coordinates": r[16],
        },
        "coverage": {
            "states": r[17],
            "districts": r[18],
        },
    }
