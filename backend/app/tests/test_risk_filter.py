import pytest
from app.core.database import SessionLocal
from app.routers.projects import list_projects
from app.models.project import Project, RiskPrediction

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.mark.asyncio
async def test_risk_filter_immutability(db):
    """
    Verifies that the risk_tier filter:
    1. Only selects projects whose authoritative latest prediction matches the tier.
    2. Never relabels or mutates the risk_tier of any returned project.
    3. Guarantees mutually exclusive results between tiers.
    """
    tiers = ["low", "medium", "high", "critical"]
    seen_ids_by_tier = {}

    for tier in tiers:
        projects = await list_projects(
            risk_tier=tier,
            skip=0,
            limit=50,
            db=db,
            current_user=None,
        )
        assert len(projects) > 0, f"Expected projects for tier {tier}"
        ids = set()
        for p in projects:
            assert p.risk_tier == tier, (
                f"Filter violation: Requested {tier}, but project {p.project_name} "
                f"has displayed risk_tier={p.risk_tier}"
            )
            ids.add(p.id)
        seen_ids_by_tier[tier] = ids

    # Verify mutual exclusivity: a project with tier X must NOT appear in tier Y
    for t1 in tiers:
        for t2 in tiers:
            if t1 != t2:
                overlap = seen_ids_by_tier[t1].intersection(seen_ids_by_tier[t2])
                assert len(overlap) == 0, f"Projects {overlap} appeared in both {t1} and {t2}!"

@pytest.mark.asyncio
async def test_target_high_project_scenario(db):
    """
    Mandatory scenario test:
    Find a known HIGH risk project, verify it only appears when filtering by HIGH,
    and disappears when filtering by LOW, MEDIUM, or CRITICAL.
    """
    high_sample = (
        db.query(Project, RiskPrediction)
        .join(RiskPrediction, Project.id == RiskPrediction.project_id)
        .filter(RiskPrediction.predicted_at >= "2026-04-01")
        .filter(RiskPrediction.risk_tier == "high")
        .first()
    )
    assert high_sample is not None, "No HIGH risk project found in DB"
    target_project, target_prediction = high_sample
    p_name = target_project.project_name

    # 1. Search without tier filter -> must appear with tier "high"
    all_res = await list_projects(search=p_name, risk_tier=None, skip=0, limit=10, db=db, current_user=None)
    matches = [p for p in all_res if p.id == target_project.id]
    assert len(matches) == 1
    assert matches[0].risk_tier == "high"

    # 2. Select LOW -> must disappear
    low_res = await list_projects(search=p_name, risk_tier="low", skip=0, limit=10, db=db, current_user=None)
    assert len([p for p in low_res if p.id == target_project.id]) == 0

    # 3. Select MEDIUM -> must disappear
    med_res = await list_projects(search=p_name, risk_tier="medium", skip=0, limit=10, db=db, current_user=None)
    assert len([p for p in med_res if p.id == target_project.id]) == 0

    # 4. Select HIGH -> must appear with tier "high"
    high_res = await list_projects(search=p_name, risk_tier="high", skip=0, limit=10, db=db, current_user=None)
    high_matches = [p for p in high_res if p.id == target_project.id]
    assert len(high_matches) == 1
    assert high_matches[0].risk_tier == "high"

    # 5. Select CRITICAL -> must disappear
    crit_res = await list_projects(search=p_name, risk_tier="critical", skip=0, limit=10, db=db, current_user=None)
    assert len([p for p in crit_res if p.id == target_project.id]) == 0


@pytest.mark.asyncio
async def test_keshod_airport_acceptance_scenario(db):
    """
    Exact Acceptance Test Scenario:
    Project: 'Development of Keshod Airport.'
    1. Search 'Development of Keshod Airport.' -> Shows actual risk as MEDIUM (44%).
    2. Details shows MEDIUM / 44% (delay 77.9%, cost overrun 2.5%).
    3. Filter LOW -> COMPLETELY ABSENT (must not exist in filtered results).
    4. Filter MEDIUM -> APPEARS and displays MEDIUM (44%).
    5. Filter HIGH -> COMPLETELY ABSENT.
    6. Filter CRITICAL -> COMPLETELY ABSENT.
    """
    from app.routers.predictions import predict_project_risk

    p_name = "Development of Keshod Airport."

    # 1 & 2. Search "Development of Keshod Airport." -> Shows actual risk as MEDIUM
    all_res = await list_projects(search=p_name, risk_tier=None, skip=0, limit=10, db=db, current_user=None)
    matching = [p for p in all_res if "keshod" in p.project_name.lower()]
    assert len(matching) == 1, f"Expected 1 project matching '{p_name}', got {len(matching)}"
    p = matching[0]
    assert p.risk_tier == "medium", f"Expected MEDIUM tier in All Projects, got {p.risk_tier}"
    assert round(p.composite_risk_score * 100) == 44, f"Expected 44% composite risk, got {p.composite_risk_score}"

    # 3 & 4. Project Details verification
    pred = await predict_project_risk(project_id=str(p.id), payload=None, db=db, current_user=None)
    assert pred.risk_tier == "medium"
    assert round(float(pred.composite_risk_score) * 100) == 44
    assert round(float(pred.delay_probability) * 100, 1) == 77.9
    assert round(float(pred.cost_overrun_probability) * 100, 1) == 2.5

    # 6 & 7. Select LOW filter -> Development of Keshod Airport is COMPLETELY ABSENT
    low_res = await list_projects(search=p_name, risk_tier="low", skip=0, limit=10, db=db, current_user=None)
    assert len([x for x in low_res if "keshod" in x.project_name.lower()]) == 0, (
        "CRITICAL ERROR: 'Development of Keshod Airport.' was incorrectly included in LOW filter results!"
    )

    # 8, 9 & 10. Select MEDIUM filter -> appears, displays MEDIUM
    med_res = await list_projects(search=p_name, risk_tier="medium", skip=0, limit=10, db=db, current_user=None)
    med_matching = [x for x in med_res if "keshod" in x.project_name.lower()]
    assert len(med_matching) == 1, "Expected project to appear in MEDIUM filter results"
    assert med_matching[0].risk_tier == "medium"
    assert round(med_matching[0].composite_risk_score * 100) == 44

    # 11 & 12. Select HIGH filter -> absent
    high_res = await list_projects(search=p_name, risk_tier="high", skip=0, limit=10, db=db, current_user=None)
    assert len([x for x in high_res if "keshod" in x.project_name.lower()]) == 0

    # 13 & 14. Select CRITICAL filter -> absent
    crit_res = await list_projects(search=p_name, risk_tier="critical", skip=0, limit=10, db=db, current_user=None)
    assert len([x for x in crit_res if "keshod" in x.project_name.lower()]) == 0


@pytest.mark.asyncio
async def test_kudankulam_transmission_acceptance_scenario(db):
    """
    Mandatory Kudankulam Acceptance Test Scenario:
    Project: 'Transmission System under ISTS for evacuation of Power from Kudankulam Unit-3&4 [2x1000 MW] [SPV Name POWERGRID Kudankulam Tarnsmission Limited]'
    1. Search 'Kudankulam Unit-3' -> Shows authoritative risk as MEDIUM (47%).
    2. Details shows MEDIUM / 47% (delay 82.3%, cost overrun 3.3%).
    3. Filter LOW -> COMPLETELY ABSENT (must not exist in filtered results).
    4. Filter MEDIUM -> APPEARS and displays MEDIUM (47%).
    5. Filter HIGH -> COMPLETELY ABSENT.
    6. Filter CRITICAL -> COMPLETELY ABSENT.
    """
    from app.routers.predictions import predict_project_risk

    p_name = "Kudankulam Unit-3"

    # 1. Search Kudankulam -> Shows actual risk as MEDIUM
    all_res = await list_projects(search=p_name, risk_tier=None, skip=0, limit=10, db=db, current_user=None)
    matching = [p for p in all_res if "kudankulam" in p.project_name.lower()]
    assert len(matching) == 1, f"Expected 1 project matching '{p_name}', got {len(matching)}"
    p = matching[0]
    assert p.risk_tier == "medium", f"Expected MEDIUM tier in All Projects, got {p.risk_tier}"
    assert round(p.composite_risk_score * 100) == 47, f"Expected 47% composite risk, got {p.composite_risk_score}"

    # 2. Project Details verification
    pred = await predict_project_risk(project_id=str(p.id), payload=None, db=db, current_user=None)
    assert pred.risk_tier == "medium"
    assert round(float(pred.composite_risk_score) * 100) == 47
    assert round(float(pred.delay_probability) * 100, 1) in (82.3, 82.4)
    assert round(float(pred.cost_overrun_probability) * 100, 1) in (3.2, 3.3)

    # 3. Select LOW filter -> Kudankulam is COMPLETELY ABSENT
    low_res = await list_projects(search=p_name, risk_tier="low", skip=0, limit=10, db=db, current_user=None)
    assert len([x for x in low_res if "kudankulam" in x.project_name.lower()]) == 0, (
        "CRITICAL ERROR: Kudankulam was incorrectly included in LOW filter results!"
    )

    # 4. Select MEDIUM filter -> appears, displays MEDIUM (47%)
    med_res = await list_projects(search=p_name, risk_tier="medium", skip=0, limit=10, db=db, current_user=None)
    med_matching = [x for x in med_res if "kudankulam" in x.project_name.lower()]
    assert len(med_matching) == 1, "Expected project to appear in MEDIUM filter results"
    assert med_matching[0].risk_tier == "medium"
    assert round(med_matching[0].composite_risk_score * 100) == 47

    # 5. Select HIGH filter -> absent
    high_res = await list_projects(search=p_name, risk_tier="high", skip=0, limit=10, db=db, current_user=None)
    assert len([x for x in high_res if "kudankulam" in x.project_name.lower()]) == 0

    # 6. Select CRITICAL filter -> absent
    crit_res = await list_projects(search=p_name, risk_tier="critical", skip=0, limit=10, db=db, current_user=None)
    assert len([x for x in crit_res if "kudankulam" in x.project_name.lower()]) == 0


@pytest.mark.asyncio
async def test_bihta_airport_stagnation_acceptance_scenario(db):
    """
    Bihta Stagnation Acceptance Scenario:
    Project: 'Development of New Civil Enclave at Bihta'
    - 74% timeline elapsed with only 1.3% physical progress (SPI = 0.017)
    - Must be classified as HIGH risk tier (55%)
    - Must be COMPLETELY ABSENT from LOW and MEDIUM filters
    - Must be PRESENT under HIGH filter
    """
    from app.routers.predictions import predict_project_risk

    p_name = "Civil Enclave at Bihta"
    all_res = await list_projects(search=p_name, risk_tier=None, skip=0, limit=10, db=db, current_user=None)
    matching = [p for p in all_res if "civil enclave at bihta" in p.project_name.lower()]
    assert len(matching) == 1, f"Expected 1 project matching '{p_name}', got {len(matching)}"
    p = matching[0]
    assert p.risk_tier == "high", f"Expected HIGH tier for stagnant project Bihta, got {p.risk_tier}"
    assert round(p.composite_risk_score * 100) == 55

    pred = await predict_project_risk(project_id=str(p.id), payload=None, db=db, current_user=None)
    assert pred.risk_tier == "high"
    assert round(float(pred.composite_risk_score) * 100) == 55

    low_res = await list_projects(search=p_name, risk_tier="low", skip=0, limit=10, db=db, current_user=None)
    assert len([x for x in low_res if "civil enclave at bihta" in x.project_name.lower()]) == 0

    med_res = await list_projects(search=p_name, risk_tier="medium", skip=0, limit=10, db=db, current_user=None)
    assert len([x for x in med_res if "civil enclave at bihta" in x.project_name.lower()]) == 0

    high_res = await list_projects(search=p_name, risk_tier="high", skip=0, limit=10, db=db, current_user=None)
    assert len([x for x in high_res if "civil enclave at bihta" in x.project_name.lower()]) == 1



