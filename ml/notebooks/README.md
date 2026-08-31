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

---

## 04_colab_llm_finetuning (Google Colab QLoRA Fine-Tuning)
To train the PRISM AI Advisory LLM (`Qwen/Qwen2.5-1.5B-Instruct`) on free Google Colab T4 GPU:
1. Open [Google Colab](https://colab.research.google.com/).
2. Click **Upload** and upload `ml/notebooks/PRISM_QLoRA_Colab_FineTuning.ipynb`.
3. Set Runtime to **T4 GPU** (`Runtime > Change runtime type > T4 GPU`).
4. Upload `ml/data/processed/llm_train.jsonl` when prompted (or drag into Colab file manager).
5. Run all cells (`Ctrl+F9`).
6. At the end, the notebook automatically downloads `prism_qwen2.5_qlora_adapter.zip`.
7. Unzip the downloaded adapter into `ml/models/qwen_qlora_adapter/` in your local project.

