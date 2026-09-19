"""
GFR 175 Statutory Compliance Screening Engine — SIH26103 Phase 3
================================================================
Rule 175 of the General Financial Rules (GFR), 2017 prescribes the statutory
Code of Integrity for Public Procurement across all Central Sector entities.

IMPORTANT REGULATORY & STATUTORY SAFEGUARDS:
1. Advisory Screening Only: This module provides preliminary screening signals.
   An ML anomaly score, cost variance, or statistical outlier does NOT establish
   a legal violation or fraudulent conduct.
2. Non-Adjudicative: The system does NOT make a final legal, administrative,
   or procurement disqualification decision.
3. Official Determination: All final compliance determinations, show-cause notices,
   and contractor actions remain strictly with competent administrative authorities.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


def screen_project_gfr175(
    project_id: str,
    project_name: str,
    contractor_name: str,
    original_cost_cr: float,
    revised_cost_cr: float,
    cumulative_expenditure_cr: float,
    physical_progress_pct: float,
    burn_rate_pct: float,
    burn_progress_gap: float,
    source_pdf_page: Optional[int] = None,
    report_month: Optional[str] = "April 2026",
    sl_no: Optional[int] = None,
    contractor_multi_state_count: int = 1,
    existing_risk_tier: str = "medium",
    existing_risk_score: float = 0.5,
) -> Dict[str, Any]:
    """
    Evaluates project execution metrics against GFR Rule 175 statutory integrity triggers.
    
    Status Classifications:
      - GREEN:  "No Integrity Indicators Detected"
      - YELLOW: "Compliance Review Required"
      - RED:    "Potential Integrity Concern"
    
    The project/contractor risk tier (e.g. CRITICAL/HIGH/MEDIUM/LOW) remains completely separate.
    Indicators are generated strictly when supported by empirical project data.
    """
    indicators: List[str] = []
    
    orig = float(original_cost_cr or 0.0)
    rev = float(revised_cost_cr or orig)
    spent = float(cumulative_expenditure_cr or 0.0)
    prog = float(physical_progress_pct or 0.0)
    gap = float(burn_progress_gap or (burn_rate_pct - prog))
    cost_growth_pct = ((rev - orig) / orig * 100) if orig > 0 else 0.0
    spike_ratio = (burn_rate_pct / max(prog, 1.0)) if prog >= 5.0 else 1.0

    # 1. Evaluate Phantom Capital Outflow Triggers
    # Condition: Significant budget burn (>= 35%) with minimal ground reality (<= 15%), or large decoupling gap
    if (burn_rate_pct >= 35.0 and prog <= 15.0 and spent >= 20.0) or (gap >= 35.0 and spent >= 50.0):
        indicators.append(
            f"Unusual expenditure pattern: ₹{spent:.1f} Cr ({burn_rate_pct:.1f}% budget) disbursed while validated physical progress is {prog:.1f}% (gap: +{gap:.1f}%)"
        )
    elif gap >= 20.0 and spent >= 30.0:
        indicators.append(
            f"Progress-expenditure disconnect: Capital burn rate exceeds physical ground completion by {gap:.1f}%"
        )

    # 2. Evaluate Billing Surge & Milestone Front-Loading
    if prog >= 5.0 and burn_rate_pct >= 30.0 and spike_ratio >= 2.2:
        indicators.append(
            f"Billing anomaly: Cumulative burn rate is {spike_ratio:.2f}x higher than validated physical milestone delivery"
        )

    # 3. Evaluate Cumulative Scope & Sanction Cost Escalation
    if cost_growth_pct >= 40.0 and (rev - orig) >= 75.0:
        indicators.append(
            f"Severe sanction expansion: Revised estimates increased by {cost_growth_pct:.1f}% (+₹{rev - orig:.1f} Cr) over sanctioned cost"
        )
    elif cost_growth_pct >= 20.0 and (rev - orig) >= 40.0:
        indicators.append(
            f"Notable cost expansion: Scope cost revised upward by {cost_growth_pct:.1f}% (+₹{rev - orig:.1f} Cr)"
        )

    # 4. Evaluate Multi-State Contractor Concentration Risk
    if contractor_multi_state_count >= 4 and gap > 15.0:
        indicators.append(
            f"Contractor cluster concentration: EPC operates across {contractor_multi_state_count} states with concurrent schedule-budget variances"
        )

    # Determine GFR 175 Status & Color based strictly on verified indicators
    severe_triggers = [
        (burn_rate_pct >= 35.0 and prog <= 15.0 and spent >= 20.0),
        (gap >= 35.0 and spent >= 50.0),
        (cost_growth_pct >= 60.0 and (rev - orig) >= 150.0),
        (len(indicators) >= 2 and spike_ratio >= 2.5),
    ]

    if any(severe_triggers):
        status = "Potential Integrity Concern"
        color = "RED"
        explanation = (
            f"Statutory compliance screening detected {len(indicators)} significant execution variance indicators under GFR Rule 175. "
            f"Independent physical and financial audit recommended before releasing subsequent milestone disbursements."
        )
    elif len(indicators) > 0:
        status = "Compliance Review Required"
        color = "YELLOW"
        explanation = (
            f"Statutory compliance screening detected {len(indicators)} indicator(s) warranting routine administrative verification under GFR Rule 175. "
            f"Joint measurement verification and site progress inspection advised."
        )
    else:
        status = "No Integrity Indicators Detected"
        color = "GREEN"
        explanation = (
            "Statutory compliance screening indicates financial disbursements correlate with physical milestone execution. "
            "No billing anomalies, phantom expenditure indicators, or statutory code of integrity discrepancies identified."
        )

    # Contract ID hashing or slug
    contractor_id = f"cntr-{abs(hash(contractor_name)) % 100000:05d}"
    clean_month = (report_month or "April 2026").strip()
    source_doc = f"FlashReport_{clean_month.replace(' ', '_')}.pdf"

    evidence_desc = (
        f"{clean_month} Flash Report — Page {source_pdf_page}"
        if source_pdf_page
        else f"{clean_month} Flash Report — Official MoSPI Record"
    )

    return {
        "contractor_id": contractor_id,
        "contractor_name": contractor_name,
        "project_id": str(project_id),
        "project_name": project_name,
        "risk_score": float(existing_risk_score),
        "risk_tier": str(existing_risk_tier).upper(),
        "gfr175_screening_status": status,
        "status_color": color,
        "indicators": indicators,
        "evidence": {
            "source_document": source_doc,
            "source_page": source_pdf_page,
            "sl_no": sl_no,
            "report_month": clean_month,
            "description": evidence_desc,
        },
        "explanation": explanation,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "advisory_only": True,
        "advisory_notice": (
            "Advisory screening — final determination remains with authorized officials. "
            "This statutory screening does not establish a legal violation or constitute administrative disqualification."
        ),
    }
