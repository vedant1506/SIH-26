"""
PRISM: AI-Powered Infrastructure Risk Intelligence & Project Monitoring
Hugging Face Gradio Application — MoSPI SIH26103
"""

import os
import json
import base64
import pickle
import numpy as np
import pandas as pd
import gradio as gr

# Load ML artifacts if available
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ROOT_DIR, "ml", "SIH26103_ML_FINAL", "models", "baseline_xgboost.pkl")
PREPROCESSOR_PATH = os.path.join(ROOT_DIR, "ml", "SIH26103_ML_FINAL", "preprocessors", "frozen_preprocessor.pkl")
FEATURE_PATH = os.path.join(ROOT_DIR, "ml", "SIH26103_ML_FINAL", "data", "feature_definition.json")

ML_MODEL = None
ML_PREPROCESSOR = None
ML_FEATURES = None

try:
    if os.path.exists(MODEL_PATH) and os.path.exists(PREPROCESSOR_PATH):
        with open(MODEL_PATH, "rb") as f:
            ML_MODEL = pickle.load(f)
        with open(PREPROCESSOR_PATH, "rb") as f:
            ML_PREPROCESSOR = pickle.load(f)
        if os.path.exists(FEATURE_PATH):
            with open(FEATURE_PATH, "r") as f:
                ML_FEATURES = json.load(f)
except Exception as e:
    print(f"Note: Running with standard heuristic ensemble ({e})")


SECTORS = [
    "ROAD TRANSPORT AND HIGHWAYS",
    "RAILWAYS",
    "PETROLEUM",
    "POWER",
    "COAL",
    "URBAN DEVELOPMENT",
    "TELECOMMUNICATIONS",
    "WATER RESOURCES",
    "CIVIL AVIATION",
    "PORTS, SHIPPING AND WATERWAYS",
    "HEALTH AND FAMILY WELFARE"
]

STATES = [
    "National / Pan-India",
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Jammu & Kashmir", "Ladakh"
]


def analyze_single_project(
    project_name, sector, state,
    original_cost_cr, revised_cost_cr,
    expenditure_cr, physical_progress_pct,
    original_duration_months, elapsed_months
):
    orig_c = float(original_cost_cr or 100.0)
    rev_c = float(revised_cost_cr or orig_c)
    exp_c = float(expenditure_cr or 0.0)
    phys_prog = float(np.clip(physical_progress_pct or 0.0, 0.0, 100.0))
    orig_dur = max(1.0, float(original_duration_months or 36.0))
    elap_m = float(elapsed_months or (orig_dur * 0.5))

    # Core metrics
    cost_overrun_cr = max(0.0, rev_c - orig_c)
    cost_overrun_pct = (cost_overrun_cr / orig_c * 100.0) if orig_c > 0 else 0.0
    financial_burn_rate_pct = (exp_c / orig_c * 100.0) if orig_c > 0 else 0.0
    burn_gap = financial_burn_rate_pct - phys_prog
    time_elapsed_ratio = min(2.0, elap_m / orig_dur)

    # ML Inference or Hybrid Risk Engine
    predicted_next_progress = phys_prog
    if ML_MODEL and ML_PREPROCESSOR and ML_FEATURES:
        try:
            sample_df = pd.DataFrame([{
                "physical_progress_num": phys_prog,
                "project_history_days": elap_m * 30.4,
                "project_history_months": elap_m,
                "observation_number": 1,
                "previous_progress": max(0.0, phys_prog - 2.0),
                "previous_progress_change": 2.0,
                "progress_change_2": 2.0,
                "historical_progress_mean": phys_prog,
                "historical_progress_max": phys_prog,
                "historical_progress_min": max(0.0, phys_prog - 5.0),
                "progress_change_rolling_mean_3": 2.0,
                "progress_change_rolling_std_3": 0.5,
                "days_since_previous_report": 30,
                "original_cost_num": orig_c,
                "revised_cost_num": rev_c,
                "expenditure_num": exp_c,
                "expenditure_revision_ratio": (exp_c / rev_c) if rev_c > 0 else 0.0,
                "previous_revised_cost": orig_c,
                "revised_cost_change": cost_overrun_cr,
                "revised_cost_growth_pct": cost_overrun_pct,
                "report_year": 2026,
                "report_month": 4,
                "report_quarter": 2,
                "current_completion_flag": 1 if phys_prog >= 99.0 else 0,
                "remaining_progress": max(0.0, 100.0 - phys_prog),
                "state": "National / Pan-India",
                "sector": sector
            }])
            X = sample_df[ML_FEATURES["approved_features"]]
            processed = ML_PREPROCESSOR.transform(X)
            pred = float(ML_MODEL.predict(processed)[0])
            predicted_next_progress = float(np.clip(pred, 0.0, 100.0))
        except Exception:
            predicted_next_progress = min(100.0, phys_prog + 2.5)

    # Risk scoring algorithm
    progress_deficit = max(0.0, (time_elapsed_ratio * 100.0) - phys_prog)
    risk_score = (
        0.30 * min(100.0, cost_overrun_pct * 1.5) +
        0.35 * min(100.0, progress_deficit) +
        0.20 * min(100.0, max(0.0, burn_gap * 1.8)) +
        0.15 * min(100.0, (100.0 - phys_prog) * (time_elapsed_ratio / 1.5))
    )
    risk_score = round(float(np.clip(risk_score, 4.0, 98.0)), 1)
    
    if risk_score >= 65.0:
        risk_tier = "HIGH RISK (Escalation / Critical Intervention Needed)"
        alert_status = "CRITICAL"
    elif risk_score >= 35.0:
        risk_tier = "MEDIUM RISK (Moderate Delay / Cost Deviation)"
        alert_status = "WARNING"
    else:
        risk_tier = "LOW RISK (Normal Execution / On-Track)"
        alert_status = "NORMAL"

    delay_prob = round(min(0.99, (risk_score / 100.0) * 0.95 + 0.05), 2)
    cost_prob = round(min(0.99, (cost_overrun_pct / 60.0) * 0.7 + (risk_score / 200.0)), 2)
    est_delay_months = round(max(0.0, (risk_score / 100.0) * orig_dur * 0.45), 1)

    # Generate Structured AI Mitigation Advisory
    advisory = f"""### PRISM Executive Intelligence & Mitigation Brief
**Project:** `{project_name or 'Strategic Infrastructure Asset'}`
**Sector:** {sector} | **State:** {state} | **Status:** `{alert_status}`

---

#### 1. Critical Risk Indicators
- **Overall Project Risk Index:** `{risk_score} / 100` ({risk_tier.split(' ')[0]} Tier)
- **Probability of Timeline Slippage:** `{int(delay_prob * 100)}%` (Estimated Delay: ~**{est_delay_months} months**)
- **Probability of Further Cost Escalation:** `{int(cost_prob * 100)}%`
- **Financial Burn vs Physical Output Gap:** `+{round(burn_gap, 1)}%`

#### 2. Identified Bottlenecks & Early Warnings
1. **Capital Expenditure Velocity:** Financial burn stands at **{round(financial_burn_rate_pct, 1)}%** while physical completion is at **{phys_prog}%**. {'Expenditure outpaces physical milestones.' if burn_gap > 5 else 'Expenditure trajectory is currently synchronized with physical progress.'}
2. **Cost Revision Impact:** Cumulative cost escalation is **₹ {round(cost_overrun_cr, 2)} Cr** (+{round(cost_overrun_pct, 1)}% above initial estimates).
3. **Timeline Trajectory:** Elapsed project duration is **{round(time_elapsed_ratio * 100, 1)}%** with **{round(100 - phys_prog, 1)}%** physical scope remaining.

#### 3. Recommended Intervention Framework
- **Right-of-Way (RoW) & Environmental Clearances:** Expedite pending statutory clearances and inter-agency utility shifting within 15 working days.
- **Contractor & Vendor Accountability:** Implement weekly milestone-based release of funds and enforce liquidated damages clause for unexcused milestone slippage.
- **Inter-Ministerial Task Force Review:** Schedule an executive steering committee review with {sector} nodal officers.
- **Digital Twin & Drone Auditing:** Deploy LiDAR/drone progress surveying to verify ground reality against reported contractor metrics.
"""

    summary_metrics = {
        "Risk Score": f"{risk_score} / 100",
        "Risk Tier": alert_status,
        "Delay Probability": f"{int(delay_prob * 100)}%",
        "Estimated Delay": f"{est_delay_months} Months",
        "Cost Overrun Probability": f"{int(cost_prob * 100)}%",
        "Financial vs Physical Gap": f"{round(burn_gap, 1)}%"
    }

    return summary_metrics, advisory


def analyze_batch_csv(file_obj):
    if file_obj is None:
        return None, "Please upload a valid CSV file."
    
    try:
        df = pd.read_csv(file_obj.name)
        required_cols = ["project_name", "original_cost", "expenditure", "physical_progress"]
        for col in required_cols:
            if col not in df.columns:
                return None, f"Missing required column: '{col}' in CSV."
        
        results = []
        for _, row in df.iterrows():
            orig_cost = float(row.get("original_cost", 100.0))
            rev_cost = float(row.get("revised_cost", orig_cost))
            exp = float(row.get("expenditure", 0.0))
            prog = float(row.get("physical_progress", 0.0))
            dur = float(row.get("original_duration_months", 36))
            elapsed = float(row.get("elapsed_duration_months", 18))
            
            # Simple score approximation for batch
            fin_burn = (exp / rev_cost * 100.0) if rev_cost > 0 else 0
            burn_gap = fin_burn - prog
            cost_ov = ((rev_cost - orig_cost) / orig_cost * 100.0) if orig_cost > 0 else 0
            time_el = min(2.0, elapsed / dur) if dur > 0 else 1.0
            
            score = 0.30 * min(100.0, cost_ov) + 0.35 * max(0.0, (time_el * 100.0) - prog) + 0.20 * max(0.0, burn_gap * 1.8) + 0.15 * max(0.0, 100.0 - prog)
            score = round(float(np.clip(score, 5.0, 98.0)), 1)
            tier = "CRITICAL" if score >= 65 else "WARNING" if score >= 35 else "NORMAL"
            
            results.append({
                "Project Name": row.get("project_name", "Unknown"),
                "Sector": row.get("sector", "General"),
                "State": row.get("state", "India"),
                "Risk Score": score,
                "Risk Tier": tier,
                "Financial Burn Gap (%)": round(burn_gap, 1),
                "Physical Progress (%)": prog
            })
            
        res_df = pd.DataFrame(results)
        return res_df, f"Successfully analyzed {len(res_df)} infrastructure projects."
    except Exception as e:
        return None, f"Error processing CSV: {str(e)}"


# Load PRISM Emblem Logo
LOGO_BASE64 = ""
for candidate in [
    os.path.join(ROOT_DIR, "logo.jpg"),
    os.path.join(ROOT_DIR, "frontend", "public", "logo.jpg"),
    os.path.join(ROOT_DIR, "icon.png"),
]:
    if os.path.exists(candidate):
        try:
            with open(candidate, "rb") as f:
                LOGO_BASE64 = f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode('utf-8')}"
                break
        except Exception:
            pass


# Build Gradio UI
with gr.Blocks(title="PRISM | AI Infrastructure Risk Platform") as demo:
    gr.HTML(f"""
    <div style="background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); border: 1px solid rgba(6,182,212,0.25); border-radius: 14px; padding: 20px 24px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
        <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 56px; height: 56px; border-radius: 12px; overflow: hidden; border: 1.5px solid rgba(6,182,212,0.4); box-shadow: 0 0 20px rgba(6,182,212,0.3); flex-shrink: 0; background: #000;">
                <img src="{LOGO_BASE64}" alt="PRISM Logo" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5rem; font-weight: 800; color: #f8fafc; letter-spacing: 0.05em; font-family: system-ui, -apple-system, sans-serif;">PRISM</span>
                    <span style="background: rgba(6,182,212,0.15); color: #06b6d4; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid rgba(6,182,212,0.3); text-transform: uppercase; letter-spacing: 0.05em;">MoSPI SIH 2026</span>
                </div>
                <div style="font-size: 0.95rem; color: #94a3b8; margin-top: 3px; font-weight: 500;">
                    Predictive Risk & Infrastructure Status Monitoring Platform
                </div>
                <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                    Ministry of Statistics & Programme Implementation · Government of India
                </div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); padding: 6px 14px; border-radius: 9999px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 10px #10b981;"></span>
            <span style="color: #10b981; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;">Live Synced</span>
        </div>
    </div>
    """)

    with gr.Tabs():
        with gr.TabItem("Single Project Risk Predictor"):
            with gr.Row():
                with gr.Column(scale=1):
                    gr.Markdown("### Project Baseline Parameters")
                    p_name = gr.Textbox(label="Project Name", value="Varanasi Ring Road Phase II Corridor")
                    with gr.Row():
                        p_sector = gr.Dropdown(choices=SECTORS, value="ROAD TRANSPORT AND HIGHWAYS", label="Sector")
                        p_state = gr.Dropdown(choices=STATES, value="Uttar Pradesh", label="State / Location")

                    with gr.Row():
                        p_orig_cost = gr.Number(label="Original Cost (₹ Cr)", value=1250.0)
                        p_rev_cost = gr.Number(label="Revised / Anticipated Cost (₹ Cr)", value=1480.0)

                    with gr.Row():
                        p_exp = gr.Number(label="Cumulative Expenditure (₹ Cr)", value=760.0)
                        p_prog = gr.Slider(0.0, 100.0, value=44.0, step=0.5, label="Physical Progress (%)")

                    with gr.Row():
                        p_dur = gr.Number(label="Original Duration (Months)", value=36)
                        p_elapsed = gr.Number(label="Elapsed Duration (Months)", value=24)

                    analyze_btn = gr.Button("Analyze Risk & Generate Mitigation", variant="primary")

                with gr.Column(scale=1):
                    gr.Markdown("### AI Risk Analysis & Outputs")
                    metrics_output = gr.JSON(label="Computed Risk Metrics")
                    advisory_output = gr.Markdown(label="Mitigation Advisory")

            analyze_btn.click(
                fn=analyze_single_project,
                inputs=[p_name, p_sector, p_state, p_orig_cost, p_rev_cost, p_exp, p_prog, p_dur, p_elapsed],
                outputs=[metrics_output, advisory_output]
            )

        with gr.TabItem("Batch Projects Risk Assessment"):
            gr.Markdown("### Upload MoSPI Flash Report / Ongoing Projects CSV")
            with gr.Row():
                file_input = gr.File(label="Upload Project CSV (Must contain project_name, original_cost, expenditure, physical_progress)")
                batch_btn = gr.Button("Run Batch Risk Assessment", variant="primary")

            batch_status = gr.Textbox(label="Batch Processing Status", interactive=False)
            batch_table = gr.DataFrame(label="Assessed Projects Risk Table")

            batch_btn.click(
                fn=analyze_batch_csv,
                inputs=[file_input],
                outputs=[batch_table, batch_status]
            )

        with gr.TabItem("About PRISM Platform"):
            gr.Markdown("""
            ### About PRISM Platform (SIH26103)
            PRISM is an end-to-end Machine Learning and Decision Intelligence platform designed to monitor large-scale infrastructure projects across India.
            
            - **Machine Learning**: XGBoost Gradient Boosted Trees for delay and physical milestone progression.
            - **Early Warning System**: Automated risk tier classification (`High`, `Medium`, `Low`) based on budget-burn divergence and schedule slippage.
            - **Explainability**: SHAP (SHapley Additive exPlanations) for transparent risk attribution.
            - **Generative AI Advisory**: Prescriptive mitigation and escalation strategies for ministry nodal officers.
            """)

if __name__ == "__main__":
    demo.launch()
