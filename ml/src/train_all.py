"""
Master ML Execution Pipeline — SIH26103
========================================
Runs all locally executable ML pipeline steps:
  - Temporal data splitting
  - XGBoost delay & cost models
  - ChatML dataset preparation
  - Final model package export

NOTE: LLM LoRA/QLoRA fine-tuning requires a GPU (run on Google Colab).
      Use ml/notebooks/colab_qlora_training.py on Colab for that step.

Run from the ml/ directory:
    python src/train_all.py
"""

import subprocess
import sys
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Only locally runnable scripts (no GPU required)
scripts = [
    "src/temporal_split.py",
    "src/train_delay.py",
    "src/train_cost.py",
    "src/prepare_advanced_qwen_dataset.py",
    "src/export_final_package.py",
]

def run_master_pipeline():
    print(f"\n{'='*70}")
    print("  PRISM AI — SIH26103 Local ML Pipeline")
    print(f"{'='*70}\n")
    print("  NOTE: LLM fine-tuning skipped (requires GPU — use Google Colab)")
    print(f"{'='*70}\n")

    for script in scripts:
        script_path = os.path.join(ROOT_DIR, script)
        if not os.path.exists(script_path):
            print(f"[SKIP] Missing script: {script}")
            continue
        print(f"\n>> Running: {script}")
        print("-" * 50)
        subprocess.run([sys.executable, "-X", "utf8", script_path], check=True)

    print(f"\n{'='*70}")
    print("  [SUCCESS] SIH26103 Local ML Pipeline completed!")
    print("  Models saved to: ml/models/")
    print("  Package saved to: ml/SIH26103_ML_FINAL/")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    run_master_pipeline()

