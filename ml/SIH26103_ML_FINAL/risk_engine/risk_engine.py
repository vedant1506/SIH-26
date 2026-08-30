"""
Deterministic Risk Engine — SIH26103 Handoff
===========================================
Calculates risk tier (LOW, MEDIUM, HIGH, CRITICAL) using calibrated composite score.
"""

def calculate_risk(delay_prob: float, cost_prob: float, burn_gap: float, time_elapsed: float) -> dict:
    composite = min(max((burn_gap / 100.0) * 0.45 + (time_elapsed - 0.5) * 0.45, 0.05), 0.95)
    tier = "CRITICAL" if composite >= 0.75 else ("HIGH" if composite >= 0.50 else ("MEDIUM" if composite >= 0.25 else "LOW"))
    return {
        "delay_probability": round(delay_prob, 3),
        "cost_overrun_probability": round(cost_prob, 3),
        "composite_risk_score": round(composite, 3),
        "risk_tier": tier
    }
