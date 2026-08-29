"""
Train Delay Prediction Model — SIH26103
=========================================
DS Teammate: Fill in the TODOs. Run this script from the ml/ directory:

    python src/train_delay.py

Output: ml/models/delay_model.pkl
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
DATA_PATH = "data/processed/projects_features.csv"  # Created by notebook 02
TARGET_COL = "is_delayed"                           # 1 if project was delayed, 0 otherwise
SNAPSHOT_COL = "snapshot_date"
TRAIN_CUTOFF = "2024-12-31"
VAL_CUTOFF = "2025-06-30"


def load_data() -> pd.DataFrame:
    """
    TODO: Load your processed dataset.
    Expected columns: all raw project fields + snapshot_date + is_delayed label
    """
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Processed data not found at {DATA_PATH}. "
            "Run notebooks/02_feature_engineering.ipynb first."
        )
    return pd.read_csv(DATA_PATH, parse_dates=[SNAPSHOT_COL])


def create_delay_label(df: pd.DataFrame) -> pd.Series:
    """
    TODO: Define what counts as a 'delayed' project.
    Suggestion: is_delayed = 1 if actual_completion_date > scheduled_completion_date
    OR if delay_months > threshold.

    IMPORTANT: Only use information available at the snapshot_date.
    Do NOT use actual_completion_date if it's after the snapshot_date (leakage!).
    """
    # Placeholder — replace with your actual label logic
    return (df["delay_months_actual"] > 0).astype(int)


def train():
    print("Loading data...")
    df = load_data()

    print("Creating delay labels...")
    df[TARGET_COL] = create_delay_label(df)

    # Chronological split — prevents temporal data leakage
    train_df, val_df, test_df = chronological_train_val_test_split(df, SNAPSHOT_COL, TRAIN_CUTOFF, VAL_CUTOFF)

    print(f"\nClass distribution in training set:")
    print(train_df[TARGET_COL].value_counts())

    # Build feature matrices
    # TODO: Pass the correct snapshot_date for each split
    X_train = build_feature_matrix(train_df, date(2024, 12, 31))
    y_train = train_df[TARGET_COL]

    X_val = build_feature_matrix(val_df, date(2025, 6, 30))
    y_val = val_df[TARGET_COL]

    # Handle class imbalance — critical for infrastructure data
    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    class_weight_dict = dict(zip(classes, weights))
    scale_pos_weight = class_weight_dict.get(0, 1) / class_weight_dict.get(1, 1)

    print(f"\nTraining XGBoost delay model (scale_pos_weight={scale_pos_weight:.2f})...")
    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,  # Handles class imbalance
        eval_metric="aucpr",                # Better for imbalanced data than AUC
        early_stopping_rounds=20,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=50,
    )

    # Save model
    output_path = os.path.join(MODELS_DIR, "delay_model.pkl")
    joblib.dump(model, output_path)
    print(f"\n✓ Delay model saved to {output_path}")
    print("Run evaluate.py to check F1, ROC-AUC, Precision, Recall.")


if __name__ == "__main__":
    train()
