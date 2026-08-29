import json

import pickle
import numpy as np
import pandas as pd

MODEL_PATH = "models/baseline_xgboost.pkl"
PREPROCESSOR_PATH = "preprocessors/frozen_preprocessor.pkl"
FEATURE_PATH = "data/feature_definition.json"

with open(MODEL_PATH, "rb") as f:
    MODEL = pickle.load(f)

with open(PREPROCESSOR_PATH, "rb") as f:
    PREPROCESSOR = pickle.load(f)

with open(FEATURE_PATH, "r") as f:
    FEATURE_DEFINITION = json.load(f)


def predict_project(input_dataframe):
    """
    Predict next physical progress from a current-time observation.

    Input:
        pandas.DataFrame containing exactly the approved current-time
        model features.

    Output:
        float bounded to physical 0-100 range.
    """

    approved_features = FEATURE_DEFINITION["approved_features"]

    missing = [
        feature for feature in approved_features
        if feature not in input_dataframe.columns
    ]

    if missing:
        raise ValueError(
            "Missing approved features: " + ", ".join(missing)
        )

    X = input_dataframe[approved_features].copy()

    processed = PREPROCESSOR.transform(X)

    prediction = float(MODEL.predict(processed)[0])

    bounded_prediction = float(
        np.clip(prediction, 0.0, 100.0)
    )

    return bounded_prediction
