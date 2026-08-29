# SIH26103 Training Report

## Final primary model

Baseline XGBoost.

## Dataset split

TRAIN: 294 rows
VALIDATION: 78 rows
TEST: 75 rows

## Temporal periods

TRAIN: 2025-07-01 -> 2026-02-01
VALIDATION: 2026-03-01 -> 2026-04-01
TEST: 2026-05-01 -> 2026-06-01

## Final TEST performance

MAE = 2.1753
RMSE = 3.8223
R2 = 0.9890

## Final decision

BASELINE_BETTER

The baseline model remains the primary deployment model because the
controlled Candidate 4 model did not improve the untouched TEST set.
