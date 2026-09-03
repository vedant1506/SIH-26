import sys
from pathlib import Path
from functools import lru_cache
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Database — ALWAYS Port 6543 (Transaction Pooler)
    # WARNING: Do NOT use Port 5432 (Session mode). It will exhaust
    # database connections during high-load ML inference and crash the API.
    database_url: str = ""

    # App
    secret_key: str = "sih26103-secret-key-change-in-production-32chars"
    environment: str = "development"
    api_prefix: str = "/api/v1"

    # ML
    ml_models_path: str = str(BACKEND_DIR.parent / "ml" / "SIH26103_ML_FINAL")

    # Centralized AI Models & Multi-LLM Critic Settings
    ai_primary_model: str = "Qwen2.5-Instruct (Local Transformer Model)"
    ai_validator_model: str = "DeepSeek-R1 / Independent Policy Auditor"
    ai_fallback_model: str = "Llama-3.3-70B-Instruct"
    openrouter_api_key: str = ""
    groq_api_key: str = ""
    openai_api_key: str = ""
    deepseek_api_key: str = ""
    gemini_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434/v1"
    preferred_llm_model: str = "auto"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
