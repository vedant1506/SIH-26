"""
Master ML & Hugging Face Advanced Qwen QLoRA Execution Pipeline — SIH26103
===========================================================================
Runs end-to-end ChatML dataset preparation, Hugging Face Qwen-2.5 4-bit NF4 QLoRA (r=32) training,
and evaluation metrics reporting.

Run from the ml/ directory:
    python src/train_all.py
"""

import subprocess
import sys
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

scripts = [
    "src/prepare_advanced_qwen_dataset.py",
    "src/train_advanced_qwen_qlora.py",
    "src/evaluate_advanced_qwen.py"
]

def run_master_pipeline():
    print(f"\n{'='*70}")
    print("  PRISM AI — Master Advanced Qwen-2.5 QLoRA Fine-Tuning & Evaluation Pipeline")
    print(f"{'='*70}\n")

    for script in scripts:
        script_path = os.path.join(ROOT_DIR, script)
        print(f"\n>> Running: {script}")
        print("-" * 50)
        res = subprocess.run([sys.executable, "-X", "utf8", script_path], check=True)

    print(f"\n{'='*70}")
    print("  [SUCCESS] All Advanced Hugging Face Qwen-2.5 QLoRA models trained & evaluated!")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    run_master_pipeline()
