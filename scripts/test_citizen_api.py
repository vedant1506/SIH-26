import os
import sys

# Add backend directory to sys.path
WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(WORKSPACE_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_public_projects():
    print("Testing GET /api/v1/public/projects ...")
    res = client.get("/api/v1/public/projects")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    
    # Assert pagination
    pagination = data["pagination"]
    print(f"  Total items: {pagination['total']}")
    print(f"  Page: {pagination['page']}, Page size: {pagination['page_size']}, Total pages: {pagination['total_pages']}")
    assert pagination["total"] == 1981, f"Expected 1981 total, got {pagination['total']}"
    assert len(data["data"]) == 24, f"Expected 24 items in page 1, got {len(data['data'])}"
    
    # Assert status counts
    counts = data["counts_by_status"]
    print(f"  Status breakdown: {counts}")
    assert counts["ALL"] == 1981, f"Expected ALL to be 1981, got {counts.get('ALL')}"
    assert counts["ON_SCHEDULE"] + counts["ACTIVE_MONITORING"] + counts["DELAYED"] == 1981
    
    # Test filter options
    print("\nTesting GET /api/v1/public/filter-options ...")
    res_opts = client.get("/api/v1/public/filter-options")
    assert res_opts.status_code == 200
    opts = res_opts.json()
    print(f"  States count: {len(opts['states'])}")
    print(f"  Sectors count: {len(opts['sectors'])}")
    print(f"  Ministries count: {len(opts['ministries'])}")
    print(f"  Agencies count: {len(opts['agencies'])}")
    assert len(opts["states"]) > 0
    assert len(opts["sectors"]) > 0
    
    # Test Search by numeric project_id
    sample_item = data["data"][0]
    sample_pid = sample_item["project_id"]
    print(f"\nTesting search by project_id: {sample_pid} ...")
    res_search = client.get(f"/api/v1/public/projects?search={sample_pid}")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert search_data["pagination"]["total"] >= 1
    assert any(p["project_id"] == sample_pid for p in search_data["data"])
    
    # Test detail lookup by numeric project_id
    print(f"Testing detail lookup by project_id '{sample_pid}' ...")
    res_detail = client.get(f"/api/v1/public/projects/{sample_pid}")
    assert res_detail.status_code == 200, f"Detail lookup failed: {res_detail.text}"
    detail = res_detail.json()
    assert detail["project_id"] == sample_pid
    assert detail["project_name"] == sample_item["project_name"]
    assert detail["report_month"] == "April 2026"
    print(f"  Detail retrieved: {detail['project_name']} (Agency: {detail.get('agency')}, Target: {detail.get('revised_target_doc_mm_yyyy')})")
    
    # Test detail lookup by UUID
    sample_uuid = sample_item["id"]
    print(f"Testing detail lookup by UUID '{sample_uuid}' ...")
    res_uuid_detail = client.get(f"/api/v1/public/projects/{sample_uuid}")
    assert res_uuid_detail.status_code == 200
    assert res_uuid_detail.json()["id"] == sample_uuid
    
    # Test status filter
    print("\nTesting status filtering ...")
    for st in ["ON_SCHEDULE", "ACTIVE_MONITORING", "DELAYED"]:
        res_st = client.get(f"/api/v1/public/projects?status={st}")
        assert res_st.status_code == 200
        st_data = res_st.json()
        print(f"  Status {st}: {st_data['pagination']['total']} projects")
        assert st_data["pagination"]["total"] == counts[st]
        for p in st_data["data"]:
            assert p["public_status"] == st
            
    print("\nALL BACKEND API TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_public_projects()
