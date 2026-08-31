# SIH26103 — PRISM: Infrastructure Risk Intelligence Platform

> **Problem Statement:** Web-Based Integrated Project-Monitoring Platform  
> **Theme:** Smart Automation / Software  
> **Primary Demonstration Dataset:** MoSPI PAIMANA April 2026 (**Exactly 1,981 Projects**)

An enterprise, AI-powered platform transforming official Ministry of Statistics and Programme Implementation (MoSPI) monitoring data into **explainable XGBoost risk predictions**, **TreeSHAP feature attributions**, **geospatial intelligence**, and **fine-tuned Qwen 2.5 QLoRA executive briefings**.

---

## 🏛️ System Highlights & Verified Milestones
- **14 Historical Datasets**: 20,544 total observations across July 2025 – July 2026 ingested and audited (`data_audit_report.csv`).
- **April 2026 Primary Portfolio**: Mathematically verified **1,981 projects** totaling **₹42.78 Lakh Crore** outlay.
- **Geospatial Integrity**: 100% of projects anchored inland across Indian states and union territories (`geo_validation_report.csv`).
- **Dual XGBoost Engine**: Independent Delay and Cost Overrun classifiers with TreeSHAP factor attributions.
- **Qwen 2.5 QLoRA Instruction Fine-Tuning**: Zero-hallucination executive briefings based on verified project parameters.
- **Single Master Colab Pipeline**: `PRISM_SIH_2026_MASTER_ML_PIPELINE.ipynb` with Google Drive checkpointing.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Repository Structure](#repository-structure)
- [Single Master Google Colab Notebook](#single-master-google-colab-notebook)
- [Quick Start (Full Stack)](#quick-start-full-stack)
- [Backend & REST APIs](#backend--rest-apis)
- [Frontend & Geospatial Navigation](#frontend--geospatial-navigation)
- [Automated Verification Tests](#automated-verification-tests)
- [Critical Rules & SIH Standards](#critical-rules--sih-standards)

---

## Architecture Overview

```
[Next.js 16.3 Frontend (Port 3000)]
        │
        │  All requests go through FastAPI REST API — NEVER direct to Supabase
        ▼
[FastAPI Backend (Port 8000)]  ──→  [ML Service Layer]  ──→  [Dual XGBoost + TreeSHAP + QLoRA LLM]
        │                                                     (ml/models/)
        │  Port 6543 Transaction Pooler (or local sql_app.db)
        ▼
[PostgreSQL / SQLite Database]
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

---

## Single Master Google Colab Notebook

The complete end-to-end data audit, dual XGBoost training, TreeSHAP evaluation, composite risk calculation, and Qwen 2.5 QLoRA instruction fine-tuning are encapsulated in:  
**[`PRISM_SIH_2026_MASTER_ML_PIPELINE.ipynb`](./PRISM_SIH_2026_MASTER_ML_PIPELINE.ipynb)**

### Key Features:
- **Google Drive Checkpointing**: Persists models and datasets to `/MyDrive/PRISM_SIH_2026/`. If a Colab session disconnects, the notebook resumes from existing checkpoints.
- **Hardware Agnostic**: Detects T4/V100/A100 GPU and automatically configures 4-bit BitsAndBytes quantization (`nf4`).
- **All 31 Pipeline Steps**: Ingests all 14 MoSPI CSVs, validates the 1,981 April 2026 projects, trains XGBoost delay and cost models, generates TreeSHAP values, and fine-tunes the QLoRA adapter using Hugging Face TRL `SFTTrainer`.

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/vedant1506/SIH-26/blob/main/PRISM_SIH_2026_MASTER_ML_PIPELINE.ipynb)

---

## Automated Verification Tests

Run the full automated test suite to verify data integrity, models, APIs, and geospatial boundaries:

```bash
python -m unittest tests.test_master_pipeline
```

Test coverage includes:
- [x] All 14 CSV files load with verified headers and non-empty rows.
- [x] April 2026 dataset verified with exactly 1,981 unique projects and valid IDs.
- [x] Geospatial coordinates verified inside India's land boundaries (0 in ocean).
- [x] Dual XGBoost model files and Qwen QLoRA adapter verified.
- [x] FastAPI JWT authentication, portfolio analytics, and project listing endpoints verified.
- [x] Master Colab notebook JSON verified with all 31 pipeline sections.

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
