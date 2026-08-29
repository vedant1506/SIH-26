"""
Generate Synthetic Demo Data — SIH26103
========================================
Generates a realistic synthetic dataset for demo/testing when real
MoSPI PAIMANA CSV data is not yet available.

Output: ml/data/processed/projects_features.csv

Run from the ml/ directory:
    python src/generate_demo_data.py

The DS teammate should REPLACE this with real MoSPI data before final submission.
"""

import os
import sys
import numpy as np
import pandas as pd
from datetime import date, timedelta

OUTPUT_PATH = "data/processed/projects_features.csv"
os.makedirs("data/processed", exist_ok=True)

np.random.seed(42)
N = 1200  # total project-snapshots

# --- Snapshot dates spread across 2022–2025 ---
base_date = date(2022, 1, 1)
snapshot_dates = [base_date + timedelta(days=int(d)) for d in np.random.uniform(0, 365 * 3.5, N)]
snapshot_dates = sorted(snapshot_dates)

# --- Project fundamentals ---
original_cost_cr = np.random.lognormal(mean=4.5, sigma=1.2, size=N).clip(10, 5000)

# Cost revision: ~40% projects get cost overruns (revised > original)
overrun_mask = np.random.rand(N) < 0.40
cost_multiplier = np.where(overrun_mask, np.random.uniform(1.05, 1.80, N), np.random.uniform(0.95, 1.05, N))
revised_cost_cr = original_cost_cr * cost_multiplier

# --- Time ---
project_duration_days = np.random.randint(365, 365 * 5, size=N)
start_offsets = np.random.randint(-365 * 3, -180, size=N)  # all started before snapshot
start_dates = [snapshot_dates[i] + timedelta(days=int(start_offsets[i])) for i in range(N)]
scheduled_completion_dates = [start_dates[i] + timedelta(days=int(project_duration_days[i])) for i in range(N)]

time_elapsed_ratio = np.array([
    min((snapshot_dates[i] - start_dates[i]).days / max(project_duration_days[i], 1), 1.5)
    for i in range(N)
]).clip(0.05, 1.5)

# --- Physical progress ---
# Correlated with time_elapsed_ratio but with distress baked in
distress = np.random.rand(N) < 0.35  # 35% projects are behind schedule
expected_progress = time_elapsed_ratio * 100
progress_factor = np.where(distress, np.random.uniform(0.3, 0.75, N), np.random.uniform(0.85, 1.05, N))
physical_progress_pct = (expected_progress * progress_factor).clip(0, 100)

# --- Expenditure ---
burn_rate_pct = (physical_progress_pct + np.random.normal(0, 8, N)).clip(0, 150)
cumulative_expenditure_cr = revised_cost_cr * burn_rate_pct / 100

burn_progress_gap = burn_rate_pct - physical_progress_pct
cost_variation_pct = (revised_cost_cr - original_cost_cr) / original_cost_cr * 100

# --- Labels ---
# Delay: project is at risk if physical_progress_pct is far behind time_elapsed_ratio
delay_months_actual = np.where(
    distress,
    np.random.uniform(2, 36, N),
    np.random.uniform(-6, 4, N),
)
is_delayed = (delay_months_actual > 0).astype(int)
is_cost_overrun = (cost_variation_pct > 10).astype(int)

# --- Build DataFrame ---
df = pd.DataFrame({
    "snapshot_date":              [d.isoformat() for d in snapshot_dates],
    "original_start_date":        [d.isoformat() for d in start_dates],
    "scheduled_completion_date":  [d.isoformat() for d in scheduled_completion_dates],
    "original_cost_cr":           original_cost_cr.round(2),
    "revised_cost_cr":            revised_cost_cr.round(2),
    "cumulative_expenditure_cr":  cumulative_expenditure_cr.round(2),
    "physical_progress_pct":      physical_progress_pct.round(2),
    "burn_rate_pct":               burn_rate_pct.round(2),
    "burn_progress_gap":          burn_progress_gap.round(2),
    "time_elapsed_ratio":         time_elapsed_ratio.round(4),
    "cost_variation_pct":         cost_variation_pct.round(2),
    "delay_months_actual":        delay_months_actual.round(1),
    "is_delayed":                 is_delayed,
    "is_cost_overrun":            is_cost_overrun,
})

df.to_csv(OUTPUT_PATH, index=False)
print(f"✓ Demo dataset saved to {OUTPUT_PATH}")
print(f"  Rows: {len(df)}")
print(f"  Delayed projects: {is_delayed.sum()} ({is_delayed.mean()*100:.1f}%)")
print(f"  Cost overrun projects: {is_cost_overrun.sum()} ({is_cost_overrun.mean()*100:.1f}%)")
print(f"  Date range: {df['snapshot_date'].min()} → {df['snapshot_date'].max()}")
print()
print("NOTE: Replace this synthetic data with real MoSPI PAIMANA CSVs before demo.")
