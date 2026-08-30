"""
Temporal Data Splitting Engine — SIH26103 Master Workflow (Phase 8)
===================================================================
Splits longitudinal PAIMANA project observations chronologically into
training, validation, and test datasets to guarantee zero future data leakage.

Outputs:
    ml/data/processed/train.parquet
    ml/data/processed/validation.parquet
    ml/data/processed/test.parquet
"""

import os
import pandas as pd
import numpy as np

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DATA_PATH = os.path.join(ROOT_DIR, "data", "processed", "projects_features.csv")
OUTPUT_DIR = os.path.join(ROOT_DIR, "data", "processed")

def execute_temporal_split(train_ratio: float = 0.70, val_ratio: float = 0.15):
    """
    Performs chronological split based on snapshot_date or report order.
    """
    print(f"Loading dataset from {PROCESSED_DATA_PATH}...")
    if not os.path.exists(PROCESSED_DATA_PATH):
        raise FileNotFoundError(f"Processed features CSV not found at {PROCESSED_DATA_PATH}")

    df = pd.read_csv(PROCESSED_DATA_PATH)
    total_rows = len(df)
    print(f"Loaded {total_rows} total observations.")

    # Ensure sorting by date or order if snapshot_date is available
    if "snapshot_date" in df.columns:
        df["snapshot_date"] = pd.to_datetime(df["snapshot_date"])
        df = df.sort_values("snapshot_date").reset_index(drop=True)

    n_train = int(total_rows * train_ratio)
    n_val = int(total_rows * val_ratio)

    train_df = df.iloc[:n_train].copy()
    val_df = df.iloc[n_train:n_train + n_val].copy()
    test_df = df.iloc[n_train + n_val:].copy()

    print(f"Temporal Split Results:")
    print(f"  - Train:      {len(train_df)} records ({len(train_df)/total_rows*100:.1f}%)")
    print(f"  - Validation: {len(val_df)} records ({len(val_df)/total_rows*100:.1f}%)")
    print(f"  - Test:       {len(test_df)} records ({len(test_df)/total_rows*100:.1f}%)")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    try:
        train_df.to_parquet(os.path.join(OUTPUT_DIR, "train.parquet"), index=False)
        val_df.to_parquet(os.path.join(OUTPUT_DIR, "validation.parquet"), index=False)
        test_df.to_parquet(os.path.join(OUTPUT_DIR, "test.parquet"), index=False)
        print(f"[OK] Chronological parquets successfully saved to {OUTPUT_DIR}")
    except Exception as e:
        print(f"Parquet engine not available ({e}). Saving CSV temporal splits...")
        train_df.to_csv(os.path.join(OUTPUT_DIR, "train.csv"), index=False)
        val_df.to_csv(os.path.join(OUTPUT_DIR, "validation.csv"), index=False)
        test_df.to_csv(os.path.join(OUTPUT_DIR, "test.csv"), index=False)
        print(f"[OK] Chronological CSV splits successfully saved to {OUTPUT_DIR}")

if __name__ == "__main__":
    execute_temporal_split()

