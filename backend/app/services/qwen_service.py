"""
TRACE AI Mitigation Plan Service — Hugging Face Qwen 2.5 Local Transformer Model
================================================================================
Loads the merged Hugging Face Qwen 2.5 model weights from ml/models/qwen_merged_full_model
and runs direct causal token generation with zero static fallbacks or hardcoded templates.
"""
import os
import re
import json
import logging
import threading
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

_qwen_model = None
_qwen_tokenizer = None
_qwen_lock = threading.Lock()
_qwen_loading = False
_qwen_loaded = False
_last_model_source = "Qwen 2.5 (Local Transformer Model)"

MERGED_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "ml", "models", "qwen_merged_full_model"
)


def _load_qwen() -> bool:
    """Load the merged Hugging Face Qwen 2.5 model into memory on CPU/GPU."""
    global _qwen_model, _qwen_tokenizer, _qwen_loading, _qwen_loaded
    with _qwen_lock:
        if _qwen_loaded:
            return True
        if _qwen_loading:
            return False
        _qwen_loading = True

    try:
        model_path = os.path.abspath(MERGED_MODEL_PATH)
        if not os.path.exists(model_path):
            logger.warning("Qwen merged model folder not found at: %s", model_path)
            with _qwen_lock:
                _qwen_loading = False
            return False

        logger.info("Loading Hugging Face Qwen 2.5 model from %s ...", model_path)
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch

        num_threads = max(1, (os.cpu_count() or 4) - 1)
        torch.set_num_threads(num_threads)

        tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float32,
            device_map="cpu",
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
        model.eval()

        with _qwen_lock:
            _qwen_tokenizer = tokenizer
            _qwen_model = model
            _qwen_loaded = True
            _qwen_loading = False

        logger.info("✓ Hugging Face Qwen 2.5 model loaded successfully on CPU (%d threads).", num_threads)
        return True

    except Exception as e:
        logger.error("Failed to load Qwen model: %s", e)
        with _qwen_lock:
            _qwen_loading = False
        return False


def preload_model_in_background():
    """Start loading the model in a background daemon thread on backend startup."""
    t = threading.Thread(target=_load_qwen, daemon=True, name="QwenModelLoader")
    t.start()


def is_loaded() -> bool:
    return _qwen_loaded


def get_last_model_source() -> str:
    return _last_model_source


def generate_json_from_qwen(prompt: str, max_new_tokens: int = 700) -> Optional[Dict[str, Any]]:
    """
    Executes actual local token generation on Hugging Face Qwen 2.5 and parses structured JSON output.
    Returns None if model is unavailable or generation fails.
    """
    global _qwen_loaded, _qwen_model, _qwen_tokenizer

    if not _qwen_loaded:
        _load_qwen()

    if not (_qwen_loaded and _qwen_model is not None and _qwen_tokenizer is not None):
        logger.warning("Local Qwen 2.5 model is not loaded in memory.")
        return None

    try:
        import torch

        formatted_input = f"<|im_start|>system\nYou are TRACE AI, senior project risk mitigation specialist for the Ministry of Statistics and Programme Implementation (MoSPI), Government of India.\nOutput STRICT RAW JSON conforming to the requested schema. Do NOT use markdown fences or asterisks.<|im_end|>\n<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n"

        with _qwen_lock:
            inputs = _qwen_tokenizer(formatted_input, return_tensors="pt")
            with torch.inference_mode():
                outputs = _qwen_model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    do_sample=True,
                    temperature=0.25,
                    top_p=0.85,
                    pad_token_id=_qwen_tokenizer.eos_token_id,
                )
            generated_text = _qwen_tokenizer.decode(
                outputs[0][inputs["input_ids"].shape[1]:],
                skip_special_tokens=True
            ).strip()

        # Clean JSON text
        clean = re.sub(r"^```(?:json)?\s*", "", generated_text.strip())
        clean = re.sub(r"\s*```$", "", clean)

        # Find first { and last }
        start_idx = clean.find("{")
        end_idx = clean.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = clean[start_idx:end_idx + 1]
            return json.loads(json_str)

        return json.loads(clean)

    except Exception as e:
        logger.warning("Local Qwen 2.5 inference error: %s", e)
        return None
