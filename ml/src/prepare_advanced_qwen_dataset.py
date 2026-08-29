"""
Prepare Advanced Qwen-2.5 ChatML Instruction-Tuning Dataset — SIH26103
========================================================================
Processes all 1,200 infrastructure project observations into ChatML structured
prompt-response pairs formatted for Hugging Face Qwen-2.5 Causal LLM.

Outputs:
    ml/data/processed/train_qwen_advanced_dataset.jsonl
"""

import os
import json
import pandas as pd

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_CSV_PATH = os.path.join(ROOT_DIR, "data", "processed", "projects_features.csv")
OUTPUT_JSONL_PATH = os.path.join(ROOT_DIR, "data", "processed", "train_qwen_advanced_dataset.jsonl")

SYSTEM_PROMPT = (
    "You are PRISM AI, an advanced infrastructure risk intelligence system for major capital projects in India. "
    "Analyze the provided financial expenditure, physical progress, and schedule metrics to generate a precise executive risk narrative."
)

def prepare_dataset():
    print(f"Loading processed features from {PROCESSED_CSV_PATH}...")
    if not os.path.exists(PROCESSED_CSV_PATH):
        raise FileNotFoundError(f"Processed CSV dataset not found at {PROCESSED_CSV_PATH}")

    df = pd.read_csv(PROCESSED_CSV_PATH)
    print(f"Loaded {len(df)} project observation records.")

    records = []
    for idx, row in df.iterrows():
        orig_cost = float(row.get("original_cost_cr") or 100.0)
        rev_cost = float(row.get("revised_cost_cr") or orig_cost)
        expenditure = float(row.get("cumulative_expenditure_cr") or 0.0)
        physical_progress = float(row.get("physical_progress_pct") or 0.0)
        burn_gap = float(row.get("burn_progress_gap") or 0.0)
        time_elapsed = float(row.get("time_elapsed_ratio") or 0.5)
        delay_months = float(row.get("delay_months_actual") or 0.0)
        is_delayed = int(row.get("is_delayed") or 0)
        is_cost_overrun = int(row.get("is_cost_overrun") or 0)

        # Risk classification
        composite = min(max((burn_gap / 100.0) * 0.45 + (time_elapsed - 0.5) * 0.45, 0.05), 0.95)
        tier = "CRITICAL" if composite >= 0.75 else ("HIGH" if composite >= 0.50 else ("MEDIUM" if composite >= 0.25 else "LOW"))

        user_input = (
            f"Analyze infrastructure project #{idx + 1:04d}.\n"
            f"- Original Sanctioned Budget: ₹{orig_cost:,.2f} Cr\n"
            f"- Revised Estimate Budget: ₹{rev_cost:,.2f} Cr\n"
            f"- Cumulative Expenditure: ₹{expenditure:,.2f} Cr\n"
            f"- Reported Physical Progress: {physical_progress:.1f}%\n"
            f"- Burn Rate vs Progress Gap: {burn_gap:+.1f}%\n"
            f"- Schedule Elapsed Ratio: {time_elapsed * 100:.1f}%\n"
            f"- Cost Overrun Status: {'Yes' if is_cost_overrun else 'No'}\n"
            f"- Schedule Delay Status: {'Yes' if is_delayed else 'No'} ({delay_months:.1f} months)"
        )

        response_output = (
            f"Executive Risk Analysis for Project #{idx + 1:04d}:\n"
            f"• Risk Classification: {tier} tier (Composite Risk Index: {composite * 100:.1f}%).\n"
            f"• Financial Divergence: Budget expenditure leads physical progress by {burn_gap:+.1f} percentage points. "
            f"Revised cost stands at ₹{rev_cost:,.2f} Cr against original budget of ₹{orig_cost:,.2f} Cr.\n"
            f"• Schedule Outlook: {time_elapsed * 100:.1f}% of allotted timeline has elapsed with an estimated schedule delay of {delay_months:.1f} months.\n"
            f"• Recommended Action: {'Immediate high-level ministry intervention and contractor performance audit required.' if tier in ('CRITICAL', 'HIGH') else 'Maintain standard milestone progress monitoring.'}"
        )

        # ChatML format structure for Hugging Face Qwen-2.5 Instruct
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input},
            {"role": "assistant", "content": response_output}
        ]

        records.append({"id": f"qwen-advanced-{idx+1:04d}", "messages": messages, "composite_risk_score": composite, "risk_tier": tier})

    os.makedirs(os.path.dirname(OUTPUT_JSONL_PATH), exist_ok=True)
    with open(OUTPUT_JSONL_PATH, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"[OK] Saved {len(records)} advanced ChatML prompt-response pairs to {OUTPUT_JSONL_PATH}")

if __name__ == "__main__":
    prepare_dataset()
