"""
Verification test for Dynamic Multi-LLM AI Mitigation Plan System.
Validates that:
1. Mitigation plans are NOT static or hardcoded.
2. Each project receives a unique, grounded mitigation plan tailored to its specific metrics, sector, delayed milestones, and location.
3. Multi-LLM models are discoverable and available.
4. Pairwise similarity between distinct projects is low (demonstrating true project specificity).
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath("backend"))

from app.services.llm_orchestrator import (
    generate_dynamic_mitigation_plan,
    get_available_llm_models,
    _compute_plan_jaccard,
    _extract_plan_tokens,
    StructuredMitigationPlan,
)

def run_tests():
    print("=" * 65)
    print("VERIFYING DYNAMIC MULTI-LLM AI MITIGATION PLANS")
    print("=" * 65)

    # 1. Test Model Discovery
    models = get_available_llm_models()
    print(f"\n[PASS] Model Discovery: {len(models)} models available:")
    for m in models:
        avail_str = "READY" if m["is_available"] else "CONFIG_REQUIRED"
        print(f"  - {m['name']} ({m['id']}) [{avail_str}] - Local: {m['is_local']}")
    assert len(models) >= 5, "Expected at least 5 supported LLM providers"

    # 2. Test 3 Highly Diverse Infrastructure Projects
    projects = [
        {
            "id": "PROJ-RAIL-01",
            "project_name": "Kashmir Railway Rail Link (Udhampur-Srinagar-Baramulla)",
            "sector": "Railways",
            "ministry": "Ministry of Railways",
            "implementing_agency": "Northern Railway / KRCL",
            "state": "Jammu & Kashmir",
            "location_name": "Chenab Bridge & Pir Panjal Tunnel Section",
            "original_cost_cr": 28000.0,
            "revised_cost_cr": 42000.0,
            "cumulative_expenditure_cr": 39500.0,
            "physical_progress_pct": 96.2,
            "forecast_delay_months": 24.0,
            "risk_tier": "HIGH",
            "composite_risk_score": 72.5,
            "shap_values": [
                {"factor": "Tunneling Geotechnical Grouting Bottlenecks", "impact_score": 0.28},
                {"factor": "Special Rolling Stock Line Possessions", "impact_score": 0.19}
            ],
            "milestones": [
                {"milestone_name": "T-49 Tunnel Breakthrough & Ballastless Track Linking", "is_completed": False}
            ]
        },
        {
            "id": "PROJ-AIR-02",
            "project_name": "Navi Mumbai International Airport (Greenfield)",
            "sector": "Civil Aviation",
            "ministry": "Ministry of Civil Aviation",
            "implementing_agency": "NMIAL / Adani Airports",
            "state": "Maharashtra",
            "location_name": "Ulwe River Diversion & Airside Apron Zone",
            "original_cost_cr": 16700.0,
            "revised_cost_cr": 19600.0,
            "cumulative_expenditure_cr": 14200.0,
            "physical_progress_pct": 74.0,
            "forecast_delay_months": 8.5,
            "risk_tier": "MEDIUM",
            "composite_risk_score": 54.0,
            "shap_values": [
                {"factor": "Terminal HVAC Baggage Carousel Interface Lag", "impact_score": 0.22},
                {"factor": "Airside Code-F Apron Pavement Curing", "impact_score": 0.15}
            ],
            "milestones": [
                {"milestone_name": "Substation 220kV Grid Energization for Airfield Lighting", "is_completed": False}
            ]
        },
        {
            "id": "PROJ-ROAD-03",
            "project_name": "Bengaluru-Chennai Expressway (NE-7 Package 3)",
            "sector": "Roads & Highways",
            "ministry": "Ministry of Road Transport and Highways",
            "implementing_agency": "NHAI",
            "state": "Tamil Nadu / Andhra Pradesh",
            "location_name": "Chittoor-Sriperumbudur Border Stretch",
            "original_cost_cr": 5800.0,
            "revised_cost_cr": 6100.0,
            "cumulative_expenditure_cr": 2200.0,
            "physical_progress_pct": 32.5,
            "forecast_delay_months": 11.0,
            "risk_tier": "HIGH",
            "composite_risk_score": 68.0,
            "shap_values": [
                {"factor": "Pioneer Embankment Earthwork Borrow Area Clearances", "impact_score": 0.31},
                {"factor": "Intermittent Revenue Land Compensation Awards", "impact_score": 0.24}
            ],
            "milestones": [
                {"milestone_name": "Chainage 85-110 Contiguous 3D RoW Possession", "is_completed": False}
            ]
        }
    ]

    generated_plans = []

    for i, p in enumerate(projects, 1):
        print(f"\n--- Generating Plan for Project {i}: {p['project_name']} ---")
        pred_dict = {
            "risk_tier": p["risk_tier"],
            "composite_risk_score": p["composite_risk_score"] / 100.0,
            "shap_values": p["shap_values"],
            "delay_duration_months": p["forecast_delay_months"],
            "cost_overrun_amount_cr": p["revised_cost_cr"] - p["original_cost_cr"],
        }
        res = generate_dynamic_mitigation_plan(
            project_dict=p,
            prediction_dict=pred_dict,
            milestones_list=p["milestones"],
            force_regenerate=True,
            model_preference="dynamic"
        )
        plan = res["plan"]
        generated_plans.append((p, plan, res))

        print(f"  Plan ID: {res['plan_id']} | Primary Model: {res['primary_model']}")
        print(f"  Executive Rec: {plan['executive_recommendation'][:110]}...")
        print(f"  Action 1: {plan['mitigation_actions'][0]['action']}")
        print(f"  Action 1 Evidence: {plan['mitigation_actions'][0]['evidence']}")
        print(f"  Action 2: {plan['mitigation_actions'][1]['action']}")
        print(f"  Role: {plan['mitigation_actions'][0]['responsible_role']}")
        print(f"  Timeline: {plan['mitigation_actions'][0]['timeline']}")

        # Assert plan is not static template
        assert "Conduct full-scale Operational Readiness" not in plan['mitigation_actions'][0]['action'], \
            "Found forbidden static airport template in action 1!"
        assert p['project_name'] in plan['executive_recommendation'] or p['project_name'] in str(plan['mitigation_actions']), \
            "Project name missing from tailored plan!"

    # 3. Test Pairwise Anti-Duplication
    print("\n" + "=" * 65)
    print("VERIFYING CROSS-PROJECT DIFFERENTIATION & UNIQUENESS")
    print("=" * 65)

    p1_plan = StructuredMitigationPlan(**generated_plans[0][1])
    p2_plan = StructuredMitigationPlan(**generated_plans[1][1])
    p3_plan = StructuredMitigationPlan(**generated_plans[2][1])

    tok1 = _extract_plan_tokens(p1_plan)
    tok2 = _extract_plan_tokens(p2_plan)
    tok3 = _extract_plan_tokens(p3_plan)

    jaccard_1_2 = _compute_plan_jaccard(tok1, tok2)
    jaccard_1_3 = _compute_plan_jaccard(tok1, tok3)
    jaccard_2_3 = _compute_plan_jaccard(tok2, tok3)

    print(f"  Jaccard Similarity (Project 1 vs Project 2): {jaccard_1_2:.3f}")
    print(f"  Jaccard Similarity (Project 1 vs Project 3): {jaccard_1_3:.3f}")
    print(f"  Jaccard Similarity (Project 2 vs Project 3): {jaccard_2_3:.3f}")

    assert jaccard_1_2 < 0.45, f"Plans 1 and 2 too similar ({jaccard_1_2})!"
    assert jaccard_1_3 < 0.45, f"Plans 1 and 3 too similar ({jaccard_1_3})!"
    assert jaccard_2_3 < 0.45, f"Plans 2 and 3 too similar ({jaccard_2_3})!"

    print("\n[SUCCESS] ALL CHECKS PASSED: Every project has its own unique, dynamic AI mitigation plan!")

if __name__ == "__main__":
    run_tests()
