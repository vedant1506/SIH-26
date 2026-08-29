# SIH26103 — Infrastructure Risk Intelligence Platform

> **Problem Statement:** Web-Based Integrated Project-Monitoring Platform  
> **Theme:** Smart Automation / Software  
> **Team:** [Insert Team Name & ID]

An AI-powered platform that converts static infrastructure monitoring data into **explainable risk predictions**, **early warnings**, and **geospatial dashboards** for government decision-makers.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Repository Structure](#repository-structure)
- [Team Ownership](#team-ownership)
- [Quick Start (Full Stack)](#quick-start-full-stack)
- [Supabase Setup](#supabase-setup)
- [Backend Setup (FastAPI)](#backend-setup-fastapi)
- [Frontend Setup (Next.js)](#frontend-setup-nextjs)
- [ML Setup (DS Teammate)](#ml-setup-ds-teammate)
- [Environment Variables Reference](#environment-variables-reference)
- [API Reference](#api-reference)
- [Critical Rules — Read Before Coding](#critical-rules--read-before-coding)
- [Tech Stack](#tech-stack)

---

## Architecture Overview

```
[Next.js 15 Frontend]
        │
        │  All requests go through FastAPI — NEVER direct to Supabase
        ▼
[FastAPI Backend]  ──→  [ML Service Layer]  ──→  [Trained XGBoost Models]
        │                                              (ml/models/)
        │  Port 6543 Transaction Pooler (NOT 5432)
        ▼
[Supabase PostgreSQL]
```

**Data Flow:**
1. Frontend calls FastAPI API
2. FastAPI fetches project data from Supabase
3. FastAPI passes data to ML service → gets risk scores + SHAP values
4. FastAPI returns enriched response (data + predictions + SHAP) to Frontend
5. Frontend renders dashboard with risk tiers, SHAP waterfall charts, and map

---

## Repository Structure

```
SIH 2026/
├── README.md                   ← You are here
├── .gitignore
├── docker-compose.yml          ← Run everything with one command
│
├── frontend/                   ← Next.js 15 Dashboard (Vedant)
├── backend/                    ← FastAPI + ML serving (Vedant)
├── ml/                         ← Model training & data science (DS Teammate)
└── md_files/                   ← Project documentation
    ├── prd.md
    ├── techstack.md
    └── design.md
```

---

## Team Ownership

| Folder | Owner | Description |
|---|---|---|
| `frontend/` | **Vedant** | Next.js dashboard, all UI pages, API client |
| `backend/` | **Vedant** | FastAPI server, auth, DB layer, ML serving endpoint |
| `ml/` | **DS Teammate** | Model training, feature engineering, saving `.pkl` models |
| `md_files/` | Shared | Documentation — read before coding |

---

## Quick Start (Full Stack)

### Prerequisites
- Node.js 20+
- Python 3.11+
- Git

### 1. Clone the Repo
```bash
git clone https://github.com/YOUR_ORG/sih26103.git
cd sih26103
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your Supabase credentials
uvicorn app.main:app --reload --port 8000
```
> API docs available at: http://localhost:8000/docs

### 3. Frontend (in a new terminal)
```bash
cd frontend
npm install
cp .env.example .env.local      # Fill in your Supabase & API URL
npm run dev
```
> App available at: http://localhost:3000

### 4. ML (DS Teammate — separate terminal)
```bash
cd ml
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Drop your CSV files into ml/data/raw/
# Run notebooks in order: 01 → 02 → 03
# Trained models go into ml/models/ — backend will load them
```

---

## Supabase Setup

> Full step-by-step guide: [Supabase Setup](./md_files/supabase_setup.md)

**Quick summary:**
1. Create project at [supabase.com](https://supabase.com) → Region: `ap-south-1`
2. Go to **Settings → Database** → copy the **Transaction** connection string (Port **6543**)
3. Go to **Settings → API** → copy `anon key`, `service_role key`, and `JWT Secret`
4. Run the SQL schema from `md_files/supabase_setup.md` in the SQL Editor
5. Fill in `backend/.env` with the copied values

---

## Backend Setup (FastAPI)

### Structure
```
backend/app/
├── main.py          ← FastAPI app, CORS, router registration
├── core/
│   ├── config.py    ← All env vars loaded via pydantic-settings
│   ├── database.py  ← SQLAlchemy engine (Port 6543!)
│   └── security.py  ← JWT decode + role-based permission checks
├── models/          ← SQLAlchemy ORM table definitions
├── schemas/         ← Pydantic request/response models
├── routers/         ← API route handlers
└── services/
    ├── ml_service.py   ← Loads ML models, runs predictions + SHAP
    └── alert_service.py ← Monitors risk changes, creates alerts
```

### API Endpoints
| Method | Route | Auth Required | Role |
|---|---|---|---|
| POST | `/auth/login` | No | — |
| GET | `/auth/me` | Yes | Any |
| GET | `/projects` | Yes | Any |
| GET | `/projects/{id}` | Yes | Any |
| POST | `/projects/{id}/predict` | Yes | Any |
| GET | `/alerts` | Yes | Any |
| POST | `/alerts/{id}/acknowledge` | Yes | Officer+ |
| GET | `/analytics/portfolio` | Yes | Decision Maker |

---

## Frontend Setup (Next.js)

### Structure
```
frontend/app/
├── (auth)/login/       ← Login page
└── (dashboard)/
    ├── page.tsx         ← Portfolio Command Center (KPI + Risk Table)
    ├── projects/[id]/   ← Project Detail + SHAP Waterfall
    ├── map/             ← Geospatial Heatmap (MapLibre)
    ├── alerts/          ← Early Warning Feed
    └── analytics/       ← Data Analyst view
```

### Key Files
- `frontend/lib/api.ts` — **All** API calls go through this file. Never call Supabase directly from pages.
- `frontend/lib/types.ts` — Shared TypeScript interfaces (Project, Prediction, Alert, etc.)
- `frontend/lib/auth.ts` — Supabase Auth helpers (login, logout, session)

---

## ML Setup (DS Teammate)

> **Read `ml/README.md` for detailed instructions.**

### Your Workflow
1. Drop raw MoSPI PAIMANA CSV files into `ml/data/raw/`
2. Run `notebooks/01_eda.ipynb` — exploratory analysis
3. Run `notebooks/02_feature_engineering.ipynb` — creates `ml/data/processed/`
4. Run `notebooks/03_model_training.ipynb` OR the training scripts directly
5. Save trained models to `ml/models/delay_model.pkl` and `ml/models/cost_model.pkl`
6. The backend's `ml_service.py` automatically loads from these paths

### ⚠️ Critical: Temporal Data Leakage
**NEVER use future data to predict the past.**
- Train on data from snapshot dates **before** the prediction date
- Use a chronological split: e.g., train on 2023–2024 data, validate on Jan–Jun 2025, test on Jul–Dec 2025
- The `train_delay.py` script already enforces this — do not bypass it

### Evaluation Metrics
Do **NOT** evaluate on accuracy alone. Always use:
- **F1-Score** (macro-averaged across risk tiers)
- **ROC-AUC**
- **Precision & Recall** (especially for Critical class)
- `evaluate.py` is already set up to print all of these

---

## Environment Variables Reference

### `backend/.env`
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
SECRET_KEY=random_32_char_string
ENVIRONMENT=development
ML_MODELS_PATH=../ml/models
```

### `frontend/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## API Reference

### Risk Prediction Response Schema
```json
{
  "project_id": "uuid",
  "delay_probability": 0.82,
  "delay_duration_months": 7.3,
  "cost_overrun_probability": 0.74,
  "cost_overrun_amount_cr": 142.5,
  "composite_risk_score": 0.79,
  "risk_tier": "critical",
  "shap_values": [
    { "feature": "burn_progress_gap", "value": 0.35, "direction": "positive", "label": "Budget spent 35% faster than physical progress" },
    { "feature": "milestone_3_delay_days", "value": 0.18, "direction": "positive", "label": "Milestone 3 delayed by 62 days" },
    { "feature": "time_elapsed_ratio", "value": 0.12, "direction": "positive", "label": "72% of time elapsed with 45% physical progress" }
  ],
  "model_version": "v1.0",
  "predicted_at": "2026-08-28T04:00:00Z"
}
```

---

## Critical Rules — Read Before Coding

> These are from the official SIH problem guide. Violating them will fail the jury demo.

| # | Rule | Why |
|---|---|---|
| 1 | **Never connect Next.js directly to Supabase for project data** | All data must flow through FastAPI so SHAP values can be appended |
| 2 | **Always use Port 6543 (Transaction Pooler) for FastAPI's DB connection** | Port 5432 will exhaust connection limits and crash during the demo |
| 3 | **Never train with future data (temporal leakage)** | Model that "predicts" what already happened is scientifically invalid |
| 4 | **Never evaluate ML on accuracy alone** | With imbalanced classes, 95% accuracy = useless model |
| 5 | **LLM assistant is a secondary feature, not the product** | Dashboard, maps, and risk tables are the core — don't make it look like ChatGPT |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 15 (React, App Router) |
| Frontend Styling | Tailwind CSS + Shadcn UI + Tremor.so |
| Charts | Recharts (analytical), MapLibre / Leaflet (GIS) |
| Backend Framework | FastAPI (Python 3.11) |
| Data Validation | Pydantic v2 |
| ORM | SQLAlchemy 2.0 |
| Database | Supabase PostgreSQL (Port 6543) |
| Authentication | Supabase Auth (JWT + RBAC) |
| ML Models | XGBoost + Scikit-learn |
| Explainability | SHAP |
| Data Processing | Pandas + NumPy |
| Frontend Deploy | Vercel |
| Backend Deploy | Render / Railway |

---

## Reference Repository
ML model architecture references: [sairakbar/Predictive-Project-Risk-Intelligence-Platform](https://github.com/sairakbar/Predictive-Project-Risk-Intelligence-Platform)  
*(Use strictly as reference for XGBoost feature engineering logic — do not copy-paste blindly)*

---

*Built for Smart India Hackathon 2026 — Problem Statement SIH26103*
