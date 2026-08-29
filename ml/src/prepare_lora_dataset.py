"""
LoRA Fine-Tuning Data Preparation Script — SIH26103
===================================================
Converts tabular project risk data (from ml/data/processed/projects_features.csv)
into instruction-tuning prompt-response JSONL datasets for LoRA LLM training.

Output:
    ml/data/processed/train_lora_dataset.jsonl
"""

import os
import json
import pandas as pd

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DATA_PATH = os.path.join(ROOT_DIR, "data", "processed", "projects_features.csv")
OUTPUT_JSONL_PATH = os.path.join(ROOT_DIR, "data", "processed", "train_lora_dataset.jsonl")


def create_instruction_record(row: pd.Series) -> dict:
    original_cost = float(row.get("original_cost_cr") or 100.0)
    revised_cost = float(row.get("revised_cost_cr") or original_cost)
    expenditure = float(row.get("cumulative_expenditure_cr") or 0.0)
    physical_progress = float(row.get("physical_progress_pct") or 0.0)
    burn_gap = float(row.get("burn_progress_gap") or 0.0)
    time_elapsed = float(row.get("time_elapsed_ratio") or 0.0)
    cost_var = float(row.get("cost_variation_pct") or 0.0)
    is_delayed = int(row.get("is_delayed") or 0)
    is_overrun = int(row.get("is_cost_overrun") or 0)

    # Determine risk tier
    if is_delayed and is_overrun:
        risk_tier = "CRITICAL"
        delay_est = round(12.0 + (burn_gap * 0.4), 1)
    elif is_delayed or burn_gap > 15.0:
        risk_tier = "HIGH"
        delay_est = round(6.0 + (burn_gap * 0.3), 1)
    elif burn_gap > 5.0 or time_elapsed > 0.8:
        risk_tier = "MEDIUM"
        delay_est = round(2.0 + (burn_gap * 0.2), 1)
    else:
        risk_tier = "LOW"
        delay_est = 0.5

    input_text = (
        f"Original Sanctioned Cost: ₹{original_cost:.2f} Cr\n"
        f"Revised Sanctioned Cost: ₹{revised_cost:.2f} Cr (Cost Revision: {cost_var:+.1f}%)\n"
        f"Cumulative Expenditure: ₹{expenditure:.2f} Cr\n"
        f"Current Physical Progress: {physical_progress:.1f}%\n"
        f"Burn-Rate vs Progress Gap: {burn_gap:+.1f}%\n"
        f"Time Elapsed Ratio: {time_elapsed * 100:.1f}% of scheduled duration\n"
    )

    output_text = (
        f"### Executive Risk Assessment\n"
        f"**Risk Classification:** {risk_tier}\n"
        f"**Estimated Schedule Delay:** {delay_est} months\n\n"
        f"**Risk Analysis:**\n"
        f"1. **Expenditure Velocity:** The project has logged a burn-rate gap of {burn_gap:+.1f}%, indicating budget consumption {'outpacing' if burn_gap > 0 else 'lagging'} physical milestone execution.\n"
        f"2. **Schedule Health:** {time_elapsed * 100:.1f}% of scheduled contract time has elapsed against {physical_progress:.1f}% physical completion.\n"
        f"3. **Financial Exposure:** Cost variation currently stands at {cost_var:+.1f}% over the initial sanctioned budget of ₹{original_cost:.2f} Cr.\n\n"
        f"**Recommended Action Plan:**\n"
        f"- {'Conduct immediate joint technical audit and review contractor milestone mobilization.' if risk_tier in ('CRITICAL', 'HIGH') else 'Maintain active monthly flash report tracking.'}"
    )

    return {
        "instruction": "You are PRISM AI, an expert infrastructure risk analyst. Analyze the following project metrics and issue an executive risk intelligence report.",
        "input": input_text,
        "output": output_text,
    }


def main():
    print(f"Loading processed features from {PROCESSED_DATA_PATH}...")
    if not os.path.exists(PROCESSED_DATA_PATH):
        raise FileNotFoundError(f"Processed dataset not found at {PROCESSED_DATA_PATH}")

    df = pd.read_csv(PROCESSED_DATA_PATH)
    print(f"Loaded {len(df)} project observation records.")

    records = [create_instruction_record(row) for _, row in df.iterrows()]

    os.makedirs(os.path.dirname(OUTPUT_JSONL_PATH), exist_ok=True)
    with open(OUTPUT_JSONL_PATH, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"[OK] Saved {len(records)} LoRA instruction-tuning prompt records to {OUTPUT_JSONL_PATH}")


if __name__ == "__main__":
    main()

