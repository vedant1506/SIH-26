"""
Deterministic Risk Engine — SIH26103 Handoff
===========================================
Calculates risk tier (LOW, MEDIUM, HIGH, CRITICAL) using calibrated composite score.

v2: Added stagnation override guardrails (SPI check, schedule-progress gap pattern,
    forecasted lag coupling) to correctly classify paralyzed/stalled projects that
    were previously misclassified as LOW due to near-zero expenditure suppressing
    the composite score.
"""


def _apply_stagnation_overrides(
    composite: float,
    time_elapsed: float,
    physical_progress: float,
    original_cost_cr: float = 0.0,
    delay_months: float = 0.0,
) -> tuple:
    """
    Apply post-model stagnation guardrails.
    Returns (corrected_composite, override_reason).
    """
    override_reason = ""

    # Guard 1: SPI < 0.10 → CRITICAL
    spi = physical_progress / (time_elapsed * 100.0) if time_elapsed > 0 else 1.0
    if spi < 0.10 and time_elapsed >= 0.30:
        composite = max(composite, 0.80)
        override_reason = (
            f"SPI Override: SPI={spi:.3f} (<0.10). "
            f"Project executing at {spi*100:.1f}% of required pace. CRITICAL enforced."
        )
        return composite, override_reason

    # Guard 2: Large schedule-progress gap → CRITICAL
    gap = time_elapsed - (physical_progress / 100.0)
    if time_elapsed >= 0.50 and physical_progress < 15.0 and gap >= 0.40:
        composite = max(composite, 0.78)
        override_reason = (
            f"Stagnation Override: {time_elapsed*100:.0f}% elapsed, {physical_progress:.1f}% progress "
            f"(gap={gap*100:.0f}ppts). CRITICAL enforced."
        )
        return composite, override_reason

    # Guard 3: Lag-coupling on large projects → escalate
    if original_cost_cr >= 500.0:
        if delay_months >= 36.0:
            composite = max(composite, 0.76)
            override_reason = (
                f"Lag-Coupling Override: {delay_months:.0f}-month lag on "
                f"₹{original_cost_cr:,.0f} Cr project. CRITICAL enforced."
            )
        elif delay_months >= 12.0 and composite < 0.25:
            composite = max(composite, 0.26)

    return composite, override_reason


def calculate_risk(
    delay_prob: float,
    cost_prob: float,
    burn_gap: float,
    time_elapsed: float,
    physical_progress: float = 50.0,
    original_cost_cr: float = 0.0,
    delay_months: float = 0.0,
) -> dict:
    """
    Calculate composite risk score and tier with stagnation overrides.

    Args:
        delay_prob: XGBoost delay classification probability [0,1]
        cost_prob: XGBoost cost overrun classification probability [0,1]
        burn_gap: Expenditure burn rate minus physical progress (percentage points)
        time_elapsed: Fraction of scheduled timeline that has elapsed [0, 1.5]
        physical_progress: Reported physical progress percentage [0, 100]
        original_cost_cr: Original sanctioned cost in Crore rupees
        delay_months: Projected schedule delay in months
    """
    composite = min(max((burn_gap / 100.0) * 0.45 + (time_elapsed - 0.5) * 0.45, 0.05), 0.95)

    # Apply stagnation guardrails
    composite, override_reason = _apply_stagnation_overrides(
        composite=composite,
        time_elapsed=time_elapsed,
        physical_progress=physical_progress,
        original_cost_cr=original_cost_cr,
        delay_months=delay_months,
    )

    tier = "CRITICAL" if composite >= 0.75 else ("HIGH" if composite >= 0.50 else ("MEDIUM" if composite >= 0.25 else "LOW"))

    result = {
        "delay_probability": round(delay_prob, 3),
        "cost_overrun_probability": round(cost_prob, 3),
        "composite_risk_score": round(composite, 3),
        "risk_tier": tier,
    }
    if override_reason:
        result["override_reason"] = override_reason
    return result

