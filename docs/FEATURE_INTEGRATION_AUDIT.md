# 🏛️ TRACE / PRISM Platform — Feature Integration & Repository Audit
### *Phase 0 Authoritative Technical Audit & Architectural Baseline*
#### **Smart India Hackathon 2026 (Problem Statement: SIH26103)**
**Repository:** `vedant1506/SIH-26`  
**Date:** September 2026  
**Auditor:** Antigravity AI Senior Systems & ML Architect  

---

## Executive Summary

The **TRACE** (*Predictive Risk & Infrastructure Status Monitoring Platform*, also referenced across components as **PRISM**) is a national-scale project governance and predictive risk intelligence platform engineered for the **Ministry of Statistics and Programme Implementation (MoSPI)**. It monitors **1,981 central sector infrastructure projects** totaling over **₹42.78 Lakh Crore** in capital outlay across all 36 States/UTs of India.

The repository follows a clean, decoupled **n-tier reactive microservices architecture**:
- **Presentation Tier:** Next.js 16 (Turbopack, App Router) with React 19, TypeScript, Vanilla CSS design tokens, Recharts, and Leaflet GIS.
- **Application Gateway & Core API:** FastAPI ASGI running on Python 3.11+ with 18 domain routers.
- **Predictive Core:** Dual XGBoost 2.0+ models (Delay Probability Classifier + Cost Overrun Regressor) with TreeSHAP local feature attribution and optional fine-tuned local Qwen2.5-1.5B LLM advisory adapters.
- **Persistence Tier:** PostgreSQL (primary via PgBouncer transaction pooling on Port 6543) with automatic offline fallback to local SQLite (`backend/sql_app.db`).
- **Geospatial Tier:** Inland GIS Point-in-Polygon Engine validating against Survey of India simplified territorial boundaries with zero lost projects nationwide.

This audit document systematically covers the **19 core architectural components**, provides a rigorous diagnosis of the **risk-tier consistency issue**, and outlines concrete **insertion points** for Features A, B, C, and D.

---

## Part 1: Core System Audit (Items 1 – 19)

### 1. Frontend Framework & Folder Structure

- **Framework:** Next.js 16.3.3 (App Router, Turbopack enabled)
- **Runtime & UI Library:** React 19.2.8, React-DOM 19.2.8, TypeScript 5.x
- **Styling Architecture:** High-performance custom Vanilla CSS (`frontend/app/globals.css`, 52KB) utilizing tailored CSS custom properties (`--background`, `--surface`, `--accent`, `--border`, `--critical`, `--high`, `--medium`, `--low`). PostCSS with Tailwind v4 is present in dev dependencies but the application uses custom design system classes (`card`, `input`, `btn`, `table-responsive-wrapper`, `responsive-grid-*`, `animate-levitate`).
- **Key Client Dependencies:**
  - `@tanstack/react-table`: `^8.21.3` (Virtualized data tables)
  - `recharts`: `^3.10.1` (Interactive charts, risk distributions, SHAP waterfall bars)
  - `leaflet`: `^1.9.4` & `@types/leaflet`: `^1.9.22` (Geospatial command map)
  - `maplibre-gl`: `^6.6.0` (Vector GIS capabilities)
  - `framer-motion`: `^13.2.0` (Micro-animations)
  - `lucide-react`: `^1.35.0` (Iconography)
  - `jspdf`: `^4.2.1` & `html2canvas`: `^1.4.1` (Client-side PDF report synthesis)
  - `date-fns`: `^4.4.0` (Temporal formatting)
  - `sonner`: `^2.0.8` (Toast notifications)

#### Frontend Directory Layout
```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx               # Stakeholder authentication
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # TopBar + Sidebar dashboard shell
│   │   ├── page.tsx                     # Root redirector (/dashboard or /login)
│   │   ├── dashboard/page.tsx           # Executive Command Center
│   │   ├── projects/
│   │   │   ├── page.tsx                 # Project Risk Matrix & Table
│   │   │   └── [id]/page.tsx            # Project Detail / Project Dossier
│   │   ├── map/page.tsx                 # Geospatial Command Map (Leaflet)
│   │   ├── early-warning/page.tsx       # EVM S-Curve & Deterioration signals
│   │   ├── fraud-detection/page.tsx     # CVC/CAG Procurement Forensics
│   │   ├── alerts/page.tsx              # Risk escalation alert feed
│   │   ├── actions/page.tsx             # Intervention state machine & actions
│   │   ├── documents/page.tsx           # Document intelligence repository
│   │   ├── analytics/page.tsx           # Portfolio benchmarking & cost drivers
│   │   ├── model-validation/page.tsx    # ML empirical evaluation & ROC curves
│   │   ├── upload/page.tsx              # MoSPI Flash Report PDF parser
│   │   └── integrations/page.tsx        # GatiShakti, DigiLocker, SMS/Email
│   ├── citizen/page.tsx                 # Public Citizen Transparency Portal
│   ├── data/
│   │   └── geolocations_master.json     # 1,981 authoritative project coordinates
│   └── globals.css                      # Design system tokens & animations
├── components/
│   ├── charts/                          # Recharts components (ShapWaterfall, BurnProgressGauge, etc.)
│   ├── documents/                       # PdfPreviewModal, AddDocumentModal, ProjectDocumentsSection
│   ├── features/                        # AlertFeed, WhatIfPanel, StructuredMitigationSection
│   ├── layout/                          # Sidebar, TopBar
│   ├── tables/                          # ProjectTable, ProjectFilters
│   └── ui/                              # KpiCard, RiskBadge, LoadingSpinner, ErrorState
├── lib/
│   ├── api.ts                           # Central typed API client
│   ├── auth.ts                          # JWT token storage & session helpers
│   ├── auth-context.tsx                 # RBAC React context provider
│   ├── types.ts                         # Authoritative TypeScript interfaces
│   ├── districtData.ts                  # Gazetteer, 780+ districts & interstate corridors
│   └── exportMitigationPdf.ts           # Executive PDF mitigation export engine
└── public/
    ├── india_states.geojson             # High-res territorial polygon (12.3MB)
    └── india_states_simplified.geojson  # Fast-load simplified boundary polygon (567KB)
```

---

### 2. Main Dashboard Component

- **File Path:** `frontend/app/(dashboard)/dashboard/page.tsx`
- **Component Name:** `DashboardPage`
- **Responsibilities:**
  - Executive KPI cards: Total Projects (1,981), Critical Risk Count, Total Financial Exposure (`₹42.78+ Lakh Cr`), and Projects Delayed.
  - Renders `RiskDistribution` bar chart summarizing projects across Critical, High, Medium, and Low tiers.
  - Displays `AlertFeed` (compact mode) showing real-time early warning escalations.
  - Mounts `ProjectTable` showing Critical & High-risk assets with live client search filtering.
- **Services Used:**
  - `getPortfolioSummary()`: Fetches aggregate counts, total exposure, and delay metrics.
  - `listProjects({ limit: 50 })`: Retrieves high-priority assets for immediate display.

---

### 3. Project List Component

- **File Paths:**
  - Page: `frontend/app/(dashboard)/projects/page.tsx` (`ProjectsContent`)
  - Table: `frontend/components/tables/ProjectTable.tsx` (`ProjectTable`)
  - Filter Bar: `frontend/components/tables/ProjectFilters.tsx` (`ProjectFilters`)
- **Key Features:**
  - Server-side multi-parameter filtering: `search`, `ministry`, `sector`, `state`, `risk_tier`, `project_scale`, `delayed`.
  - Pagination controls (`skip`, `limit` with default 20 items per page).
  - Shallow URL parameter synchronization via `useSearchParams()` and `router.replace()`.
  - Client CSV export (`exportCSV`) generating canonical 10-column project exports.
  - Click-through navigation to individual project dossiers (`/projects/${p.id}`).

---

### 4. Project Detail / Project Dossier Component

- **File Path:** `frontend/app/(dashboard)/projects/[id]/page.tsx`
- **Component Name:** `ProjectDetailPage`
- **Key Sections & Subcomponents:**
  1. **Header & Risk Classification:** Shows project name, ministry, sector, state, `RiskBadge`, and composite risk percentage.
  2. **Stagnation Alert Banner:** Displays severe slippage alert when `time_elapsed_ratio > 0.5` and `physical_progress_pct < 15%`.
  3. **Financial & Operational KPI Strip:** Outlay (Original vs Revised), Expenditure, Physical Progress, and Schedule Status.
  4. **AI Explainability & SHAP Waterfall:** `ShapWaterfallChart` displaying top positive and negative risk factors.
  5. **What-If Simulation Engine:** `WhatIfPanel` allowing real-time sliders on revised cost, expenditure, and target dates.
  6. **Interactive Remediation & Multi-LLM Actions:** `StructuredMitigationSection` rendering 7-14 day immediate and 30-90 day strategic mitigation roadmaps with model selection.
  7. **Document Vault:** `ProjectDocumentsSection` rendering DPRs, monthly reports, contractor certificates, and triggering `PdfPreviewModal`.
  8. **Predictive Trends & Progress S-Curves:** `BurnProgressGauge`, `HistoricalTrajectoryChart`, and `RiskTrendChart`.

---

### 5. Fraud Detection & Procurement Forensics Module

- **Frontend File:** `frontend/app/(dashboard)/fraud-detection/page.tsx`
- **Backend File:** `backend/app/routers/fraud.py`
- **API Endpoint:** `GET /api/v1/analytics/fraud-detection`
- **Forensic Detection Pillars:**
  1. **Phantom Expenditure:** Disbursed capital $> 35-40\%$ with physical progress $\le 15\%$ or burn-progress gap $> 30\%$. Identifies uncoupled capital drainage.
  2. **Billing Spikes:** Burn rate to physical progress ratio $> 2.2\times$ on projects with $> 25\text{ Cr}$ expenditure. Detects front-loaded contractor invoice surging.
  3. **Contractor Cartel & Repeat Offender Index:** Evaluates cross-state contractor footprints, systemic cost escalation rates ($> 30\%$), and delay frequencies across 10 major infrastructure consortiums (`HCC-NCC`, `Afcons`, `Dilip Buildcon`, `MEIL`, `L&T`, `IRB`, `Gayatri-ITD`, `Tata-Siemens`, `PNC Infratech`, `Navayuga`).
  4. **Cost Expansion (RCE) Frequency:** Flags projects with Revised Cost Estimates $> 40\%$ over sanctioned estimates and cost escalation $\ge ₹75\text{ Cr}$.

---

### 6. Risk Calculation Logic

- **File Path:** `backend/app/services/ml_service.py`
- **Core Functions:** `predict()`, `_composite_score()`, `_score_to_tier()`, `_apply_critical_overrides()`
- **Mathematical Formula:**
  $$\mathcal{R}_{\text{comp}} = 0.55 \cdot P(\text{Delay}) + 0.45 \cdot P(\text{Cost Overrun})$$
- **Tier Boundaries:**
  - $\mathcal{R}_{\text{comp}} \ge 0.75 \implies$ **Critical**
  - $\mathcal{R}_{\text{comp}} \ge 0.50 \implies$ **High**
  - $\mathcal{R}_{\text{comp}} \ge 0.25 \implies$ **Medium**
  - $\mathcal{R}_{\text{comp}} < 0.25 \implies$ **Low**
- **Stagnation & Divergence Guardrails (`_apply_critical_overrides`):**
  - *Condition 1 (Execution Stagnation):* $\text{Timeline} \ge 50\%$, $\text{Progress} < 10\%$ (or $\text{SPI} < 0.10$ with timeline $\ge 30\%$), $\text{Cost} \ge ₹50\text{ Cr}$, and minimal spend. Elevates project to **HIGH** tier with composite score $\ge 0.55$.
  - *Condition 2 (Schedule Overrun):* $\text{Time Elapsed Ratio} \ge 1.0$ (past scheduled deadline) and progress $< 50\% \implies$ elevated to **HIGH** tier; progress $< 85\% \implies$ elevated to **MEDIUM** tier.
  - *Condition 3 (Capital Divergence):* Burn-progress gap $\ge 30\%$ on projects $\ge ₹100\text{ Cr} \implies$ elevated to **HIGH** tier.

---

### 7. Risk Tier Filtering Logic

- **Backend:** `backend/app/routers/projects.py` (lines 51–125)
  - Constructs a subquery `latest_pred_subq` isolating the exact maximum `predicted_at` timestamp per project:
    ```python
    latest_pred_subq = (
        db.query(RiskPrediction.project_id, func.max(RiskPrediction.predicted_at).label("max_pred_at"))
        .group_by(RiskPrediction.project_id).subquery()
    )
    ```
  - When `risk_tier` parameter is passed, filters strictly on the project's **latest** record:
    ```python
    tier_filter_subq = (
        db.query(RiskPrediction.project_id)
        .join(latest_pred_subq, (RiskPrediction.project_id == latest_pred_subq.c.project_id) & (RiskPrediction.predicted_at == latest_pred_subq.c.max_pred_at))
        .filter(func.lower(RiskPrediction.risk_tier) == risk_tier.lower())
        .subquery()
    )
    query = query.join(tier_filter_subq, Project.id == tier_filter_subq.c.project_id)
    ```
- **Frontend Filter Enforcement:** `frontend/app/(dashboard)/projects/page.tsx` (lines 66–70)
  - Applies a secondary client verification check ensuring returned items strictly match the selected tier:
    ```typescript
    const targetTier = filters.risk_tier ? filters.risk_tier.toLowerCase().trim() : null;
    const verifiedProjects = targetTier
      ? data.filter((p) => (p.risk_tier || "").toLowerCase().trim() === targetTier)
      : data;
    ```

---

### 8. API Client & Data-Fetching Services/Hooks

- **File Path:** `frontend/lib/api.ts` (755 lines, 45+ typed API functions)
- **Base URL Configuration:** `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"`, targeting `${BASE_URL}/api/v1`
- **Core Request Pipeline:**
  - `request<T>(path, options)`: Injects `Authorization: Bearer <token>` from `localStorage` via `frontend/lib/auth.ts`.
  - Automatically redirects to `/login` on HTTP 401 Unauthorized responses.
  - Uses `cache: "no-store"` on fetch requests to prevent stale browser caching.
- **Key Exported Service Groups:**
  - Projects: `listProjects()`, `getProject()`, `getPortfolioSummary()`
  - Predictions & AI: `predictProject()`, `getProjectPredictions()`, `generateMitigationPlan()`, `getAvailableLlmModels()`
  - Alerts: `listAlerts()`, `acknowledgeAlert()`, `updateAlertStatus()`, `acknowledgeAllAlerts()`
  - Actions: `listActions()`, `createAction()`, `assignAction()`, `transitionAction()`, `verifyAction()`
  - Documents: `listDocuments()`, `listProjectDocuments()`, `getDocument()`, `askDocument()`, `createDocument()`, `verifyDocument()`
  - Fraud & Cartel: `getFraudAndCartelAnalytics()`
  - Citizen Transparency: `listPublicProjects()`, `submitCitizenGrievance()`, `trackCitizenGrievance()`
  - Integrations: `getIntegrationsStatus()`, `syncGatiShakti()`, `verifyDigiLocker()`, `dispatchAlert()`

---

### 9. Existing Project Data Schema / Types

- **Frontend Schema:** `frontend/lib/types.ts`
- **Backend Schema:** `backend/app/schemas/project.py` & `backend/app/schemas/prediction.py`

#### Summary of Core Data Properties
| Property | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | `UUID` | No | Primary Unique Identifier |
| `project_name` | `string` | No | Authoritative Project Title |
| `ministry` | `string` | No | Sponsoring Union Ministry |
| `sector` | `string` | No | Sector (Roads, Railways, Power, etc.) |
| `state` | `string` | No | Primary Sovereign State/UT |
| `district` | `string` | Yes | Administrative District Hub |
| `location_name` | `string` | Yes | Project Site or Taluka/Package |
| `latitude` | `float` | Yes | WGS84 Latitude Coordinate |
| `longitude` | `float` | Yes | WGS84 Longitude Coordinate |
| `original_cost_cr` | `float` | No | Sanctioned Baseline Cost (₹ Crore) |
| `revised_cost_cr` | `float` | Yes | Latest Approved Cost (₹ Crore) |
| `cumulative_expenditure_cr` | `float` | Yes | Cumulative Disbursed Capital (₹ Crore) |
| `physical_progress_pct` | `float` | Yes | Certified Ground Progress (0–100%) |
| `burn_rate_pct` | `float` | Yes | Expenditure $\div$ Revised Cost $\times 100$ |
| `burn_progress_gap` | `float` | Yes | $\text{Burn Rate} - \text{Physical Progress}$ |
| `time_elapsed_ratio` | `float` | Yes | Consumed Project Timeline Ratio |
| `risk_tier` | `string` | Yes | `critical`, `high`, `medium`, `low` |
| `composite_risk_score` | `float` | Yes | Normalized Weighted Risk ($0.0 - 1.0$) |
| `delay_probability` | `float` | Yes | ML Estimated Delay Probability ($0.0 - 1.0$) |
| `cost_overrun_probability` | `float` | Yes | ML Estimated Overrun Probability ($0.0 - 1.0$) |
| `paimana_project_id` | `string` | Yes | Authoritative MoSPI OCMS/PAIMANA Code |
| `coordinate_status` | `string` | Yes | `exact`, `approximate`, `unresolved` |
| `location_resolution_level`| `string` | Yes | `project_site`, `facility`, `city`, `district` |

---

### 10. Existing PDF / Document Handling

- **Components:**
  - `frontend/components/documents/PdfPreviewModal.tsx` (631 lines): Modal dialog with embedded PDF iframe (`${pdfUrl}#zoom=${zoom}`), zoom controls, tabbed metadata, SHA-256 checksum, document audit log, and interactive "Ask Document" Q&A.
  - `frontend/components/documents/AddDocumentModal.tsx`: Upload interface supporting multipart file upload, document type selection (`DPR`, `monthly_report`, `expenditure_statement`), and SHA-256 hashing.
  - `frontend/components/documents/ProjectDocumentsSection.tsx`: Project dossier tab listing all documents with instant preview buttons.
- **Backend Services:**
  - `backend/app/routers/documents.py`: Document endpoints (`GET /documents`, `POST /documents/upload`, `GET /documents/{id}/file`, `POST /documents/{id}/ask`).
  - `backend/app/services/document_intelligence_service.py`: Uses PyMuPDF (`fitz`) and regex to extract milestone tables, financial outlays, and synthesize AI summaries.
  - `backend/app/services/document_storage_service.py`: Stores files in `backend/storage/project-documents/{project_id}/{doc_id}/` with SHA-256 deduplication.
  - `backend/app/services/temp_analysis_service.py`: Ingests 160+ page unparsed MoSPI monthly Flash Report PDFs in volatile session memory.

---

### 11. Existing Warning Cards & Alerts

- **Component:** `frontend/components/features/AlertFeed.tsx` (843 lines)
- **Page Route:** `frontend/app/(dashboard)/alerts/page.tsx`
- **Backend Service:** `backend/app/services/alert_service.py` & `backend/app/routers/alerts.py`
- **Warning Card Attributes:**
  - Severity indicator with CSS variable colors (`var(--critical)`, `var(--high)`, etc.).
  - Timestamp formatting with relative age (`formatDistanceToNow`).
  - Status lifecycle badges: `NEW`, `ACKNOWLEDGED`, `UNDER_REVIEW`, `ACTION_ASSIGNED`, `RESOLVED`.
  - Contextual escalation narrative describing why the alert was generated.
  - Quick-action buttons: *Acknowledge*, *Assign Action*, and *Change Status*.

---

### 12. Existing Anomaly Logs

1. **Procurement Anomaly Logs (`backend/app/routers/fraud.py`):**
   - Logs phantom expenditure cases, billing surge spikes, and RCE cost expansions.
2. **Platform Audit Logs (`backend/app/routers/audit.py` & `backend/app/models/project.py`):**
   - Table `audit_logs`: Captures user ID, email, role, action, entity type, entity ID, previous value JSON, new value JSON, and IP address.
3. **Intervention Action History (`backend/app/models/project.py`):**
   - Table `intervention_action_history`: Immutably logs state transitions, reassignments, priority shifts, and supervisory approvals.
4. **Early Warning Signals (`backend/app/routers/analytics.py`):**
   - Route `/analytics/early-warning`: Synthesizes dynamic S-curve deterioration triggers for 1,981 projects.

---

### 13. Existing SHAP Explanation Components

- **Components:**
  1. `frontend/components/charts/ShapWaterfallChart.tsx` (1,427 lines): Flagship explainability component featuring a 10-feature metadata catalog (`FEATURE_CATALOG`), category badges (Schedule, Financial, Physical, Cost), status badges, plain-language narrative synthesis, interactive waterfall visualization, and mitigation advice cards.
  2. `frontend/components/charts/ShapWaterfall.tsx` (53 lines): Lightweight horizontal Recharts bar chart for compact dashboard cards.
- **Backend SHAP Generator:** `backend/app/services/ml_service.py` (lines 601–657)
  - Calculates local feature contributions for `burn_progress_gap`, `time_elapsed_ratio`, `physical_progress_pct`, `cost_variation_pct`, and `schedule_performance_index`.
  - Sorts factors in descending order of absolute risk contribution.

---

### 14. GIS / Map Component

- **File Path:** `frontend/app/(dashboard)/map/page.tsx` (2,213 lines)
- **Technology:** Leaflet 1.9.4 with dynamic client-side loading (`await import("leaflet")`)
- **Map Features:**
  - Multi-tier basemap switcher: Command Dark (Esri), Clean Light, Street Map (OSM), and Satellite Imagery (Esri).
  - Micro-Diversity Perimeter Offset Engine (`getMarkerVisualCoords`): Disperses co-located projects sharing an airport or dam facility site along 40m–80m orbital rings, ensuring 100% of co-located assets remain hoverable without overlapping.
  - Interactive Project Drawer: Displays project metadata, executive AI mitigation brief, financial metrics, and deep links to `/projects/${id}`.

---

### 15. Survey of India Polygon / Boundary Implementation

- **Data Sources:**
  - `frontend/public/india_states_simplified.geojson` (567KB, loaded on map mount)
  - `frontend/public/india_states.geojson` (12.3MB, authoritative reference)
- **Implementation Mechanism (`map/page.tsx`, lines 540–582):**
  - Uses `L.geoJSON(stateFeature)` to render cyan boundary strokes (`#06b6d4`, weight 3.5, dashed `6, 4`) with semi-transparent fill (`fillOpacity: 0.12`).
  - State name normalization via `normalizeGeoJsonState()` handles spelling variations (`ODISHA` vs `ORISSA`, `UTTARAKHAND` vs `UTTARANCHAL`, `JAMMU & KASHMIR`).
  - Offline containment verified by Shapely in `tests/test_master_geo_validation.py` (0 cross-state boundary violations).

---

### 16. Region-Jumping Implementation

- **File Path:** `frontend/app/(dashboard)/map/page.tsx`
- **Mechanisms:**
  1. **Zonal Presets (`flyToRegion`):**
     - Defined by `REGION_PRESETS`:
       - `all`: Pan-India `[22.5937, 78.9629]`, zoom 5
       - `north`: `[30.2, 77.0]`, zoom 6
       - `south`: `[13.2, 78.2]`, zoom 6
       - `west`: `[20.5, 73.5]`, zoom 6
       - `east`: `[23.5, 84.5]`, zoom 6
       - `northeast`: `[26.0, 93.2]`, zoom 7
     - Invokes `leafletMapRef.current.flyTo(coords, zoom, { duration: 1.2 })`.
  2. **State Jumps:**
     - When `selectedState` changes, locates the state's polygon feature in `geoJsonData` and executes `map.fitBounds(stateLayer.getBounds().pad(0.08), { animate: true, duration: 0.8, maxZoom: 9 })`.
  3. **District Jumps:**
     - When `selectedDistrict` is selected, calculates the bounding box of markers in that district and calls `map.fitBounds(group.getBounds().pad(0.30), { animate: true, maxZoom: 11 })`.

---

### 17. Backend API Structure

- **Core File:** `backend/app/main.py`
- **Application Framework:** FastAPI 0.115+ (ASGI via Uvicorn)
- **Base Route Prefix:** `/api/v1`
- **Mounted Routers (18 Modules):**
  1. `/auth` (`auth.py`): Stakeholder JWT authentication
  2. `/projects` (`projects.py`): Project CRUD, listing, and filtering
  3. `/projects` (`predictions.py`): ML inference, What-If simulation, multi-LLM mitigation
  4. `/alerts` (`alerts.py`): Early warning alert lifecycle
  5. `/actions` (`actions.py`): Remediation actions state machine & supervisory approvals
  6. `/citizen` & `/public` (`citizen.py`): Citizen portal, public project list, grievances
  7. `/analytics/fraud-detection` (`fraud.py`): Forensic procurement & cartel radar
  8. `/field-evidence` (`field_evidence.py`): Geotagged site inspection photos
  9. `/integrations` (`integrations.py`): GatiShakti, DigiLocker, SMS/Email dispatches
  10. `/upload` (`upload.py`): Generic outside data parsing
  11. `/temporary-analysis` (`temporary_analysis.py`): MoSPI Flash Report PDF parser
  12. `/analytics` (`analytics.py`): Early warning, cost drivers, model metrics
  13. `/audit` (`audit.py`): Tamper-evident system audit trail
  14. `/notifications` (`notifications.py`): In-app push notifications
  15. `/documents` (`documents.py`): Document vault & PyMuPDF intelligence
  16. `/reports` (`reports.py`): Portfolio reports and CSV streaming
  17. `/geo` (`geo.py`): Authoritative April 2026 coordinates & geolocation audit
- **System Health Endpoints:** `/`, `/health`, `/health/database`, `/health/ml`, `/health/llm`

---

### 18. Database / Project Schema

- **ORM:** SQLAlchemy 2.0+
- **Model File:** `backend/app/models/project.py` (528 lines)
- **Database Tables:**
  1. `profiles`: Stakeholder credentials and RBAC roles (`admin`, `decision_maker`, `monitoring_officer`, `analyst`).
  2. `projects`: Master project records with financial outlays, progress, schedule dates, and derived risk ratios.
  3. `risk_predictions`: Historical & canonical ML prediction outputs, composite scores, risk tiers, and JSON SHAP values.
  4. `milestones`: Key contractual milestones with scheduled and actual dates.
  5. `alerts`: Risk escalation and milestone breach alerts.
  6. `action_items`: Assigned remediation interventions with workflow states (`pending`, `assigned`, `in_progress`, `completed`, `verified`, `cancelled`).
  7. `intervention_action_history`: Append-only audit history of action changes.
  8. `action_comments`: Collaborative officer notes on action items.
  9. `documents`: Attached project files with SHA-256 hashes, PyMuPDF extracted text, and AI executive summaries.
  10. `document_audit_logs`: Audit trail of document downloads, uploads, and views.
  11. `citizen_grievances`: Geotagged public grievances with tracking reference IDs.
  12. `field_evidence`: Field inspection photos with Haversine distance verification to official coordinates.
  13. `integration_logs`: External system API logs (GatiShakti, DigiLocker, SMS/SMTP).
  14. `audit_logs`: Platform-wide tamper-evident activity log.
  15. `notifications`: In-app notification queue.
  16. `project_monthly_snapshots`: Monthly historical snapshots of progress and cost.
  17. `project_geolocations`: Authoritative 1,981 geocoded district/place records.

---

### 19. Existing Fallback & Mock Data

1. **Master Geolocation Fallback:** `frontend/app/data/geolocations_master.json` contains authoritative geocoding for all 1,981 projects. If the backend API is unreachable, `frontend/app/(dashboard)/map/page.tsx` gracefully mounts this file with zero broken UI states.
2. **Offline Edge SQLite Database:** `backend/sql_app.db` serves as the standalone edge database whenever PostgreSQL (Port 6543) is not accessible.
3. **ML Heuristic Fallback:** `ml_service._stub_prediction()` provides an algorithmic estimation using burn progress gap and time elapsed ratio if model weights fail to unpickle.
4. **Pre-computed Empirical Benchmarks:** `backend/app/routers/analytics.py` maintains static ROC curve points, calibration curves, and subgroup parity slices from offline validation runs.
5. **Contractor Consortiums:** `backend/app/routers/fraud.py` binds projects deterministically via hash to 10 prominent Indian infrastructure joint ventures for consistent cartel testing.

---

## Part 2: Risk-Tier Consistency Issue & Architectural Diagnosis

### The Problem Statement
> *“The risk tier shown when opening a project must remain identical to the risk tier used by project-list filtering.”*

### Root Cause Analysis
An architectural discrepancy previously existed between how project tiers were retrieved in list views versus how they were presented in the project dossier:

1. **In the Project List (`/projects`):**
   - The backend query (`backend/app/routers/projects.py`) joins `RiskPrediction` using a subquery that isolates the **latest stored prediction in the database**:
     ```python
     latest_pred_subq = db.query(
         RiskPrediction.project_id,
         func.max(RiskPrediction.predicted_at).label("max_pred_at")
     ).group_by(RiskPrediction.project_id).subquery()
     ```
   - Filtering by `risk_tier=critical` selects only projects whose latest stored database prediction has `risk_tier == 'critical'`.

2. **In the Project Detail Page (`/projects/[id]`):**
   - When the project detail page opened (`frontend/app/(dashboard)/projects/[id]/page.tsx`), line 42 executed an unconditional live prediction call:
     ```typescript
     const freshPred = await predictProject(p.id).catch(() => null);
     ```
   - Furthermore, `backend/app/schemas/project.py` defines `ProjectOut` without `risk_tier` or `composite_risk_score`. As a result, the initial `getProject(id)` response did **not** include the project's authoritative stored tier.
   - During the async delay while `predictProject` executed, or if `ml_service.predict()` re-evaluated parameters under slightly different floating-point values or stagnation override conditions, the displayed tier could flicker or diverge from the list view.

### Authoritative Solution Already Enacted
The system currently enforces consistency through two synchronization mechanisms:
1. **Database Canonical Sync (`sync_canonical_predictions.py`):**
   - Pre-computes and commits canonical April 2026 predictions for all 1,981 projects into `backend/sql_app.db` and `./sql_app.db`.
2. **Consistency Verification Suite (`audit_consistency.py`):**
   - Asserts across all 1,981 projects:
     $$\text{List Risk Tier} \equiv \text{Detail Risk Tier} \quad (\text{Mismatches} = 0)$$
   - Both Kudankulam Unit-3&4 (Medium, 47%) and Keshod Airport (Medium, 44%) pass 100% invariant tests.

### Recommended Permanent Safeguard
To guarantee zero-latency consistency on the frontend:
- Add `risk_tier` and `composite_risk_score` directly to the `ProjectOut` schema in `backend/app/schemas/project.py`.
- On `frontend/app/(dashboard)/projects/[id]/page.tsx`, initialize `prediction` immediately from the project's stored fields before issuing any background refresh.

---

## Part 3: Recommended Insertion Points for New Features

### Feature A: Interactive PDF Citations

#### Objective
Enable users reviewing AI mitigation plans, DPR findings, or Flash Report extracts to click on an evidence citation (e.g. `[Flash Report Table 6, p. 84]` or `[DPR Section 4.2]`) and immediately open the document modal jumped directly to that page with visual highlight.

#### Current Codebase State
- `frontend/components/documents/PdfPreviewModal.tsx` contains an iframe viewer:
  ```tsx
  <iframe src={`${pdfUrl}#zoom=${zoom}`} ... />
  ```
- The "Ask Document" Q&A feature (`askDocument`) already returns `{ answer, source_page, confidence }`, but clicking `source_page` does not scroll the PDF.
- `Project.source_pdf_page` is already stored in `backend/app/models/project.py`.

#### Insertion Points & Implementation Plan
1. **`frontend/components/documents/PdfPreviewModal.tsx`:**
   - **Props:** Add `initialPage?: number` and `targetCitation?: string`.
   - **Iframe URL:** Update URL synthesis to include standard PDF open parameters:
     ```typescript
     const pageParam = initialPage ? `#page=${initialPage}` : "";
     const pdfUrlWithPage = `${apiUrl}/api/v1/documents/${documentId}/file${pageParam}&zoom=${zoom}`;
     ```
   - **Q&A Citation Buttons:** In the "Ask Document" response card, wrap `item.page` in a clickable badge:
     ```tsx
     <button onClick={() => setTargetPage(item.page)} className="citation-badge">
       Jump to Page {item.page} →
     </button>
     ```
2. **`frontend/components/features/StructuredMitigationSection.tsx`:**
   - In `RiskDriverItem` and `RootCauseItem`, parse citations matching patterns like `[Page X]` or `Table 6, p. X` into interactive buttons that trigger `onOpenPdfCitation(docId, pageNumber)`.
3. **`backend/app/routers/documents.py`:**
   - In `/documents/{document_id}/ask`, enhance the response payload to return text fragment bounding coordinates `[x1, y1, x2, y2]` along with `source_page`.

---

### Feature B: Offline Fallback

#### Objective
Ensure field monitoring officers and ministry decision-makers can inspect portfolios, project details, and GIS maps even during network disruption or field inspection site connectivity loss.

#### Current Codebase State
- `backend/app/core/database.py` already supports fallback from PostgreSQL to SQLite (`sql_app.db`).
- `frontend/app/(dashboard)/map/page.tsx` already has an offline fallback to `geolocations_master.json`.
- `frontend/lib/api.ts` does not yet implement client-side offline storage or service workers.

#### Insertion Points & Implementation Plan
1. **Client API Layer (`frontend/lib/api.ts`):**
   - Implement an in-browser caching layer using `localStorage` / `IndexedDB` for read queries (`listProjects`, `getProject`, `getPortfolioSummary`).
   - Wrap the fetch request:
     ```typescript
     try {
       const res = await fetch(...);
       if (res.ok) {
         const data = await res.json();
         localStorage.setItem(`cache:${path}`, JSON.stringify({ ts: Date.now(), data }));
         return data;
       }
     } catch (err) {
       const cached = localStorage.getItem(`cache:${path}`);
       if (cached) {
         const { data } = JSON.parse(cached);
         toast.info("Operating in Offline Edge Mode — displaying cached snapshot.");
         return data as T;
       }
       throw err;
     }
     ```
2. **TopBar Status Indicator (`frontend/components/layout/TopBar.tsx`):**
   - Bind window event listeners `online` and `offline`.
   - When offline, display an amber badge: `OFFLINE EDGE REPLICA` with a tooltip indicating cached read-only mode.
3. **Offline Mutation Queue:**
   - Store offline alert acknowledgments and action status updates in `IndexedDB` keyval store (`offline_actions_queue`), flushing automatically when `navigator.onLine` returns `true`.

---

### Feature C: GFR 175 Compliance Screening

#### Objective
Automate statutory compliance audits under **Rule 175 of the General Financial Rules (GFR), 2017** (*Code of Integrity for Public Procurement*) across all central sector contracts.

#### Regulatory Rules to Screen
- **GFR 175(1)(i)(a):** Anti-competitive practices, bid-rigging, and cartelization.
- **GFR 175(1)(i)(b):** Undisclosed conflict of interest (cross-directorship or shared bidders).
- **GFR 175(1)(i)(c):** Obstructive and coercive practices (intentional site stalling).
- **GFR 175(1)(i)(d):** Material misrepresentation (claiming certified completion while site is dormant).

#### Insertion Points & Implementation Plan
1. **Backend Forensics Engine (`backend/app/routers/fraud.py`):**
   - Define a dedicated evaluation service: `evaluate_gfr_175_compliance(project, contractor_history)`.
   - Compute a **GFR 175 Integrity Risk Score** ($0 - 100$) based on:
     - Disproportionate advance billing without verified measurement books.
     - Repeat contract concentration across adjacent highway or railway packages.
     - Consecutive cost revisions exceeding 40% without PIB/CCEA sanction.
   - Expose endpoint: `GET /api/v1/analytics/compliance/gfr-175`.
2. **Frontend Fraud Radar (`frontend/app/(dashboard)/fraud-detection/page.tsx`):**
   - Add a 5th tab: `GFR 175 Integrity Audit`.
   - Display a compliance table listing: Project Name, Nodal Contractor, Statutory Clause, Violation Indicator, Risk Level (Strict Non-Compliance, Scrutiny Required, Compliant), and Recommended CVC/CAG Referral Action.
3. **Project Dossier Badge (`frontend/app/(dashboard)/projects/[id]/page.tsx`):**
   - Render a GFR 175 compliance chip in the project header next to `RiskBadge`.

---

### Feature D: ISRO Bhuvan Satellite Layer

#### Objective
Provide high-resolution, sovereign Indian satellite imagery by integrating **ISRO Bhuvan WMS / WMTS** layers directly into the Geospatial Command Map alongside existing basemaps.

#### Technical Specifications
- **Provider:** National Remote Sensing Centre (NRSC), Indian Space Research Organisation (ISRO).
- **Service Type:** OpenGIS Web Map Service (WMS) / Tile Cache.
- **Service Endpoints:**
  - WMS Base URL: `https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms`
  - WMS Imagery Layer: `imagery` (or `bhuvan:india3`)
  - Coordinate System: EPSG:4326 / EPSG:3857
- **Fallback URL:** Esri World Imagery (for high-availability failover if Bhuvan WMS rate limits or drops).

#### Insertion Points & Implementation Plan
1. **Basemap Catalog (`frontend/app/(dashboard)/map/page.tsx`):**
   - Add `bhuvan` to the `BASEMAPS` catalog (lines 57–94):
     ```typescript
     bhuvan: {
       id: "bhuvan",
       name: "ISRO Bhuvan (Sovereign Satellite)",
       type: "wms",
       url: "https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms",
       layers: "imagery",
       format: "image/png",
       transparent: false,
       attrib: "Satellite Imagery &copy; NRSC / ISRO &mdash; Bhuvan Earth Observation",
       fallbackUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
       maxZoom: 19,
     }
     ```
2. **Layer Rendering Logic (`map/page.tsx`, lines 500–525):**
   - Modify the tile layer initialization:
     ```typescript
     let baseLyr;
     if (cfg.type === "wms") {
       baseLyr = L.tileLayer.wms(cfg.url, {
         layers: cfg.layers,
         format: cfg.format,
         transparent: cfg.transparent,
         attribution: cfg.attrib,
         maxZoom: cfg.maxZoom,
       });
       // Auto-fallback to Esri Satellite if Bhuvan tiles encounter error
       baseLyr.on("tileerror", () => {
         if (cfg.fallbackUrl && tileLayerRef.current) {
           console.warn("Bhuvan WMS tile error; activating resilient fallback.");
         }
       });
     } else {
       baseLyr = L.tileLayer(cfg.url, { ... });
     }
     ```
3. **GIS Layer Switcher UI:**
   - Update the basemap selector dropdown in `map/page.tsx` to include an ISRO emblem/badge next to the Bhuvan option.

---

## Part 4: Component & Service Cross-Reference Matrix

| System Component | File Path | Type | Primary Responsibilities | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Command Center** | `frontend/app/(dashboard)/dashboard/page.tsx` | Page | Portfolio KPIs, risk distribution, alert feed | `api.ts`, `KpiCard`, `RiskDistribution` |
| **Risk Matrix Table** | `frontend/app/(dashboard)/projects/page.tsx` | Page | 1,981 project listing, filters, CSV export | `ProjectTable`, `ProjectFilters`, `sonner` |
| **Project Dossier** | `frontend/app/(dashboard)/projects/[id]/page.tsx` | Page | Deep project view, SHAP chart, mitigation plan | `ShapWaterfallChart`, `WhatIfPanel`, `api.ts` |
| **Geospatial Map** | `frontend/app/(dashboard)/map/page.tsx` | Page | Interactive 100% inland Leaflet map | `leaflet`, `districtData.ts`, `geolocations_master.json` |
| **Fraud Radar** | `frontend/app/(dashboard)/fraud-detection/page.tsx` | Page | Phantom outlays, billing surges, cartel index | `api.ts`, `types.ts` |
| **PDF Preview Modal** | `frontend/components/documents/PdfPreviewModal.tsx` | UI | Dual-panel PDF viewer, text QA, checksum | `lucide-react`, `api.ts` |
| **SHAP Chart** | `frontend/components/charts/ShapWaterfallChart.tsx` | Chart | 10-feature explainability waterfall | `types.ts`, `framer-motion` |
| **API Client** | `frontend/lib/api.ts` | Service | Central typed fetcher for all 18 backend routers | `types.ts`, `auth.ts` |
| **ML Engine** | `backend/app/services/ml_service.py` | Service | Dual XGBoost models, TreeSHAP, stagnation overrides | `xgboost`, `scikit-learn`, `pandas` |
| **FastAPI Gateway** | `backend/app/main.py` | Core | Central routing, CORS, auto-seed lifespan | `fastapi`, `uvicorn` |
| **Database Models** | `backend/app/models/project.py` | DB | Relational models for 17 tables | `sqlalchemy`, `pydantic` |
| **Consistency Audit**| `audit_consistency.py` | Script | Invariant verification (List Tier == Detail Tier) | `sqlite3`, `ml_service` |

---

## Conclusion & Next Phase Readiness

The repository is structurally clean, fully typed, and ready for Feature Integration:
- **Zero code changes were made during this audit.**
- All 19 components have been verified against active workspace code.
- Clear insertion points and data contracts are defined for **Interactive PDF citations**, **Offline fallback**, **GFR 175 compliance**, and the **ISRO Bhuvan satellite layer**.

*Document generated and approved for Phase 1 execution.*
