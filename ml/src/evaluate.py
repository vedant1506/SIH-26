"""
Evaluate Trained Models — SIH26103
=====================================
DS Teammate: Run this after training both models:

    python src/evaluate.py

DO NOT evaluate on accuracy alone. This script reports F1, ROC-AUC, Precision, Recall.
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
from datetime import date
from sklearn.metrics import (
    classification_report, roc_auc_score, confusion_matrix,
    precision_score, recall_score, f1_score
)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.features import build_feature_matrix, chronological_train_val_test_split

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "processed", "projects_features.csv")



def evaluate_model(model_name: str, model_path: str, X_test: pd.DataFrame, y_test: pd.Series, target_names=None, source_df=None):
    if target_names is None:
        target_names = ["Class 0", "Class 1"]
    if not os.path.exists(model_path):
        print(f"  Model not found at {model_path}. Train it first.")
        return

    model = joblib.load(model_path)
    
    # Align features if model has feature_names_in_
    X_input = X_test.copy()
    if hasattr(model, "feature_names_in_"):
        expected_cols = list(model.feature_names_in_)
        if source_df is not None:
            aligned_data = {}
            for col in expected_cols:
                if col in X_test.columns:
                    aligned_data[col] = X_test[col]
                elif col in source_df.columns:
                    aligned_data[col] = source_df[col]
                elif col == "original_burn_rate_pct":
                    aligned_data[col] = (source_df["cumulative_expenditure_cr"] / source_df["original_cost_cr"].replace(0, np.nan) * 100.0).fillna(0.0)
                elif col == "original_burn_gap":
                    burn_r = (source_df["cumulative_expenditure_cr"] / source_df["original_cost_cr"].replace(0, np.nan) * 100.0).fillna(0.0)
                    aligned_data[col] = burn_r - source_df["physical_progress_pct"].fillna(0.0)
                elif col == "progress_velocity":
                    aligned_data[col] = (source_df.get("burn_progress_gap", 0.0) * -0.1)
                elif col == "burn_velocity":
                    aligned_data[col] = (source_df.get("burn_progress_gap", 0.0) * 0.1)
                else:
                    aligned_data[col] = 0.0
            X_input = pd.DataFrame(aligned_data, index=X_test.index)[expected_cols]
        else:
            for col in expected_cols:
                if col not in X_input.columns:
                    X_input[col] = 0.0
            X_input = X_input[expected_cols]

    y_pred = model.predict(X_input)
    y_prob = model.predict_proba(X_input)[:, 1]

    # Filter out NaNs if any in ground truth
    valid_mask = y_test.notna()
    y_test_clean = y_test[valid_mask].astype(int)
    y_pred_clean = y_pred[valid_mask]
    y_prob_clean = y_prob[valid_mask]

    print(f"\n{'='*50}")
    print(f"  {model_name}")
    print(f"{'='*50}")
    print(f"  ROC-AUC:              {roc_auc_score(y_test_clean, y_prob_clean):.4f}")
    print(f"  F1-Score (macro):     {f1_score(y_test_clean, y_pred_clean, average='macro'):.4f}")
    print(f"  F1-Score (weighted):  {f1_score(y_test_clean, y_pred_clean, average='weighted'):.4f}")
    print(f"  Precision (macro):    {precision_score(y_test_clean, y_pred_clean, average='macro'):.4f}")
    print(f"  Recall (macro):       {recall_score(y_test_clean, y_pred_clean, average='macro'):.4f}")
    print(f"\n  Classification Report:")
    print(classification_report(y_test_clean, y_pred_clean, target_names=target_names, zero_division=0))
    print(f"\n  Confusion Matrix:")
    print(confusion_matrix(y_test_clean, y_pred_clean))


def main():
    if not os.path.exists(DATA_PATH):
        print(f"Data not found at {DATA_PATH}. Run feature engineering notebook first.")
        return

    df = pd.read_csv(DATA_PATH, parse_dates=["snapshot_date"])
    # If test split has very few rows, train/val/test split can be adjusted or checked
    train_df, val_df, test_df = chronological_train_val_test_split(df)

    # Use test set (or combined val/test if test set is small)
    eval_df = test_df if len(test_df) > 5 else pd.concat([val_df, test_df])

    X_eval = build_feature_matrix(eval_df, date(2025, 12, 31))
    y_delay_eval = eval_df["is_delayed"]
    y_cost_eval = eval_df["is_cost_overrun"]

    evaluate_model(
        "Delay Prediction Model (XGBoost)",
        os.path.join(MODELS_DIR, "delay_model.pkl"),
        X_eval, y_delay_eval,
        target_names=["Not Delayed", "Delayed"],
        source_df=eval_df,
    )

    evaluate_model(
        "Cost Overrun Prediction Model (XGBoost)",
        os.path.join(MODELS_DIR, "cost_model.pkl"),
        X_eval, y_cost_eval,
        target_names=["No Cost Overrun", "Cost Overrun"],
        source_df=eval_df,
    )


if __name__ == "__main__":
    main()
