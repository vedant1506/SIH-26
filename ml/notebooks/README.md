# Notebooks — DS Teammate Workflow

Run these in order:

## 01_eda.ipynb
- Load raw MoSPI PAIMANA CSV from `data/raw/`
- Explore class distributions (delayed vs. not, cost overrun vs. not)
- Plot burn rate, physical progress, and time elapsed distributions
- Check for missing values and outliers

## 02_feature_engineering.ipynb
- Call `src/features.py → build_feature_matrix()` on the raw data
- Output a clean processed CSV to `data/processed/projects_features.csv`
- Verify no temporal leakage (snapshot_date must be < prediction date)

## 03_model_training.ipynb
- Alternatively, just run `python src/train_all.py` from the ml/ directory
- Visualize learning curves, SHAP waterfall plots, and confusion matrices
- Save models to `models/delay_model.pkl` and `models/cost_model.pkl`

## Shortcut (no real data yet?)
Run the synthetic data generator first:

    python src/generate_demo_data.py
    python src/train_all.py
    python src/evaluate.py
