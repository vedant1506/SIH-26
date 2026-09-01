"""
Qwen 2.5-1.5B Merged Model Inference Service
Generates per-project mitigation recommendations using the locally trained QLoRA model.
"""
import os
import logging
import threading
from typing import Optional

logger = logging.getLogger(__name__)

_qwen_model = None
_qwen_tokenizer = None
_qwen_lock = threading.Lock()
_qwen_loading = False
_qwen_loaded = False

MERGED_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "ml", "models", "qwen_merged_full_model"
)


def _load_qwen():
    """Load the merged Qwen 2.5-1.5B model into memory (done once, cached)."""
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
            logger.error("Qwen merged model not found at: %s", model_path)
            return False

        logger.info("Loading Qwen 2.5-1.5B merged model from %s ...", model_path)
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch

        tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float32,   # CPU-safe float32
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

        logger.info("✓ Qwen 2.5-1.5B model loaded successfully on CPU.")
        return True

    except Exception as e:
        logger.error("Failed to load Qwen model: %s", e)
        with _qwen_lock:
            _qwen_loading = False
        return False


def is_loaded() -> bool:
    return _qwen_loaded


def generate_mitigation(
    project_name: str,
    sector: str,
    ministry: str,
    state: str,
    delay_prob: float,
    cost_prob: float,
    physical_progress: float,
    burn_rate: float,
    burn_gap: float,
    time_elapsed: float,
    shap_drivers: list,
    risk_tier: str,
    delay_months: float,
    cost_exposure_cr: float,
) -> str:
    """
    Run Qwen inference to generate a unique, project-specific mitigation plan.
    Falls back to template if model not loaded.
    """
    if not _qwen_loaded:
        ok = _load_qwen()
        if not ok:
            return _fallback_mitigation(
                project_name, sector, burn_gap, time_elapsed, risk_tier, delay_months
            )

    # Build the top 3 risk drivers from SHAP
    driver_lines = ""
    for i, d in enumerate(shap_drivers[:3], 1):
        if isinstance(d, dict):
            direction = "INCREASES" if d.get("direction") == "positive" else "REDUCES"
            driver_lines += f"  {i}. {d.get('label', d.get('feature', 'Risk factor'))} — {direction} risk by {abs(float(d.get('value', 0))) * 100:.1f}%\n"
        elif isinstance(d, (list, tuple)) and len(d) >= 2:
            driver_lines += f"  {i}. {d[0]} — metric factor: {d[1]}\n"
        else:
            driver_lines += f"  {i}. {str(d)}\n"

    prompt = f"""<|im_start|>system
You are PRISM, an expert AI assistant for the Government of India's Ministry of Statistics and Programme Implementation (MoSPI). You analyze infrastructure project data and provide specific, actionable mitigation recommendations.
<|im_end|>
<|im_start|>user
Generate 3 specific, actionable mitigation recommendations for this infrastructure project:

PROJECT: {project_name}
SECTOR: {sector} | MINISTRY: {ministry} | STATE: {state}
RISK TIER: {risk_tier.upper()} | COMPOSITE RISK SCORE: {(delay_prob * 0.55 + cost_prob * 0.45) * 100:.1f}%

KEY METRICS:
- Physical Progress: {physical_progress:.1f}% completed
- Budget Spent (Burn Rate): {burn_rate:.1f}%
- Burn-Progress Gap: {burn_gap:+.1f}% (negative = efficient, positive = overspending)
- Timeline Elapsed: {time_elapsed * 100:.1f}%
- Forecasted Delay: {delay_months:.1f} months
- Cost Exposure: ₹{cost_exposure_cr:.1f} Crore

TOP AI RISK DRIVERS (from SHAP analysis):
{driver_lines}
Provide exactly 3 numbered mitigation actions. Each action should be:
- Specific to this sector ({sector}) and state ({state})
- Actionable by the Ministry within 30 days
- Address the top risk drivers identified above
<|im_end|>
<|im_start|>assistant
"""

    try:
        import torch
        inputs = _qwen_tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = _qwen_model.generate(
                **inputs,
                max_new_tokens=300,
                temperature=0.7,
                do_sample=True,
                top_p=0.9,
                repetition_penalty=1.1,
                pad_token_id=_qwen_tokenizer.eos_token_id,
            )
        generated = _qwen_tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:],
            skip_special_tokens=True
        ).strip()
        return generated if generated else _fallback_mitigation(
            project_name, sector, burn_gap, time_elapsed, risk_tier, delay_months
        )
    except Exception as e:
        logger.error("Qwen inference error: %s", e)
        return _fallback_mitigation(
            project_name, sector, burn_gap, time_elapsed, risk_tier, delay_months
        )


def _fallback_mitigation(
    project_name: str, sector: str, burn_gap: float,
    time_elapsed: float, risk_tier: str, delay_months: float
) -> str:
    """Template fallback if Qwen model unavailable."""
    s = (sector or "").lower()
    if "road" in s or "highway" in s:
        action2 = "Expedite Right-of-Way (ROW) land compensation disbursements with district collectors and fast-track state utility line shifting."
    elif "rail" in s:
        action2 = "Secure non-interlocking (NI) traffic blocks with zonal railway divisions and accelerate electronic interlocking installations."
    elif "aviation" in s or "airport" in s:
        action2 = "Fast-track DGCA regulatory clearances, coordinate with AAI for airfield ground lighting cabling and aerodrome licensing."
    elif "power" in s or "energy" in s:
        action2 = "Expedite grid synchronization approvals with state DISCOM and fast-track substation equipment procurement."
    else:
        action2 = "Deploy additional contractor resources and establish weekly site-level monitoring committees chaired by regional directors."

    if burn_gap > 10:
        action1 = "Conduct immediate joint site audit of financial invoices against physical work completion. Freeze unverified billing claims and enforce milestone-linked escrow disbursements."
    else:
        action1 = "Authorize 24/7 dual-shift construction operations. Accelerate pending land acquisition, environmental clearances, and utility shifting to recover lost schedule."

    if delay_months > 12:
        action3 = f"Initiate a formal MoSPI-Ministry review within 7 days. Recommend contract re-structuring with penalty clauses and appoint an independent project management consultant for {project_name}."
    else:
        action3 = "Re-evaluate material procurement contracts and cap price escalation clauses. Re-allocate unused project contingency reserves and mandate value-engineering review."

    return f"1. {action1}\n\n2. {action2}\n\n3. {action3}"
