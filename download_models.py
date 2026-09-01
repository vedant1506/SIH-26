"""
PRISM Model Downloader
Downloads the full standalone merged Qwen 2.5 LLM directly from Hugging Face Model Hub.
"""
import os
from huggingface_hub import snapshot_download

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_DIR = os.path.join(ROOT_DIR, "ml", "models", "qwen_merged_full_model")
REPO_ID = "shahadpathan/prism-qwen2.5-1.5b-merged"

print("=" * 65)
print("  PRISM AI Model Auto-Downloader from Hugging Face")
print("=" * 65)
print(f"Downloading {REPO_ID} ...")
print(f"Target directory: {TARGET_DIR}")

snapshot_download(
    repo_id=REPO_ID,
    local_dir=TARGET_DIR,
    local_dir_use_symlinks=False
)

print("\nModel download complete! You can now run:")
print("  python start_all.py")
print("=" * 65)
