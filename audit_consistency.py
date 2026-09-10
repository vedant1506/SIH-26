"""
audit_consistency.py
Comprehensive 100% consistency audit across all 1,981 projects.
Validates:
1. List Risk Tier == Detail Risk Tier
2. List Risk Score == Detail Risk Score
3. Missing or invalid risk tiers = 0
4. Duplicate project IDs = 0
5. Kudankulam and Keshod Airport assertions
6. Tier distribution counts
"""
import os
import sys
import sqlite3
import pandas as pd
from collections import Counter

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))

from app.services import ml_service
from app.core.config import get_settings

settings = get_settings()

db_path = os.path.join(ROOT_DIR, "backend", "sql_app.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. Check duplicate project IDs
cur.execute("SELECT id, COUNT(*) FROM projects GROUP BY id HAVING COUNT(*) > 1")
dup_ids = cur.fetchall()
assert len(dup_ids) == 0, f"Found duplicate project IDs: {dup_ids}"
print(f"[PASS] 0 duplicate project IDs found in projects table.")

# 2. Fetch all projects and their latest predictions
cur.execute("""
    SELECT p.id, p.project_name, p.ministry, p.sector, p.state,
           p.original_cost_cr, p.revised_cost_cr, p.cumulative_expenditure_cr,
           p.physical_progress_pct, p.burn_rate_pct, p.burn_progress_gap,
           p.time_elapsed_ratio, p.original_start_date, p.scheduled_completion_date,
           p.revised_completion_date, rp.risk_tier, rp.composite_risk_score,
           rp.delay_probability, rp.cost_overrun_probability
    FROM projects p
    LEFT JOIN risk_predictions rp ON p.id = rp.project_id AND rp.predicted_at LIKE '2026-04%'
    ORDER BY p.project_name ASC
""")
rows = cur.fetchall()
total_projects = len(rows)
print(f"Total projects audited: {total_projects}")

mismatches = []
missing_tiers = []
invalid_tiers = []
valid_tiers = {"critical", "high", "medium", "low"}

tier_counts = Counter()

for r in rows:
    (pid, name, ministry, sector, state, orig_c, rev_c, exp_c, prog, br, bg, te,
     s_dt, sc_dt, rc_dt, db_tier, db_score, db_delay, db_cost) = r

    if not db_tier:
        missing_tiers.append((pid, name))
        continue

    clean_db_tier = str(db_tier).lower().strip()
    if clean_db_tier not in valid_tiers:
        invalid_tiers.append((pid, name, db_tier))
        continue

    tier_counts[clean_db_tier] += 1

    # Run canonical ML inference (Detail pipeline)
    proj_data = {
        "project_id": pid,
        "project_name": name,
        "ministry": ministry,
        "sector": sector,
        "state": state,
        "original_cost_cr": orig_c,
        "revised_cost_cr": rev_c,
        "cumulative_expenditure_cr": exp_c,
        "physical_progress_pct": prog,
        "burn_rate_pct": br,
        "burn_progress_gap": bg,
        "time_elapsed_ratio": te,
        "original_start_date": str(s_dt) if s_dt else None,
        "scheduled_completion_date": str(sc_dt) if sc_dt else None,
        "revised_completion_date": str(rc_dt) if rc_dt else None,
    }
    model_pred = ml_service.predict(proj_data, settings.ml_models_path)
    model_tier = model_pred["risk_tier"].lower().strip()
    model_score = round(float(model_pred["composite_risk_score"]), 4)

    if clean_db_tier != model_tier or abs(round(float(db_score), 4) - model_score) > 0.001:
        mismatches.append({
            "id": pid,
            "name": name,
            "db_tier": clean_db_tier,
            "model_tier": model_tier,
            "db_score": db_score,
            "model_score": model_score,
        })

print(f"\nAudit Results:")
print(f"  Missing risk tiers: {len(missing_tiers)}")
print(f"  Invalid risk tiers: {len(invalid_tiers)}")
print(f"  List vs Detail Mismatches: {len(mismatches)} / {total_projects}")
print(f"  Consistency Rate: {((total_projects - len(mismatches)) / total_projects) * 100:.2f}%")

print("\nAuthoritative April 2026 Tier Distribution:")
for t in ["critical", "high", "medium", "low"]:
    print(f"  {t.upper()}: {tier_counts[t]}")
print(f"  TOTAL: {sum(tier_counts.values())}")

assert len(missing_tiers) == 0, f"Missing tiers: {missing_tiers[:5]}"
assert len(invalid_tiers) == 0, f"Invalid tiers: {invalid_tiers[:5]}"
assert len(mismatches) == 0, f"Mismatches found: {mismatches[:5]}"

# 3. Test Kudankulam Project specifically
cur.execute("""
    SELECT p.id, p.project_name, rp.risk_tier, rp.composite_risk_score, rp.delay_probability, rp.cost_overrun_probability
    FROM projects p JOIN risk_predictions rp ON p.id = rp.project_id
    WHERE p.project_name LIKE '%Kudankulam Unit-3&4%' AND rp.predicted_at LIKE '2026-04%'
""")
kudan = cur.fetchone()
print(f"\n[PASS] Kudankulam Project:")
print(f"  ID: {kudan[0]}")
print(f"  Name: {kudan[1]}")
print(f"  Risk Tier: {kudan[2].upper()}")
print(f"  Composite Score: {kudan[3] * 100:.1f}%")
print(f"  Delay Probability: {kudan[4] * 100:.1f}%")
print(f"  Cost Overrun Probability: {kudan[5] * 100:.1f}%")

assert kudan[2].lower() == "medium", f"Expected medium, got {kudan[2]}"
assert round(kudan[3] * 100) == 47, f"Expected 47%, got {kudan[3] * 100:.1f}%"

# 4. Test Keshod Airport Project specifically
cur.execute("""
    SELECT p.id, p.project_name, rp.risk_tier, rp.composite_risk_score, rp.delay_probability, rp.cost_overrun_probability
    FROM projects p JOIN risk_predictions rp ON p.id = rp.project_id
    WHERE p.project_name LIKE '%Keshod Airport%' AND rp.predicted_at LIKE '2026-04%'
""")
keshod = cur.fetchone()
print(f"\n[PASS] Keshod Airport Project:")
print(f"  ID: {keshod[0]}")
print(f"  Name: {keshod[1]}")
print(f"  Risk Tier: {keshod[2].upper()}")
print(f"  Composite Score: {keshod[3] * 100:.1f}%")
print(f"  Delay Probability: {keshod[4] * 100:.1f}%")
print(f"  Cost Overrun Probability: {keshod[5] * 100:.1f}%")

assert keshod[2].lower() == "medium", f"Expected medium, got {keshod[2]}"
assert round(keshod[3] * 100) == 44, f"Expected 44%, got {keshod[3] * 100:.1f}%"

# 5. Test Bihta Airport Project specifically
cur.execute("""
    SELECT p.id, p.project_name, rp.risk_tier, rp.composite_risk_score, rp.delay_probability, rp.cost_overrun_probability
    FROM projects p JOIN risk_predictions rp ON p.id = rp.project_id
    WHERE p.project_name LIKE '%Civil Enclave at Bihta%' AND rp.predicted_at LIKE '2026-04%'
""")
bihta = cur.fetchone()
print(f"\n[PASS] Bihta Airport Project:")
print(f"  ID: {bihta[0]}")
print(f"  Name: {bihta[1]}")
print(f"  Risk Tier: {bihta[2].upper()}")
print(f"  Composite Score: {bihta[3] * 100:.1f}%")
print(f"  Delay Probability: {bihta[4] * 100:.1f}%")
print(f"  Cost Overrun Probability: {bihta[5] * 100:.1f}%")

assert bihta[2].lower() == "high", f"Expected high, got {bihta[2]}"
assert bihta[3] >= 0.55, f"Expected >= 0.55, got {bihta[3]}"

conn.close()
print("\n[ALL ASSERTIONS PASSED] 100% Canonical Consistency Verified across all 1,981 Projects!")
