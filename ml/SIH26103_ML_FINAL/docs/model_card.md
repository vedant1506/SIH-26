# SIH26103 Model Card & Deliverable Specification

- **Model Name**: PRISM Project Risk Prediction & Intelligence Engine
- **Core Architecture**: XGBoost Classifiers (Delay & Cost Overrun) + SHAP Explainability + Hugging Face Qwen-2.5 4-Bit NF4 QLoRA LLM
- **Dataset**: PAIMANA 2023-2026 Project Observations
- **Risk Tiers**: LOW, MEDIUM, HIGH, CRITICAL
- **Date Generated**: 2026-08-30T16:23:56.675603

## Limitations
- Predictions require valid baseline cost and physical progress reports.
- Generative narrative module is constrained by verified XGBoost outputs to prevent hallucination.
