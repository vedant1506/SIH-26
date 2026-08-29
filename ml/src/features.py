"""
Feature Engineering Functions — SIH26103
=========================================
All feature computation logic lives here so it can be shared
between training (notebooks) and inference (backend ml_service.py).

DS Teammate: implement the TODOs in each function.
"""

import pandas as pd
import numpy as np
from typing import Tuple
from datetime import date


# The exact feature names expected by the backend ML service.
# DO NOT rename these without updating backend/app/services/ml_service.py → MODEL_FEATURES
MODEL_FEATURES = [
    "burn_rate_pct",
    "burn_progress_gap",
    "time_elapsed_ratio",
    "physical_progress_pct",
    "cost_variation_pct",
    "original_cost_cr",
    "revised_cost_cr",
]


def compute_burn_rate(expenditure_cr: pd.Series, revised_cost_cr: pd.Series) -> pd.Series:
    """
    Compute burn rate: percentage of budget consumed.

    burn_rate_pct = (cumulative_expenditure / revised_cost) * 100

    Args:
        expenditure_cr: Cumulative expenditure in Crore INR
        revised_cost_cr: Revised project cost in Crore INR

    Returns:
        Series of burn rate percentages (0–100+)
    """
    # TODO: implement
    # Handle division by zero (projects with no revised cost)
    return (expenditure_cr / revised_cost_cr.replace(0, np.nan)) * 100


def compute_burn_progress_gap(burn_rate_pct: pd.Series, physical_progress_pct: pd.Series) -> pd.Series:
    """
    Compute the burn-rate vs physical progress gap.
    This is the MOST important feature for detecting project distress.

    A positive gap means: budget is being consumed faster than physical work is progressing.
    e.g., gap = +35 means "spent 35% more budget than work achieved"

    Args:
        burn_rate_pct: Output of compute_burn_rate()
        physical_progress_pct: Physical progress (0–100)

    Returns:
        Series of gap values. Positive = over-burning.
    """
    # TODO: implement
    return burn_rate_pct - physical_progress_pct


def compute_time_elapsed_ratio(
    start_dates: pd.Series,
    scheduled_completion_dates: pd.Series,
    snapshot_date: date,
) -> pd.Series:
    """
    Compute time elapsed ratio at the time of the data snapshot.

    time_elapsed_ratio = (snapshot_date - start_date) / (scheduled_completion - start_date)
    Capped at 1.0 (i.e., project is overdue).

    IMPORTANT: Use the snapshot_date of each report, NOT today's date.
    Using today's date would cause temporal leakage in historical training data.

    Args:
        start_dates: Project start dates
        scheduled_completion_dates: Scheduled completion dates
        snapshot_date: The report date (e.g., March 2024 flash report date)

    Returns:
        Series of ratios (0.0–1.0+)
    """
    # TODO: implement
    total_days = (scheduled_completion_dates - start_dates).dt.days
    elapsed_days = (pd.to_datetime(snapshot_date) - start_dates).dt.days
    ratio = elapsed_days / total_days.replace(0, np.nan)
    return ratio.clip(upper=1.5)  # Allow slight overshoot


def compute_cost_variation(original_cost_cr: pd.Series, revised_cost_cr: pd.Series) -> pd.Series:
    """
    Compute cost variation percentage.

    cost_variation_pct = (revised_cost - original_cost) / original_cost * 100

    Args:
        original_cost_cr: Original sanctioned cost
        revised_cost_cr: Latest revised cost

    Returns:
        Series of cost variation percentages
    """
    # TODO: implement
    return ((revised_cost_cr - original_cost_cr) / original_cost_cr.replace(0, np.nan)) * 100


def build_feature_matrix(df: pd.DataFrame, snapshot_date: date) -> pd.DataFrame:
    """
    Master function: takes a raw project DataFrame and returns the full feature matrix.
    Call this in your training notebooks and scripts.

    Args:
        df: DataFrame with raw project columns from MoSPI PAIMANA data
        snapshot_date: The date of the data snapshot (for time_elapsed_ratio)

    Returns:
        DataFrame with exactly MODEL_FEATURES columns
    """
    features = pd.DataFrame()

    features["burn_rate_pct"] = compute_burn_rate(
        df["cumulative_expenditure_cr"], df["revised_cost_cr"]
    )
    features["burn_progress_gap"] = compute_burn_progress_gap(
        features["burn_rate_pct"], df["physical_progress_pct"]
    )
    features["time_elapsed_ratio"] = compute_time_elapsed_ratio(
        pd.to_datetime(df["original_start_date"]),
        pd.to_datetime(df["scheduled_completion_date"]),
        snapshot_date,
    )
    features["physical_progress_pct"] = df["physical_progress_pct"]
    features["cost_variation_pct"] = compute_cost_variation(
        df["original_cost_cr"], df["revised_cost_cr"]
    )
    features["original_cost_cr"] = df["original_cost_cr"]
    features["revised_cost_cr"] = df["revised_cost_cr"]

    return features[MODEL_FEATURES]


def chronological_train_val_test_split(
    df: pd.DataFrame,
    snapshot_col: str = "snapshot_date",
    train_cutoff: str = "2024-12-31",
    val_cutoff: str = "2025-06-30",
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Splits dataset chronologically to prevent temporal data leakage.

    CRITICAL: Never use a random split for time-series project data.
    A random split allows the model to "see" future project outcomes during training.

    Split:
        Train: snapshot_date <= train_cutoff       (e.g., all data up to Dec 2024)
        Val:   train_cutoff < snapshot_date <= val_cutoff  (e.g., Jan–Jun 2025)
        Test:  snapshot_date > val_cutoff          (e.g., Jul 2025+)

    Args:
        df: Full DataFrame with snapshot_date column
        snapshot_col: Column name containing the report snapshot date
        train_cutoff: ISO date string for end of training period
        val_cutoff: ISO date string for end of validation period

    Returns:
        (train_df, val_df, test_df)
    """
    df[snapshot_col] = pd.to_datetime(df[snapshot_col])

    train = df[df[snapshot_col] <= train_cutoff]
    val = df[(df[snapshot_col] > train_cutoff) & (df[snapshot_col] <= val_cutoff)]
    test = df[df[snapshot_col] > val_cutoff]

    print(f"Train: {len(train)} rows | Val: {len(val)} rows | Test: {len(test)} rows")
    return train, val, test
