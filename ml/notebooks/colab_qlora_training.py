"""
Google Colab Hugging Face QLoRA Fine-Tuning Execution Script — SIH26103
========================================================================
Run this script in Google Colab (T4 / L4 / A100 GPU) to fine-tune
Alibaba Cloud Qwen-2.5-1.5B-Instruct using 4-bit NF4 Quantization & PEFT LoRA.

Setup instructions for Google Colab:
1. Enable GPU: Runtime -> Change runtime type -> T4 GPU
2. Install packages:
   !pip install -q torch transformers peft bitsandbytes trl datasets accelerate
3. Run this script:
   !python colab_qlora_training.py
"""

import os
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"
DATASET_PATH = "llm_train.jsonl"
OUTPUT_DIR = "prism_qwen2.5_qlora_adapter"

def run_colab_finetuning():
    logger.info(f"Starting Google Colab QLoRA Fine-Tuning for {MODEL_ID}...")

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
    from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training
    from datasets import load_dataset
    from trl import SFTTrainer, SFTConfig

    if not torch.cuda.is_available():
        logger.error("CUDA is not available. Please switch Google Colab runtime to GPU (T4/L4/A100).")
        return

    logger.info(f"GPU Detected: {torch.cuda.get_device_name(0)} with {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB VRAM.")

    logger.info("Configuring 4-Bit NF4 Quantization...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    logger.info(f"Loading Base LLM & Tokenizer: {MODEL_ID}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    peft_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=32,
        lora_alpha=64,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        bias="none",
    )

    training_args = SFTConfig(
        output_dir=OUTPUT_DIR,
        max_length=1024,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        logging_steps=10,
        num_train_epochs=3,
        fp16=True,
        optim="paged_adamw_8bit",
        lr_scheduler_type="cosine",
        save_strategy="epoch",
        save_total_limit=2,
        report_to="none",
    )

    logger.info("Initializing SFTTrainer...")
    if os.path.exists(DATASET_PATH):
        dataset = load_dataset("json", data_files={"train": DATASET_PATH})
        trainer = SFTTrainer(
            model=model,
            train_dataset=dataset["train"],
            peft_config=peft_config,
            args=training_args,
        )
        logger.info("Training QLoRA Model...")
        trainer.train()

    logger.info(f"Saving Fine-Tuned Adapter to {OUTPUT_DIR}...")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    logger.info("[SUCCESS] Colab QLoRA Fine-Tuning Completed!")

if __name__ == "__main__":
    run_colab_finetuning()
