# ML Module — DS Teammate Guide
**Project:** SIH26103 — Infrastructure Risk Intelligence Platform

> This folder is **your domain**. Vedant handles the frontend and backend API. Your job is to train the two XGBoost models and save them as `.pkl` files so the backend can load and serve them.

---

## Your Output (What the Backend Needs)

When you're done, save these two files:
```
ml/models/delay_model.pkl        ← XGBoost delay prediction model
ml/models/cost_model.pkl         ← XGBoost cost overrun prediction model
```

The backend's `ml_service.py` automatically loads from these paths. Once you save the files, predictions will use your real model instead of the heuristic stub.

---

## Input Features (What the Backend Passes to Your Model)

Your model **must** accept these 7 features in this exact order:

| Feature | Description |
|---|---|
| `burn_rate_pct` | Cumulative expenditure / Revised cost × 100 |
| `burn_progress_gap` | burn_rate_pct − physical_progress_pct |
| `time_elapsed_ratio` | Days elapsed / Total scheduled days (0–1) |
| `physical_progress_pct` | Physical work completed (0–100) |
| `cost_variation_pct` | (Revised cost − Original cost) / Original cost × 100 |
| `original_cost_cr` | Original project cost in Crore INR |
| `revised_cost_cr` | Revised project cost in Crore INR |

These are defined in `backend/app/services/ml_service.py → MODEL_FEATURES`.

---

## Workflow

### Step 1: Add Raw Data
Drop MoSPI PAIMANA CSV files into `ml/data/raw/`.

### Step 2: EDA
Run `notebooks/01_eda.ipynb` — understand the data, check class imbalances, plot distributions.

### Step 3: Feature Engineering
Run `notebooks/02_feature_engineering.ipynb` — computes the derived features above, outputs to `data/processed/`.

### Step 4: Train Models
Either run `notebooks/03_model_training.ipynb` OR the scripts:
```bash
python src/train_delay.py    # Trains delay model → saves to models/delay_model.pkl
python src/train_cost.py     # Trains cost model → saves to models/cost_model.pkl
python src/evaluate.py       # Prints F1, ROC-AUC, Precision, Recall
```

---

## ⚠️ Critical: No Temporal Leakage

**DO NOT** use future data to predict the past.

```
WRONG:  train on ALL data → predict on ALL data (leakage)
RIGHT:  train on data from snapshots before T → predict on snapshots at T
```

The `train_delay.py` script enforces a chronological split. Do not change the split logic.

---

## Evaluation Metrics

**NEVER use accuracy alone** — our dataset is heavily imbalanced (very few Critical projects).

Always report:
- **F1-Score** (macro-averaged)
- **ROC-AUC**
- **Precision** for Critical class
- **Recall** for Critical class
- Confusion matrix

`evaluate.py` already prints all of these.

---

## Reference
Architecture reference: [sairakbar/Predictive-Project-Risk-Intelligence-Platform](https://github.com/sairakbar/Predictive-Project-Risk-Intelligence-Platform)
