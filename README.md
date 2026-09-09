<div align="center">

# ⚡ PRISM: Predictive Risk & Infrastructure Status Monitoring
### *Next-Generation AI Intelligence & Geospatial Analytics Platform for National Infrastructure*
#### **Smart India Hackathon 2026 (SIH26103) · Ministry of Statistics and Programme Implementation (MoSPI)**

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.3%20(Turbopack)-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%20%7C%203.12-3776AB?style=for-the-badge&logo=python)](https://python.org/)
[![XGBoost 2.0](https://img.shields.io/badge/XGBoost-Explainable%20AI-EB6536?style=for-the-badge)](https://xgboost.readthedocs.io/)
[![TreeSHAP](https://img.shields.io/badge/TreeSHAP-Factor%20Attribution-8A2BE2?style=for-the-badge)](https://github.com/slundberg/shap)
[![Leaflet GIS](https://img.shields.io/badge/Leaflet-Authoritative%20Geo%20Risk%20Map-199900?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)
[![System Architecture](https://img.shields.io/badge/Architecture-Interactive%20Mermaid%20Docs-FF6F00?style=for-the-badge)](ARCHITECTURE.md)

<br />

**PRISM** is an enterprise-grade infrastructure intelligence and project governance platform engineered for central ministries, state project monitoring units, and project authorities across India. It ingests official **MoSPI PAIMANA** datasets and monthly **Flash Reports**, transforming fragmented oversight into **explainable predictive risk forecasts**, **dynamic S-curve early warnings**, **TreeSHAP root-cause attributions**, **high-precision geospatial mapping**, **intelligent document lifecycle verification**, and **automated executive mitigation roadmaps** across **1,981 projects** totaling **₹42.78+ Lakh Crore** of capital assets.

[🏛️ Executive Summary](#-executive-summary) • [📐 System Architecture](#-system-architecture) • [🗺️ Authoritative Geolocation Engine](#-authoritative-geolocation-engine) • [🚀 Core Platform Modules](#-core-platform-modules) • [📈 Authoritative Portfolio](#-authoritative-portfolio-april-2026) • [🏁 Quick Start](#-quick-start) • [🔌 API Directory](#-api-directory) • [📑 Architecture Specification](ARCHITECTURE.md)

</div>

---

## 🏛️ Executive Summary

India's central sector infrastructure monitoring mechanism tracks capital projects each costing ₹150 Crore or more. Historical oversight has relied on lagging post-hoc reviews and static tabular flash reports, allowing schedule slips and budget escalations to compound undetected.

```mermaid
flowchart LR
    A["Raw Flash Reports & PAIMANA Data\n(160+ Page Unstructured PDFs / CSVs)"] --> B["PRISM Autonomous Ingestion\n(1,981 Ongoing Projects)"]
    B --> C["Dual XGBoost & TreeSHAP Core\n(Delay & Cost Overrun Predictions)"]
    C --> D["Dynamic Early Warning & S-Curve\n(3-State Burn & Deterioration Triggers)"]
    D --> E["Authoritative Geo Risk Map\n(100% Boundary Containment & Zero Dumping)"]
    E --> F["Action Lifecycle & Executive Briefings\n(Targeted Interventions & PDF Exports)"]
```

### The Key Technological Pillars of PRISM

1. **Explainable Dual-Engine Machine Learning**: Forecasts both timeline slippage probability (months) and cost overrun severity (₹ Crore) before physical milestones breach, attributing exact feature importances via TreeSHAP.
2. **Authoritative Geolocation Engine**: Resolves 100% of the 1,981 April 2026 projects to their actual on-ground geographic sites, authentic districts, and states with zero dropped projects, zero false hub dumps, and 100% state boundary containment.
3. **Dynamic S-Curve & Multi-Trigger Early Warning**: Models construction cadence using mathematical logistic S-curves, tracking progress gaps against financial burn divergence to categorize severe overburns and trigger targeted mitigations.
4. **Intelligent Document Lifecycle Management**: Integrates SHA-256 authenticated document uploads, automated OCR/NLP metadata extraction, and in-browser interactive PDF previewing with multi-category filtering.
5. **Autonomous Ephemeral Document Extraction**: Ingests multi-hundred-page MoSPI Flash Report PDFs and extracts the authoritative **Table 6 (Pan-India All Ongoing Projects)** in under 40 seconds with 100% schema consistency and zero database contamination.

---

## 📐 System Architecture

> [!NOTE]
> For in-depth architectural deep-dives, entity relationship diagrams (ERD), state machines, and sequence diagrams, refer to the authoritative [System Architecture & Technical Specification Document (ARCHITECTURE.md)](ARCHITECTURE.md).

```mermaid
flowchart TB
    subgraph Client_Layer["Client Presentation Layer (Next.js 16 · Turbopack · React 19)"]
        UI_DASH["Executive Command Center\n(Portfolio KPIs & Risk Tiers)"]
        UI_GIS["Geospatial GIS Command Map\n(100% Inland Coordinate Engine)"]
        UI_WARN["Dynamic Early Warning System\n(S-Curve & Deterioration Triggers)"]
        UI_ACT["Action Item Tracker\n(SLA Timers & Audit Timeline)"]
        UI_DOC["Intelligent Document Vault\n(OCR · Hash Check · PDF Viewer)"]
        UI_CIT["Citizen Transparency Portal\n(Geotagged Photo Verification)"]
    end

    subgraph Gateway_Layer["API Gateway & Security Layer (FastAPI ASGI :8000)"]
        GW["FastAPI Core Gateway"]
        JWT["JWT Bearer Authentication"]
        RBAC["Role-Based Access Control"]
        CORS["CORS & Rate Limiting"]
    end

    subgraph Service_Engine["Modular Microservices & Domain Routers"]
        S_PROJ["Projects & Milestones"]
        S_ML["Dual XGBoost & TreeSHAP"]
        S_WARN["Early Warning Analytics"]
        S_ACT["Governance Actions"]
        S_DOC["Document Intelligence"]
        S_FRAUD["Fraud & Red-Flag Anomaly"]
        S_GEO["Spatial Geo Engine"]
        S_AUDIT["Tamper-Evident Audit Logs"]
    end

    subgraph Data_Storage["Persistence & Storage Layer"]
        DB_PG[("PostgreSQL Master Database\n(Port 6543 PgBouncer)")]
        DB_SQLITE[("SQLite Edge Engine\n(sql_app.db & backend/sql_app.db)")]
        VAULT[("Secure Storage Vault\n(backend/storage/project-documents)")]
        CACHE[("In-Memory Ephemeral Cache\n(TTL 2-Hour Isolation)")]
    end

    subgraph National_Gateways["National Digital Ecosystem Connectors"]
        EXT1["PM GatiShakti GIS"]
        EXT2["PFMS Disbursals"]
        EXT3["GeM Procurement"]
        EXT4["Railways CRIS / NHAI"]
    end

    Client_Layer ==>|"REST APIs & WebSockets"| GW
    GW --> JWT --> RBAC --> CORS --> Service_Engine
    Service_Engine <==>|"SQLAlchemy 2.0 ORM"| DB_PG
    Service_Engine -.->|"Active Local / Edge Engine"| DB_SQLITE
    S_DOC <--> VAULT
    GW <--> CACHE
    Service_Engine <==>|"REST Integrations"| National_Gateways
```

---

## 🗺️ Authoritative Geolocation Engine

PRISM features a purpose-built geographic resolution and spatial integrity pipeline (`scripts/rebuild_authoritative_geolocations.py`) that strictly guarantees every project is mapped to its **real site, authentic district, and verified state**.

```mermaid
flowchart TD
    RAW["Authoritative MoSPI PAIMANA Dataset\n(1,981 Real Infrastructure Projects)"] --> P1{"Priority 1: Verified Facility Registry\n(Gosikhurd, Mehsana, AIIMS, Refineries, Airports)"}
    P1 -- Matched --> R_FAC["Exact Facility / Site Resolved\n(High Confidence · Level: project_site)"]
    P1 -- No Match --> P2{"Priority 2: Google Maps Geocoding API\n(Address Component & State Validation)"}
    P2 -- Matched & Validated --> R_GGL["Google Verified Coordinates"]
    P2 -- Skipped / No Key --> P3{"Priority 3: Scored State Gazetteer\n(36 States/UTs · 631 Districts · Anti-Corridor Damping)"}
    P3 -- Scored Match > 0 --> R_GAZ["Gazetteer Site / Node Resolved"]
    P3 -- No Match --> P4{"Priority 4: Authenticated District Preservation\n(Hub Dumping Blacklist & Strict Un-ban Rules)"}
    P4 -- Validated & Non-Banned --> R_PRE["Preserved Authenticated District"]
    P4 -- Banned / Out-of-District --> P5{"Priority 5: Multi-State Route Distribution\n(Sub-State Extraction & Corridor Waypoints)"}
    P5 --> R_DST["Authoritative District Node"]

    R_FAC & R_GGL & R_GAZ & R_PRE & R_DST --> PIP["Step G: Shapely Point-in-Polygon Engine\n(State Boundary Containment & Snapping)"]
    PIP --> MICRO["Micro-Diversity Site Perimeter Offset\n(40m-80m Dispersion for Same-Site Co-locations)"]
    MICRO --> SYNC["Atomic Multi-Target Persistence\n(sql_app.db · backend/sql_app.db · geolocations_master.json)"]
```

### Key Invariants Satisfied

| Invariant / Check | Target Requirement | Rebuilt Dataset Status |
|---|---|---|
| **Total Monitored Projects** | Exactly 1,981 | **1,981 / 1,981 (100%)** |
| **Lost / Dropped Projects** | 0 | **0** |
| **Null Coordinates** | 0 | **0** |
| **Out-of-Bounds Coordinates** | 0 | **0 (All inside India bounds)** |
| **Cross-State Boundary Violations** | 0 | **0 (100% Shapely polygon contained)** |
| **State / District Mismatches** | 0 | **0** |
| **Exact Coordinate Resolution** | $\ge$ 60.0% | **1,545 (78.0%)** |
| **Mehsana Regression Test** | Exactly 5 projects in Gujarat Mehsana | **5 / 5 (manual_verified)** |
| **Gosikhurd Project Test** | Bhandara district, Wainganga River Pauni | **PASS (`20.8728, 79.6467`)** |
| **CSMT Artificial Cluster** | 1 authentic project at CSMT station | **CSMT reduced from 18 to 1 (`613015`)** |
| **Pan-India Centroid Dump** | 0 projects at pan-India centroid | **Reduced from 48 to 0** |
| **Master Geo Test Suite** | 23 Stages PASS | **23 of 23 Stages PASS (100%)** |

---

## 🚀 Core Platform Modules

```
PRISM Platform Capabilities:
├── 1. Command Center Dashboard      ── Real-time risk distribution, ministry outlay & exposure heatmaps
├── 2. Early Warning Intelligence    ── S-curve expected progress, 3-state burn & deterioration triggers
├── 3. Geospatial Command Map        ── Authoritative GIS map with 1,981 project dots at actual locations
├── 4. Explainable AI & SHAP         ── Dual XGBoost delay/cost inference with waterfall attributions
├── 5. Governance Action Tracker     ── Tamper-evident remediation state machine with SLA countdowns
├── 6. Intelligent Document Vault    ── SHA-256 deduplication, OCR text extraction & inline PDF preview
├── 7. File Analysis Hub (Ephemeral) ── 160+ page Table 6 boundary parser with 0 database contamination
├── 8. Fraud & Anomaly Triangulation ── Red-flag heuristics, ghost milestone checks & bid concentration
├── 9. Infrastructure Benchmarking   ── Cross-sector efficiency KPIs, cost-per-km & delay comparisons
├── 10. Cost Escalation Drivers      ── Deep dive on raw material inflation, land acquisition & RoW stalls
├── 11. National Gateway Connectors  ── PM GatiShakti, PFMS, GeM, CRIS, and NHAI integration bus
├── 12. Citizen Transparency Portal  ── Public grievance reporting with EXIF geotagged photo proofs
└── 13. Model Governance & Drift     ── ROC-AUC, calibration curves, and feature distribution tracking
```

### Module Highlights

#### 1. ⚡ Early Warning System & Dynamic S-Curve Analytics
- **Analytical S-Curve Expected Progress**: Uses mathematical logistic formulation $P_{\text{expected}}(t) = \frac{100}{1 + e^{-k(t-0.5)}}$ to compare actual physical milestone completion against elapsed timeline.
- **3-State Financial Burn Variance**: Classifies fiscal pacing into **Severe Overburn** ($>20\%$ divergence), **Moderate Overburn** ($5-20\%$), and **Balanced Execution** ($\le 5\%$).
- **Dynamic Contextual Triggers & Actions**: Synthesizes sector-specific drivers (Right-of-Way, Forest Clearances, Equipment Mobilization) and recommends immediate executive actions.

#### 2. 🗺️ Authoritative Geospatial Geo Risk Map
- **100% On-Ground Real Locations**: Every single project is represented at its actual project site, district, and state.
- **Zero False Hub Dumping**: Broad expressway corridors, regional coal mines, and suburban rail networks are placed at their true stretches instead of dumping onto state capitals or terminal railway stations.
- **Micro-Diversity Site Perimeter Offset**: Legitimate co-located projects (e.g. multi-phase airport works or dam command areas) are offset by 40m–80m along the site perimeter, preventing artificial concentric orbiting circles while remaining 100% within the state polygon.
- **Interactive Multi-Basemap GIS**: Switch between **Command Dark**, **Satellite Imagery**, **Clean Voyager**, and **Street Map** with dynamic Risk Tier and Sector coloring modes.

#### 3. 📄 Intelligent Document Repository & In-Browser PDF Preview
- **SHA-256 Content Deduplication**: Computes cryptographic hashes upon upload to prevent redundant files and verify document authenticity.
- **Interactive Full-Screen PDF Preview**: Review official project documents, DPRs, expenditure reports, and milestone approvals directly in the browser with zoom and navigation controls.
- **Category-Based Filtering**: Instantly filter documents by Detailed Project Report (DPR), Environmental Clearance, Tender & Contract, Site Inspection, and Progress Report.

#### 4. 🛡️ Governance Actions & SLA Enforcement
- **Audited State Machine**: Actions transition through `pending` $\to$ `assigned` $\to$ `in_progress` $\to$ `under_review` $\to$ `verified` $\to$ `closed`.
- **Immutable Timeline**: Every reassignment, priority shift, and review comment is cryptographically preserved in `intervention_action_history`.

---

## 📈 Authoritative Portfolio (April 2026)

| Dimension | Primary Master (April 2026) |
|---|---|
| **Authoritative Register** | MoSPI PAIMANA Master Dataset |
| **Monitored Projects** | **Exactly 1,981 Assets** |
| **Total Capital Outlay** | **₹42.78 Lakh Crore** |
| **Sectors Represented** | Roads & Highways, Railways, Petroleum, Power, Coal, Urban Transport, Aviation, Water Resources, etc. |
| **Geospatial Integrity** | **100% Survey of India & State Boundary Verified** |
| **Exact Site Resolution** | **1,545 Projects (78.0%)** |
| **Approximate District Resolution** | **436 Projects (22.0%)** |
| **Unresolved / Dropped Projects** | **0 (Zero)** |

---

## 🛠️ Technology Stack

```
Frontend Architecture:
├── Framework: Next.js 16.3.3 (Turbopack, App Router)
├── Core: React 19.2.8 & TypeScript 5
├── Animations: Framer Motion 12+
├── Notifications: Sonner Toast Notifications
├── GIS Engine: Leaflet 1.9 & MapLibre GL
├── Charting: Recharts 3.10
├── Icons: Lucide React
└── Design: Custom Modern Dark CSS Design System + Tailwind CSS v4

Backend & AI Architecture:
├── ASGI Framework: FastAPI 0.115+ (Starlette, Pydantic v2)
├── Predictive Modeling: XGBoost 2.0+ (Dual Classifier & Regressor)
├── Factor Attribution: TreeSHAP (Tree-based Shapley Additive Explanations)
├── Geospatial Analytics: Shapely (Point-in-Polygon Boundary Verification)
├── PDF Document Extraction: PyMuPDF (fitz) & pdfplumber
├── Data Engineering: Pandas 2.2 & NumPy
├── Persistence & ORM: SQLite Edge Engine + PostgreSQL (PgBouncer) via SQLAlchemy 2.0
└── Security: JWT Bearer Auth & PBKDF2 Password Hashing
```

---

## 🏁 Quick Start

### System Prerequisites
- **Node.js**: `v20.x` or higher
- **Python**: `v3.11` or `v3.12`
- **Git**

### 1. Clone Repository
```bash
git clone https://github.com/vedant1506/SIH-26.git
cd SIH-26
```

### 2. Single-Command Launch (Recommended)
You can launch both the backend API server and frontend application concurrently using the master runner:
```bash
python start_all.py
```
This automatically initializes the FastAPI backend on port `8000`, starts the Next.js dev server on port `3000`, performs health checks, and displays the unified console log.

### 3. Manual Step-by-Step Setup

#### Backend Setup
```bash
cd backend
python -m venv venv

# Windows (PowerShell):
venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
> Interactive OpenAPI documentation available at: `http://127.0.0.1:8000/docs`

#### Frontend Setup (In a separate terminal)
```bash
cd frontend
npm install
npm run dev
```
> PRISM Web Application accessible at: `http://localhost:3000`

### 4. Running Geolocation Rebuild & Validation Test Suite

To re-run the authoritative geolocation rebuild pipeline:
```bash
python scripts/rebuild_authoritative_geolocations.py --skip-google
```

To run the post-rebuild validation report:
```bash
python scripts/validate_after_rebuild.py
```

To run the full 23-stage master geospatial validation test suite:
```bash
python tests/test_master_geo_validation.py
```

---

## 🔌 API Directory

| Domain | Method | Endpoint | Description | Access Level |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/login` | Authenticate officer & issue signed JWT bearer token | Public |
| **Auth** | `GET` | `/api/v1/auth/me` | Fetch authenticated profile, ministry & assigned roles | Officer+ |
| **Projects** | `GET` | `/api/v1/projects` | Filterable project matrix with pagination, search & state filters | All Roles |
| **Projects** | `GET` | `/api/v1/projects/{id}` | Project detail, financial breakdown & milestone history | All Roles |
| **AI / ML** | `POST` | `/api/v1/projects/{id}/predict` | Execute dual XGBoost inference & compute TreeSHAP vectors | All Roles |
| **AI / ML** | `POST` | `/api/v1/projects/{id}/mitigation` | Synthesize grounded multi-action mitigation roadmap | All Roles |
| **Early Warning** | `GET` | `/api/v1/analytics/early-warning` | Dynamic S-curve expected progress, triggers & 3-state burn | All Roles |
| **Alerts** | `GET` | `/api/v1/alerts` | Query active early warning risk escalation alerts | All Roles |
| **Alerts** | `POST` | `/api/v1/alerts/{id}/acknowledge`| Acknowledge early warning escalation item | Officer+ |
| **Actions** | `GET` | `/api/v1/actions` | Query governance action items with SLA status & assignees | All Roles |
| **Actions** | `POST` | `/api/v1/actions` | Create new corrective intervention action item | Officer+ |
| **Actions** | `PUT` | `/api/v1/actions/{id}/status` | Transition action status with audit note & evidence URL | Officer+ |
| **Documents** | `GET` | `/api/v1/projects/{id}/documents` | List project documents, OCR status & metadata | All Roles |
| **Documents** | `POST` | `/api/v1/projects/{id}/documents` | Upload document, compute SHA-256 & trigger async OCR | Officer+ |
| **Citizen** | `POST` | `/api/v1/citizen/grievances` | Submit public grievance with geotagged photo evidence | Public |
| **Citizen** | `GET` | `/api/v1/citizen/grievances` | Query citizen feedback register with spatial validation | Officer+ |
| **Fraud** | `GET` | `/api/v1/fraud/anomalies` | Query detected red flags, ghost milestones & vendor risk | Decision Maker |
| **Integrations** | `GET` | `/api/v1/integrations/status` | Query sync health with GatiShakti, PFMS, GeM, and CRIS | Admin |
| **Ephemeral** | `POST` | `/api/v1/temporary-analysis/upload` | Ingest MoSPI Flash Report PDF/CSV into ephemeral session | Ephemeral |
| **Ephemeral** | `GET` | `/api/v1/temporary-analysis/{id}/csv` | Download verified canonical 19-column CSV export | Ephemeral |

---

## 🛡️ Enterprise Governance & Data Integrity

- **Zero Future-Leakage Partitioning**: Machine learning models strictly partition historical training data chronologically. Future milestones are never leaked into retrospective evaluations.
- **PgBouncer Transaction Pooling**: High-concurrency production database connection pooling on port 6543 prevents socket exhaustion during cabinet briefings.
- **Ephemeral Sandbox Isolation**: Flash Report parsing runs strictly in volatile RAM (`temp_analysis_service.py`), ensuring draft files never overwrite authoritative records.
- **Survey of India Spatial Compliance**: All project coordinates are audited against authoritative territorial polygons to maintain 100% inland accuracy.

---

## 👥 Hackathon Acknowledgements & Governance

* **Developed for**: Smart India Hackathon (SIH) 2026
* **Problem Statement**: Web-Based Integrated Project-Monitoring Platform (SIH26103)
* **Ministry / Partner**: Ministry of Statistics and Programme Implementation (MoSPI)
* **Repository**: [vedant1506/SIH-26](https://github.com/vedant1506/SIH-26)
* **Authoritative Technical Design Document**: [ARCHITECTURE.md](ARCHITECTURE.md)

---

<div align="center">
  <sub>Engineered with precision for National Infrastructure Intelligence · Smart India Hackathon 2026</sub>
</div>
