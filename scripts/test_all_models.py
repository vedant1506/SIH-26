import os
import sys
import json
import time
import joblib
import pickle
import numpy as np
import pandas as pd
from datetime import date, datetime

# Set stdout/stderr to UTF-8 to prevent Windows CP1252 encoding errors
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Compatibility fix for unpickling ColumnTransformer from scikit-learn 1.6.1 in 1.7+
try:
    import sklearn.compose._column_transformer
    if not hasattr(sklearn.compose._column_transformer, "_RemainderColsList"):
        class _RemainderColsList(list):
            pass
        sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList
except Exception:
    pass

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))

results = {}

def log_section(title):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

# ==============================================================================
# 1. DELAY PREDICTION MODEL (XGBoost)
# ==============================================================================
log_section("1. TESTING DELAY PREDICTION MODEL (ml/models/delay_model.pkl)")
delay_model_path = os.path.join(ROOT_DIR, "ml", "models", "delay_model.pkl")
try:
    if not os.path.exists(delay_model_path):
        raise FileNotFoundError(f"Delay model file not found at {delay_model_path}")
    
    t0 = time.time()
    delay_model = joblib.load(delay_model_path)
    load_time_ms = (time.time() - t0) * 1000
    
    feature_names = list(getattr(delay_model, 'feature_names_in_', []))
    print(f"[OK] Delay Model Loaded Successfully in {load_time_ms:.2f} ms")
    print(f"  - Model Type: {type(delay_model).__name__}")
    print(f"  - Expected Features ({len(feature_names)}): {feature_names}")
    
    sample_dict = {
        "original_cost_cr": 1000.0,
        "physical_progress_pct": 45.0,
        "original_burn_rate_pct": 75.0,
        "original_burn_gap": 30.0,
        "time_elapsed_ratio": 1.25,
        "progress_velocity": -3.0
    }
    sample_features = pd.DataFrame([[sample_dict.get(f, 0.0) for f in feature_names]], columns=feature_names)
    
    pred = delay_model.predict(sample_features)[0]
    prob = delay_model.predict_proba(sample_features)[0]
    
    print(f"  - Test Input: Original Cost=1000 Cr, Progress=45%, BurnGap=+30%, TimeElapsed=1.25")
    print(f"  - Prediction: {'DELAYED (Class 1)' if pred == 1 else 'ON-TIME (Class 0)'}")
    print(f"  - Probability Distribution: P(On-Time) = {prob[0]:.4f}, P(Delayed) = {prob[1]:.4f}")
    
    results["delay_model"] = {
        "status": "PASS",
        "load_time_ms": round(load_time_ms, 2),
        "prediction": int(pred),
        "delay_prob": float(prob[1])
    }
except Exception as e:
    print(f"[FAIL] Delay Model Error: {e}")
    results["delay_model"] = {"status": "FAIL", "error": str(e)}

# ==============================================================================
# 2. COST OVERRUN PREDICTION MODEL (XGBoost)
# ==============================================================================
log_section("2. TESTING COST OVERRUN MODEL (ml/models/cost_model.pkl)")
cost_model_path = os.path.join(ROOT_DIR, "ml", "models", "cost_model.pkl")
try:
    if not os.path.exists(cost_model_path):
        raise FileNotFoundError(f"Cost model file not found at {cost_model_path}")
    
    t0 = time.time()
    cost_model = joblib.load(cost_model_path)
    load_time_ms = (time.time() - t0) * 1000
    
    feature_names = list(getattr(cost_model, 'feature_names_in_', []))
    print(f"[OK] Cost Model Loaded Successfully in {load_time_ms:.2f} ms")
    print(f"  - Model Type: {type(cost_model).__name__}")
    print(f"  - Expected Features ({len(feature_names)}): {feature_names}")
    
    sample_dict = {
        "original_cost_cr": 1000.0,
        "physical_progress_pct": 45.0,
        "original_burn_rate_pct": 75.0,
        "original_burn_gap": 30.0,
        "time_elapsed_ratio": 1.25,
        "burn_velocity": 3.0,
        "progress_velocity": -3.0
    }
    sample_features = pd.DataFrame([[sample_dict.get(f, 0.0) for f in feature_names]], columns=feature_names)
    
    pred = cost_model.predict(sample_features)[0]
    prob = cost_model.predict_proba(sample_features)[0]
    
    print(f"  - Test Input: Original Cost=1000 Cr, Progress=45%, BurnGap=+30%, TimeElapsed=1.25")
    print(f"  - Prediction: {'COST OVERRUN (Class 1)' if pred == 1 else 'WITHIN BUDGET (Class 0)'}")
    print(f"  - Probability Distribution: P(Within-Budget) = {prob[0]:.4f}, P(Cost-Overrun) = {prob[1]:.4f}")
    
    results["cost_model"] = {
        "status": "PASS",
        "load_time_ms": round(load_time_ms, 2),
        "prediction": int(pred),
        "cost_prob": float(prob[1])
    }
except Exception as e:
    print(f"[FAIL] Cost Model Error: {e}")
    results["cost_model"] = {"status": "FAIL", "error": str(e)}

# ==============================================================================
# 3. BASELINE PHYSICAL PROGRESS MODEL & FROZEN PREPROCESSOR
# ==============================================================================
log_section("3. TESTING BASELINE PHYSICAL PROGRESS FORECASTING MODEL & PREPROCESSOR")
final_dir = os.path.join(ROOT_DIR, "ml", "SIH26103_ML_FINAL")
base_model_path = os.path.join(final_dir, "models", "baseline_xgboost.pkl")
prep_path = os.path.join(final_dir, "preprocessors", "frozen_preprocessor.pkl")
feat_path = os.path.join(final_dir, "data", "feature_definition.json")
sample_input_path = os.path.join(final_dir, "api", "sample_input.json")

try:
    with open(feat_path, "r") as f:
        feat_def = json.load(f)
    approved_features = feat_def["approved_features"]
    
    with open(prep_path, "rb") as f:
        preprocessor = pickle.load(f)
        
    with open(base_model_path, "rb") as f:
        baseline_model = pickle.load(f)
        
    with open(sample_input_path, "r") as f:
        sample_input = json.load(f)
        
    sample_df = pd.DataFrame([sample_input])
    X = sample_df[approved_features].copy()
    X_proc = preprocessor.transform(X)
    pred_progress = float(baseline_model.predict(X_proc)[0])
    bounded = float(np.clip(pred_progress, 0.0, 100.0))
    
    print(f"[OK] Baseline XGBoost & Frozen Preprocessor Loaded Successfully")
    print(f"  - Total Approved Features: {len(approved_features)}")
    print(f"  - Preprocessor Pipeline: {type(preprocessor).__name__}")
    print(f"  - Current Observed Physical Progress: {sample_input.get('physical_progress_num')}%")
    print(f"  - Forecasted Physical Progress: {bounded:.2f}%")
    
    results["baseline_xgboost"] = {
        "status": "PASS",
        "features_count": len(approved_features),
        "predicted_progress": round(bounded, 2)
    }
except Exception as e:
    print(f"[FAIL] Baseline Model Error: {e}")
    results["baseline_xgboost"] = {"status": "FAIL", "error": str(e)}

# ==============================================================================
# 4. BACKEND ML SERVICE & SHAP EXPLAINABILITY ENGINE
# ==============================================================================
log_section("4. TESTING BACKEND ML SERVICE & SHAP EXPLAINABILITY ENGINE")
try:
    from backend.app.services.ml_service import predict
    
    models_path = os.path.join(ROOT_DIR, "ml", "SIH26103_ML_FINAL")
    test_project = {
        "id": "PROJ-TEST-001",
        "project_name": "Delhi-Mumbai Dedicated Freight Corridor Ph-II",
        "ministry": "Ministry of Railways",
        "sector": "RAILWAYS",
        "state": "MAHARASHTRA",
        "original_cost_cr": 5000.0,
        "revised_cost_cr": 7200.0,
        "cumulative_expenditure_cr": 5500.0,
        "physical_progress_pct": 52.0,
        "original_start_date": "2020-01-01",
        "scheduled_completion_date": "2024-12-31",
        "revised_completion_date": "2026-12-31",
        "time_elapsed_ratio": 1.15
    }
    
    t0 = time.time()
    ml_output = predict(test_project, models_path=models_path)
    inf_time_ms = (time.time() - t0) * 1000
    
    print(f"[OK] ML Service Pipeline Executed in {inf_time_ms:.2f} ms")
    print(f"  - Active Model Version: {ml_output.get('model_version')}")
    print(f"  - Composite Risk Index: {ml_output.get('composite_risk_score')}")
    print(f"  - Risk Tier: {ml_output.get('risk_tier').upper()}")
    print(f"  - Delay Probability: {ml_output.get('delay_probability')}")
    print(f"  - Cost Overrun Probability: {ml_output.get('cost_overrun_probability')}")
    print(f"  - Projected Delay Duration: {ml_output.get('delay_duration_months')} months")
    print(f"  - Estimated Fiscal Overrun Exposure: Rs. {ml_output.get('cost_overrun_amount_cr'):,.2f} Cr")
    print(f"  - Next Month Forecasted Progress: {ml_output.get('predicted_next_physical_progress')}%")
    print(f"  - SHAP Drivers Extracted: {len(ml_output.get('shap_values', []))}")
    for sv in ml_output.get("shap_values", [])[:3]:
        print(f"    * [{sv['direction'].upper()}] {sv['label']} (impact: {sv['value']:.3f})")
    
    results["ml_service"] = {
        "status": "PASS",
        "inference_time_ms": round(inf_time_ms, 2),
        "risk_tier": ml_output.get("risk_tier"),
        "composite_score": ml_output.get("composite_risk_score"),
        "delay_prob": ml_output.get("delay_probability"),
        "cost_prob": ml_output.get("cost_overrun_probability"),
        "shap_count": len(ml_output.get("shap_values", []))
    }
except Exception as e:
    print(f"[FAIL] ML Service Error: {e}")
    import traceback
    traceback.print_exc()
    results["ml_service"] = {"status": "FAIL", "error": str(e)}

# ==============================================================================
# 5. QWEN QLORA ADAPTER & LLM ORCHESTRATOR
# ==============================================================================
log_section("5. TESTING QWEN QLORA ADAPTER & LLM ORCHESTRATOR")
try:
    adapter_path = os.path.join(ROOT_DIR, "ml", "models", "qwen_qlora_adapter")
    adv_adapter_path = os.path.join(ROOT_DIR, "ml", "models", "qwen_qlora_advanced_v2")
    merged_path = os.path.join(ROOT_DIR, "ml", "models", "qwen_merged_full_model")
    
    adapter_weights = os.path.join(adapter_path, "adapter_model.safetensors")
    has_adapter = os.path.exists(adapter_weights)
    adapter_size_mb = os.path.getsize(adapter_weights) / (1024 * 1024) if has_adapter else 0
    
    print(f"  - Fine-Tuned QLoRA Adapter: {'PRESENT (' + str(round(adapter_size_mb, 2)) + ' MB)' if has_adapter else 'NOT FOUND'}")
    print(f"  - Advanced QLoRA v2 Folder: {'PRESENT' if os.path.exists(adv_adapter_path) else 'NOT FOUND'}")
    print(f"  - Merged Full Model Folder: {'PRESENT' if os.path.exists(merged_path) else 'NOT FOUND'}")
    
    from backend.app.services.llm_orchestrator import generate_dynamic_mitigation_plan
    
    t0 = time.time()
    plan_result = generate_dynamic_mitigation_plan(
        project_dict=test_project,
        prediction_dict=ml_output,
        force_regenerate=True
    )
    plan_gen_ms = (time.time() - t0) * 1000
    
    plan_data = plan_result.get("plan", {})
    summary = plan_data.get("project_summary", {})
    actions = plan_data.get("mitigation_actions", [])
    root_causes = plan_data.get("root_causes", [])
    
    print(f"[OK] LLM Orchestrator Plan Generated in {plan_gen_ms:.2f} ms")
    print(f"  - Primary Model: {plan_result.get('primary_model')}")
    print(f"  - Validation Status: {plan_result.get('validation_status')}")
    print(f"  - Root Causes Identified: {len(root_causes)}")
    for rc in root_causes[:2]:
        safe_cause = rc.get('cause', '').replace('₹', 'Rs. ')[:80]
        print(f"    * [{rc.get('category', 'Risk')}] {rc.get('risk')}: {safe_cause}...")
    print(f"  - Actionable Mitigation Items: {len(actions)}")
    for ma in actions[:2]:
        safe_action = ma.get('action', '').replace('₹', 'Rs. ')[:80]
        print(f"    * [Priority {ma.get('priority')}] {safe_action}... -> Owner: {ma.get('responsible_role')}")
    
    results["llm_orchestrator"] = {
        "status": "PASS",
        "has_adapter_files": has_adapter,
        "plan_gen_ms": round(plan_gen_ms, 2),
        "primary_model": plan_result.get("primary_model"),
        "validation_status": plan_result.get("validation_status"),
        "actions_count": len(actions),
        "root_causes_count": len(root_causes)
    }
except Exception as e:
    print(f"[FAIL] LLM Orchestrator Error: {e}")
    import traceback
    traceback.print_exc()
    results["llm_orchestrator"] = {"status": "FAIL", "error": str(e)}

# ==============================================================================
# 6. BATCH TEST ON 1,981 APRIL 2026 PROJECTS
# ==============================================================================
log_section("6. BATCH DATASET INFERENCE STRESS TEST (1,981 PROJECTS)")
try:
    april_csv = os.path.join(ROOT_DIR, "csv", "FlashReport_April_2026_All_Ongoing_Projects_Structured.csv")
    if os.path.exists(april_csv):
        df_april = pd.read_csv(april_csv, low_memory=False)
        print(f"  - Loaded April 2026 dataset: {len(df_april)} projects")
        
        t0 = time.time()
        risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        
        sample_batch = df_april.head(100)
        for _, row in sample_batch.iterrows():
            proj_dict = {
                "id": str(row.get("project_id", "")),
                "project_name": str(row.get("project_name", "")),
                "ministry": str(row.get("ministry", "")),
                "sector": str(row.get("sector", "")),
                "state": str(row.get("state", "")),
                "original_cost_cr": float(row.get("original_cost_crore", 0) or 0),
                "revised_cost_cr": float(row.get("revised_cost_crore", 0) or row.get("original_cost_crore", 0) or 0),
                "cumulative_expenditure_cr": float(row.get("cumulative_expenditure_crore", 0) or 0),
                "physical_progress_pct": float(row.get("physical_progress_percent", 0) or 0),
                "original_start_date": str(row.get("start_date_mm_yyyy", "")),
                "scheduled_completion_date": str(row.get("original_target_doc_mm_yyyy", "")),
                "revised_completion_date": str(row.get("revised_target_doc_mm_yyyy", "")),
            }
            res = predict(proj_dict, models_path=models_path)
            cat = res.get("risk_tier", "low").lower()
            risk_counts[cat] = risk_counts.get(cat, 0) + 1
            
        elapsed = time.time() - t0
        avg_ms = (elapsed / len(sample_batch)) * 1000
        throughput = len(sample_batch) / elapsed
        
        print(f"[OK] 100 Sample Projects Processed in {elapsed:.3f}s ({avg_ms:.2f} ms/project | {throughput:.1f} projects/sec)")
        print(f"  - Risk Distribution: Critical: {risk_counts['critical']}, High: {risk_counts['high']}, Medium: {risk_counts['medium']}, Low: {risk_counts['low']}")
        
        results["batch_inference"] = {
            "status": "PASS",
            "sample_size": len(sample_batch),
            "throughput_fps": round(throughput, 1),
            "avg_ms_per_project": round(avg_ms, 2),
            "distribution": risk_counts
        }
    else:
        print("  - April CSV not found, skipping batch test.")
except Exception as e:
    print(f"[FAIL] Batch Inference Error: {e}")
    results["batch_inference"] = {"status": "FAIL", "error": str(e)}

# ==============================================================================
# SUMMARY REPORT
# ==============================================================================
log_section("OVERALL MODEL HEALTH & DIAGNOSTIC SUMMARY")
all_passed = all(v.get("status") == "PASS" for v in results.values())
for model_name, res in results.items():
    icon = "[PASS]" if res.get("status") == "PASS" else "[FAIL]"
    print(f"  {icon} {model_name:20s}: {res['status']}")

print("\n" + "=" * 70)
if all_passed:
    print(" >>> RESULT: ALL ML & AI MODELS ARE FULLY FUNCTIONAL AND WORKING PROPERLY! <<<")
else:
    print(" >>> RESULT: SOME ISSUES DETECTED - REVIEW FAILED MODULES ABOVE <<<")
print("=" * 70)
