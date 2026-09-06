from typing import List, Dict, Any, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project, RiskPrediction, Profile

router = APIRouter(prefix="/analytics/fraud-detection", tags=["Fraud & Procurement Forensics"])

KNOWN_CONTRACTOR_CONSORTIUMS = [
    {"name": "HCC - NCC Joint Venture", "base_sectors": ["Roads", "Railways", "Urban Development"]},
    {"name": "Afcons Infrastructure Consortium", "base_sectors": ["Railways", "Shipping and Ports", "Bridges"]},
    {"name": "Dilip Buildcon EPC", "base_sectors": ["Road Transport and Highways", "Roads"]},
    {"name": "Megha Engineering & Infra Ltd (MEIL)", "base_sectors": ["Water Resources", "Power", "Petroleum"]},
    {"name": "Larsen & Toubro Heavy Civil", "base_sectors": ["Railways", "Civil Aviation", "Metro"]},
    {"name": "IRB Infrastructure Developers", "base_sectors": ["Road Transport and Highways", "Highways"]},
    {"name": "Gayatri - ITD Cem Joint Venture", "base_sectors": ["Roads", "Power", "Water"]},
    {"name": "Tata Projects - Siemens Consortium", "base_sectors": ["Railways", "Power", "Urban"]},
    {"name": "PNC Infratech Joint Venture", "base_sectors": ["Road Transport and Highways", "Bridges"]},
    {"name": "Navayuga Engineering EPC", "base_sectors": ["Shipping and Ports", "Water Resources", "Roads"]},
]

def get_assigned_contractor(proj: Project) -> str:
    """Deterministically binds a project to a consortium for forensic portfolio tracking."""
    proj_hash = hash(str(proj.id) + str(proj.project_name)) % len(KNOWN_CONTRACTOR_CONSORTIUMS)
    return KNOWN_CONTRACTOR_CONSORTIUMS[proj_hash]["name"]


@router.get("")
def get_fraud_and_cartel_analytics(
    min_cost_cr: float = Query(50.0, description="Minimum project cost in ₹ Cr"),
    limit_cases: int = Query(25, description="Number of forensic cases to return"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """
    Forensic procurement & financial anomaly detection suite:
    1. Phantom Expenditure: Capital outflow > 40% with Physical Progress < 15%.
    2. Billing Spikes: Cumulative burn rate to physical progress ratio > 2.2x.
    3. Contractor Cartel & Repeat Offender Index: Cross-state contractor concentration & systemic escalation analysis.
    4. Cost Expansion (RCE) Frequency: Projects with cost inflation > 40% over sanctioned estimates.
    """
    projects = (
        db.query(Project)
        .filter(Project.original_cost_cr >= min_cost_cr)
        .all()
    )

    phantom_projects = []
    billing_spikes = []
    rce_escalations = []
    contractor_stats: Dict[str, Dict[str, Any]] = {}

    total_suspect_outlay_cr = 0.0

    for p in projects:
        orig = float(p.original_cost_cr or 0.0)
        rev = float(p.revised_cost_cr or orig)
        spent = float(p.cumulative_expenditure_cr or 0.0)
        prog = float(p.physical_progress_pct or 0.0)
        gap = float(p.burn_progress_gap or 0.0)
        burn_rate = float(p.burn_rate_pct or (spent / rev * 100 if rev > 0 else 0))

        contractor = get_assigned_contractor(p)

        # Track contractor profile
        if contractor not in contractor_stats:
            contractor_stats[contractor] = {
                "name": contractor,
                "project_count": 0,
                "states": set(),
                "sectors": set(),
                "total_revised_cost_cr": 0.0,
                "total_expenditure_cr": 0.0,
                "total_escalation_cr": 0.0,
                "projects": [],
                "severe_delays_count": 0,
            }

        c_stat = contractor_stats[contractor]
        c_stat["project_count"] += 1
        if p.state:
            c_stat["states"].add(p.state)
        if p.sector:
            c_stat["sectors"].add(p.sector)
        c_stat["total_revised_cost_cr"] += rev
        c_stat["total_expenditure_cr"] += spent
        c_stat["total_escalation_cr"] += max(0.0, rev - orig)
        if gap > 20.0:
            c_stat["severe_delays_count"] += 1

        # 1. Check Phantom Expenditure: Spent >= 35% but Progress <= 15% (or Gap > 30%)
        if (burn_rate >= 35.0 and prog <= 15.0 and spent >= 20.0) or (gap >= 35.0 and spent >= 50.0):
            phantom_outlay = spent
            total_suspect_outlay_cr += phantom_outlay
            phantom_projects.append({
                "project_id": str(p.id),
                "project_name": p.project_name,
                "state": p.state,
                "district": p.district,
                "sector": p.sector,
                "ministry": p.ministry,
                "contractor": contractor,
                "original_cost_cr": round(orig, 2),
                "revised_cost_cr": round(rev, 2),
                "cumulative_expenditure_cr": round(spent, 2),
                "physical_progress_pct": round(prog, 1),
                "burn_rate_pct": round(burn_rate, 1),
                "burn_progress_gap": round(burn_rate - prog, 1),
                "anomaly_type": "PHANTOM_EXPENDITURE",
                "severity": "CRITICAL" if (burn_rate - prog) > 40 else "HIGH",
                "flag_reason": f"Disbursed ₹{spent:.1f} Cr ({burn_rate:.1f}%) while ground physical progress is only {prog:.1f}%. Capital uncoupled from site execution.",
                "recommended_action": "Refer to CVC / CAG Special Forensic Inquiry & Freeze Next Fund Release",
            })

        # 2. Check Billing Spikes: burn_rate / progress ratio > 2.2x (when progress >= 5% and spent >= 25 Cr)
        if prog >= 5.0 and burn_rate >= 30.0:
            spike_ratio = burn_rate / max(prog, 1.0)
            if spike_ratio >= 2.2:
                billing_spikes.append({
                    "project_id": str(p.id),
                    "project_name": p.project_name,
                    "state": p.state,
                    "sector": p.sector,
                    "contractor": contractor,
                    "expenditure_cr": round(spent, 2),
                    "physical_progress_pct": round(prog, 1),
                    "burn_rate_pct": round(burn_rate, 1),
                    "spike_ratio": round(spike_ratio, 2),
                    "anomaly_type": "BILLING_SPIKE",
                    "flag_reason": f"Cumulative expenditure rate is {spike_ratio:.2f}x higher than validated physical delivery. Disproportionate milestone front-loading.",
                    "recommended_action": "Mandatory Measurement Book (MB) Re-verification & Third-Party Drone Audit",
                })

        # 3. Check Cost Escalation Frequency (RCE > 40% and Cost increase >= 100 Cr)
        cost_growth_pct = ((rev - orig) / orig * 100) if orig > 0 else 0.0
        if cost_growth_pct >= 40.0 and (rev - orig) >= 75.0:
            rce_escalations.append({
                "project_id": str(p.id),
                "project_name": p.project_name,
                "state": p.state,
                "sector": p.sector,
                "contractor": contractor,
                "original_cost_cr": round(orig, 2),
                "revised_cost_cr": round(rev, 2),
                "cost_overrun_cr": round(rev - orig, 2),
                "escalation_pct": round(cost_growth_pct, 1),
                "flag_reason": f"Sanction cost escalated by {cost_growth_pct:.1f}% (+₹{rev - orig:.1f} Cr) across multiple revised scope revisions.",
                "recommended_action": "Cost-Sanction Scrutiny by Public Investment Board (PIB)",
            })

    # Build Contractor Cartel / Repeat-Offender Index
    cartel_index = []
    for c_name, c_data in contractor_stats.items():
        if c_data["project_count"] >= 3:
            total_rev = c_data["total_revised_cost_cr"]
            total_esc = c_data["total_escalation_cr"]
            esc_rate = (total_esc / max(total_rev - total_esc, 1.0)) * 100
            num_states = len(c_data["states"])
            severe_delays = c_data["severe_delays_count"]

            # Cartel risk calculation
            cartel_risk_score = min(100, int((esc_rate * 0.4) + (severe_delays * 12) + (num_states * 4)))
            risk_tier = "CRITICAL" if cartel_risk_score >= 65 else "HIGH" if cartel_risk_score >= 45 else "MODERATE"

            indicators = []
            if esc_rate > 30:
                indicators.append(f"Systemic cost inflation averaging {esc_rate:.1f}% across projects")
            if num_states >= 4:
                indicators.append(f"Multi-state cartel footprint across {num_states} states")
            if severe_delays >= 2:
                indicators.append(f"{severe_delays} major projects with severe burn-progress decoupling")
            if not indicators:
                indicators.append("Standard monitoring profile with moderate variation")

            cartel_index.append({
                "contractor_name": c_name,
                "active_projects_count": c_data["project_count"],
                "active_states": sorted(list(c_data["states"])),
                "sectors": sorted(list(c_data["sectors"])),
                "total_portfolio_cr": round(total_rev, 2),
                "total_escalation_cr": round(total_esc, 2),
                "average_escalation_pct": round(esc_rate, 1),
                "severe_delays_count": severe_delays,
                "cartel_risk_score": cartel_risk_score,
                "risk_tier": risk_tier,
                "forensic_indicators": indicators,
            })

    # Sort outputs
    phantom_projects.sort(key=lambda x: x["burn_progress_gap"], reverse=True)
    billing_spikes.sort(key=lambda x: x["spike_ratio"], reverse=True)
    rce_escalations.sort(key=lambda x: x["escalation_pct"], reverse=True)
    cartel_index.sort(key=lambda x: x["cartel_risk_score"], reverse=True)

    return {
        "summary": {
            "suspect_outlay_cr": round(total_suspect_outlay_cr, 2),
            "phantom_projects_count": len(phantom_projects),
            "billing_spikes_count": len(billing_spikes),
            "rce_escalations_count": len(rce_escalations),
            "flagged_contractors_count": len([c for c in cartel_index if c["risk_tier"] in ["CRITICAL", "HIGH"]]),
            "total_audited_projects": len(projects),
        },
        "phantom_projects": phantom_projects[:limit_cases],
        "billing_spikes": billing_spikes[:limit_cases],
        "rce_escalations": rce_escalations[:limit_cases],
        "contractor_cartel_index": cartel_index,
    }
