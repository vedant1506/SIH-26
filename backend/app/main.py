from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import auth, projects, predictions, alerts, upload
from app.services import qwen_service

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload Hugging Face model in background thread
    qwen_service.preload_model_in_background()
    yield


app = FastAPI(
    title="PRISM — Predictive Risk and Infrastructure Status Monitoring API",
    description=(
        "AI-powered backend for the Web-Based Integrated Project-Monitoring Platform. "
        "Serves XGBoost risk predictions, SHAP explanations, and early warning alerts."
    ),
    version="1.0.0",
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

# Register routers
API_PREFIX = settings.api_prefix  # /api/v1

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(projects.router, prefix=API_PREFIX)
app.include_router(predictions.router, prefix=API_PREFIX)
app.include_router(alerts.router, prefix=API_PREFIX)
app.include_router(upload.router, prefix=API_PREFIX, tags=["Upload & Outside Data"])



@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": "PRISM Risk Intelligence API",
        "version": "1.0.0",
        "environment": settings.environment,
        "docs": "/docs",
    }


@app.get("/api/v1/health", tags=["Health"])
async def api_health():
    return {"status": "ok"}
