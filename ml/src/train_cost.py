"""
Train Cost Overrun Prediction Model — SIH26103
===============================================
Trains an XGBoost classifier to predict whether a project will experience
a cost overrun (revised_cost > original_cost by more than a threshold).

Run from the ml/ directory:

    python src/train_cost.py

Output: ml/models/cost_model.pkl
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
from datetime import date
from sklearn.utils.class_weight import compute_class_weight
from xgboost import XGBClassifier

# Add parent dir to path so we can import features.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.features import build_feature_matrix, chronological_train_val_test_split

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# --- CONFIGURATION ---
DATA_PATH = "data/processed/projects_features.csv"
TARGET_COL = "is_cost_overrun"
SNAPSHOT_COL = "snapshot_date"
TRAIN_CUTOFF = "2024-12-31"
VAL_CUTOFF = "2025-06-30"
COST_OVERRUN_THRESHOLD_PCT = 10.0  # flag if revised cost > original by >10%


def load_data() -> pd.DataFrame:
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Processed data not found at {DATA_PATH}. "
            "Run notebooks/02_feature_engineering.ipynb first."
        )
    return pd.read_csv(DATA_PATH, parse_dates=[SNAPSHOT_COL])


def create_cost_label(df: pd.DataFrame) -> pd.Series:
    """
    is_cost_overrun = 1 if cost_variation_pct > COST_OVERRUN_THRESHOLD_PCT.
    Only uses information available at snapshot_date.
    """
    cost_variation = (
        (df["revised_cost_cr"] - df["original_cost_cr"]) / df["original_cost_cr"].replace(0, np.nan)
    ) * 100
    return (cost_variation > COST_OVERRUN_THRESHOLD_PCT).astype(int)


def train():
    print("Loading data...")
    df = load_data()

    print("Creating cost overrun labels...")
    df[TARGET_COL] = create_cost_label(df)

    print(f"\nOverall class distribution:")
    print(df[TARGET_COL].value_counts())
    overrun_rate = df[TARGET_COL].mean() * 100
    print(f"Cost overrun rate: {overrun_rate:.1f}%")

    train_df, val_df, test_df = chronological_train_val_test_split(df, SNAPSHOT_COL, TRAIN_CUTOFF, VAL_CUTOFF)

    print(f"\nClass distribution in training set:")
    print(train_df[TARGET_COL].value_counts())

    X_train = build_feature_matrix(train_df, date(2024, 12, 31))
    y_train = train_df[TARGET_COL]

    X_val = build_feature_matrix(val_df, date(2025, 6, 30))
    y_val = val_df[TARGET_COL]

    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    class_weight_dict = dict(zip(classes, weights))
    scale_pos_weight = class_weight_dict.get(0, 1) / class_weight_dict.get(1, 1)

    print(f"\nTraining XGBoost cost overrun model (scale_pos_weight={scale_pos_weight:.2f})...")
    model = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        eval_metric="aucpr",
        early_stopping_rounds=20,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=50,
    )

    output_path = os.path.join(MODELS_DIR, "cost_model.pkl")
    joblib.dump(model, output_path)
    print(f"\n✓ Cost overrun model saved to {output_path}")
    print("Run evaluate.py to check F1, ROC-AUC, Precision, Recall.")


if __name__ == "__main__":
    train()
