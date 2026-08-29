# SIH26103 Project Risk Prediction Model

## Model name

SIH26103 Project Risk Prediction Model

## Primary model

Baseline XGBoost regression model.

## Model source

Cell 41 baseline XGBoost.

## Dataset

PAIMANA project-monitoring data represented in the frozen Cell 37
feature dataset.

## Features

Approved current-time features: 27

Numeric features: 25

Categorical features: 2

Processed features after preprocessing: 134

## Target

The model predicts the frozen next-observation physical progress target
defined by the SIH26103 target pipeline.

## Training design

Chronological temporal split:

TRAIN:
2025-07-01 to 2026-02-01

VALIDATION:
2026-03-01 to 2026-04-01

TEST:
2026-05-01 to 2026-06-01

TRAIN rows: 294
VALIDATION rows: 78
TEST rows: 75

## Preprocessing

Numeric features:
median imputation fitted only on TRAIN.

Categorical features:
explicit missing category and one-hot encoding fitted only on TRAIN.

The frozen Cell 40 preprocessor is reused during inference.

## Model parameters

{
  "objective": "reg:squarederror",
  "n_estimators": 300,
  "max_depth": 4,
  "learning_rate": 0.05,
  "subsample": 0.8,
  "colsample_bytree": 0.8,
  "min_child_weight": 3,
  "reg_alpha": 0.0,
  "reg_lambda": 1.0,
  "random_state": 42,
  "n_jobs": -1
}

## Final test metrics

MAE: 2.1753

RMSE: 3.8223

R²: 0.9890

## Model selection decision

Candidate 4 was selected using validation MAE during model development.
However, Candidate 4 did not improve the untouched TEST set.

Therefore the baseline XGBoost remains the primary project model.

## Leakage controls

- Chronological train/validation/test split.
- Future target information excluded from model features.
- Preprocessing fitted only on TRAIN.
- TEST reserved for final evaluation.
- Project identifiers excluded from model input.
- No target recreation during final packaging.

## Limitations

- Dataset contains limited historical observations per project.
- Some historical model features contain missing values for early observations.
- Project coverage is limited to the available PAIMANA observations.
- Report-format changes may affect downstream extraction and features.
- Predictions have uncertainty and should support, not replace, monitoring decisions.
- Model drift may occur as project behavior and reporting patterns change.
- Data-quality issues in source reports can propagate into model inputs.
- This regression model predicts physical progress; it does not by itself
  establish calibrated delay or cost-overrun probabilities.

## Production warning

Risk probabilities and risk thresholds must not be invented from the
current regression output. A separate validated risk-calibration layer
is required before exposing probability-based risk scores.
