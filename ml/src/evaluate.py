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



def evaluate_model(model_name: str, model_path: str, X_test: pd.DataFrame, y_test: pd.Series, target_names=None):
    if target_names is None:
        target_names = ["Class 0", "Class 1"]
    if not os.path.exists(model_path):
        print(f"  Model not found at {model_path}. Train it first.")
        return

    model = joblib.load(model_path)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print(f"\n{'='*50}")
    print(f"  {model_name}")
    print(f"{'='*50}")
    print(f"  ROC-AUC:              {roc_auc_score(y_test, y_prob):.4f}")
    print(f"  F1-Score (macro):     {f1_score(y_test, y_pred, average='macro'):.4f}")
    print(f"  F1-Score (weighted):  {f1_score(y_test, y_pred, average='weighted'):.4f}")
    print(f"  Precision (macro):    {precision_score(y_test, y_pred, average='macro'):.4f}")
    print(f"  Recall (macro):       {recall_score(y_test, y_pred, average='macro'):.4f}")
    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=target_names, zero_division=0))
    print(f"\n  Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))


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
        target_names=["Not Delayed", "Delayed"]
    )

    evaluate_model(
        "Cost Overrun Prediction Model (XGBoost)",
        os.path.join(MODELS_DIR, "cost_model.pkl"),
        X_eval, y_cost_eval,
        target_names=["No Cost Overrun", "Cost Overrun"]
    )


if __name__ == "__main__":
    main()
