from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import (
    auth, projects, predictions, alerts, upload, temporary_analysis,
    analytics, actions, citizen, fraud, field_evidence, integrations,
    audit, notifications, documents, reports, geo,
)
from app.services import qwen_service

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-seed database if empty on fresh machine clone to ensure 100% data parity
    try:
        from app.core.database import SessionLocal, Base, engine
        from app.models.project import Project
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        if db.query(Project).count() == 0:
            from app.seed import seed_real_mospi_dataset, seed_demo_profiles
            seed_real_mospi_dataset(force=True)
            seed_demo_profiles()
        db.close()
    except Exception as se:
        print(f"Startup database initialization check note: {se}")
    yield


app = FastAPI(
    title="TRACE — Web-Based Integrated Project-Monitoring Platform API",
    description=(
        "AI-powered backend for the SIH26103 Web-Based Integrated Project-Monitoring Platform. "
        "Serves XGBoost risk predictions, SHAP explanations, early warning alerts, "
        "document management, audit logs, notifications, and grounded LLM intelligence."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow Next.js frontend (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-vercel-app.vercel.app",  # Replace with your Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Register routers
API_PREFIX = settings.api_prefix  # /api/v1

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(predictions.router, prefix=API_PREFIX)
app.include_router(projects.router, prefix=API_PREFIX)
app.include_router(alerts.router, prefix=API_PREFIX)
app.include_router(actions.router, prefix=API_PREFIX)
app.include_router(citizen.router, prefix=API_PREFIX)
app.include_router(citizen.router, prefix="/api", tags=["Public Citizen Portal Alias"])
app.include_router(citizen.router, prefix="", tags=["Public Citizen Portal Root Alias"])
app.include_router(fraud.router, prefix=API_PREFIX)
app.include_router(field_evidence.router, prefix=API_PREFIX)
app.include_router(integrations.router, prefix=API_PREFIX)
app.include_router(upload.router, prefix=API_PREFIX, tags=["Upload & Outside Data"])
app.include_router(temporary_analysis.router, prefix=f"{API_PREFIX}/temporary-analysis", tags=["Temporary Analysis"])
app.include_router(temporary_analysis.router, prefix=f"{API_PREFIX}/file-analysis", tags=["File Analysis Hub"])
app.include_router(temporary_analysis.router, prefix="/api/file-analysis", tags=["File Analysis Hub"])
app.include_router(analytics.router, prefix=API_PREFIX)
# New routers — Phase 2 additions
app.include_router(audit.router, prefix=API_PREFIX)
app.include_router(audit.audit_logs_router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(documents.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(geo.router, prefix=API_PREFIX)



@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": "TRACE Risk Intelligence API",
        "version": "2.0.0",
        "environment": settings.environment,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Aggregated platform health status."""
    return {
        "status": "ok",
        "service": "TRACE",
        "version": "2.0.0",
        "checks": {
            "api": "ok",
            "database": "see /health/database",
            "ml": "see /health/ml",
            "llm": "see /health/llm",
        },
    }


@app.get("/health/database", tags=["Health"])
async def health_database():
    """Returns real database connectivity status and project count."""
    from app.core.database import get_db
    from sqlalchemy import text
    try:
        db = next(get_db())
        result = db.execute(text("SELECT count(*) FROM projects")).fetchone()
        project_count = result[0] if result else 0
        pred_count = db.execute(text("SELECT count(*) FROM risk_predictions")).fetchone()[0]
        alert_count = db.execute(text("SELECT count(*) FROM alerts")).fetchone()[0]
        db.close()
        return {
            "status": "ok",
            "database_type": "SQLite",
            "project_count": project_count,
            "prediction_count": pred_count,
            "alert_count": alert_count,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@app.get("/health/ml", tags=["Health"])
async def health_ml():
    """Returns real ML model availability and readiness status."""
    import os
    ml_path = settings.ml_models_path

    # Check XGBoost models
    cost_model = os.path.join(ml_path, "..", "models", "cost_model.pkl")
    delay_model = os.path.join(ml_path, "..", "models", "delay_model.pkl")
    baseline_model = os.path.join(ml_path, "models", "baseline_xgboost.pkl")

    cost_ok = os.path.exists(cost_model)
    delay_ok = os.path.exists(delay_model)
    baseline_ok = os.path.exists(baseline_model)

    from app.services import ml_service
    model_loaded = ml_service._model is not None or ml_service._cost_model is not None

    return {
        "status": "ok" if (cost_ok or delay_ok or baseline_ok) else "degraded",
        "models": {
            "cost_model_pkl": "available" if cost_ok else "not_found",
            "delay_model_pkl": "available" if delay_ok else "not_found",
            "baseline_xgboost_pkl": "available" if baseline_ok else "not_found",
        },
        "model_loaded_in_memory": model_loaded,
        "model_version": ml_service._model_version or "unknown",
        "shap_available": True,
    }


@app.get("/health/llm", tags=["Health"])
async def health_llm():
    """Returns LLM availability status — checks local Qwen and cloud API keys."""
    import os
    from app.services import qwen_service as qs

    # Check Qwen model files
    qwen_merged = os.path.join(
        settings.ml_models_path, "..", "models", "qwen_merged_full_model"
    )
    qwen_adapter = os.path.join(
        settings.ml_models_path, "..", "models", "qwen_qlora_adapter"
    )
    has_local = (
        os.path.exists(qwen_merged) and any(
            f.endswith(".safetensors") for f in os.listdir(qwen_merged)
        ) if os.path.exists(qwen_merged) else False
    )
    has_adapter = os.path.exists(os.path.join(qwen_adapter, "adapter_model.safetensors"))

    has_openrouter = bool(settings.openrouter_api_key)
    has_groq = bool(settings.groq_api_key)
    has_openai = bool(settings.openai_api_key)

    overall = "ok" if (has_local or has_adapter or has_openrouter or has_groq or has_openai) else "degraded"

    return {
        "status": overall,
        "local_qwen_model": "available" if has_local else ("adapter_only" if has_adapter else "not_found"),
        "cloud_apis": {
            "openrouter": "configured" if has_openrouter else "not_configured",
            "groq": "configured" if has_groq else "not_configured",
            "openai": "configured" if has_openai else "not_configured",
        },
        "preferred_model": settings.preferred_llm_model,
    }


@app.get("/api/v1/health", tags=["Health"])
async def api_health():
    return {"status": "ok"}
