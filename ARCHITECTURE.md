<div align="center">

# 🏛️ PRISM — Enterprise System Architecture & Technical Specification
### *Predictive Risk & Infrastructure Status Monitoring Platform*
#### **Authoritative Technical Design Document · Smart India Hackathon 2026**

[![Architecture: Microservices + Next.js 16](https://img.shields.io/badge/Architecture-Next.js%2016%20%2B%20FastAPI%20ASGI-blue?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![AI Engine: Dual XGBoost + TreeSHAP](https://img.shields.io/badge/AI%20Engine-XGBoost%202.0%20%7C%20TreeSHAP-EB6536?style=for-the-badge)](https://xgboost.readthedocs.io/)
[![Geospatial: 100% Inland GIS](https://img.shields.io/badge/Geospatial-Leaflet%20%7C%20MapLibre-199900?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)
[![Database: PostgreSQL + SQLite Fallback](https://img.shields.io/badge/Storage-PostgreSQL%20%7C%20SQLite%20Offline-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Status: Production Grade](https://img.shields.io/badge/Status-Audited%20%26%20Production--Ready-success?style=for-the-badge)]()

<br />

**PRISM** is a national-scale predictive intelligence and infrastructure governance platform designed for the **Ministry of Statistics and Programme Implementation (MoSPI)** and central project authorities. It transforms static, lagging monthly Flash Reports into dynamic, explainable early warning forecasts, automated intervention workflows, and geospatial decision intelligence across **₹42.78+ Lakh Crore** of central sector capital expenditure.

</div>

---

## 📑 Table of Contents

1. [High-Level System Topology (Macro Architecture)](#1-high-level-system-topology-macro-architecture)
2. [Data Ingestion & Ephemeral Parsing Pipeline](#2-data-ingestion--ephemeral-parsing-pipeline)
3. [Dual-Engine Machine Learning & TreeSHAP Inference Engine](#3-dual-engine-machine-learning--treeshap-inference-engine)
4. [Early Warning & Dynamic S-Curve Assessment Engine](#4-early-warning--dynamic-s-curve-assessment-engine)
5. [Intelligent Document Processing & Authenticity Pipeline](#5-intelligent-document-processing--authenticity-pipeline)
6. [Intervention Action Management & Governance State Machine](#6-intervention-action-management--governance-state-machine)
7. [Citizen Ground Evidence & Fraud Detection Triangulation](#7-citizen-ground-evidence--fraud-detection-triangulation)
8. [Role-Based Access Control (RBAC) & Security Architecture](#8-role-based-access-control-rbac--security-architecture)
9. [Database Entity Relationship Diagram (ERD)](#9-database-entity-relationship-diagram-erd)
10. [National Digital Ecosystem & Interoperability Gateway](#10-national-digital-ecosystem--interoperability-gateway)
11. [Performance, Resilience & High-Availability Architecture](#11-performance-resilience--high-availability-architecture)

---

## 1. High-Level System Topology (Macro Architecture)

PRISM is engineered on a modern, decoupled **n-tier reactive architecture** combining a high-performance **Next.js 16 (Turbopack, App Router)** presentation tier with an asynchronous **FastAPI ASGI** microservices backend, powered by a dual XGBoost predictive core and dual database persistence (PostgreSQL with PgBouncer pooling + SQLite offline edge replica).

```mermaid
flowchart TB
    subgraph Client_Tier["Client Presentation Tier (Next.js 16 · React 19 · TypeScript)"]
        UI1["Executive Command Center\n(Portfolio KPIs & Heatmaps)"]
        UI2["Geospatial GIS Command Map\n(Leaflet · Inland Spatial Engine)"]
        UI3["Early Warning Matrix\n(Dynamic S-Curve & Risk Severity)"]
        UI4["Governance Action Tracker\n(SLA Timers & Audit Trails)"]
        UI5["Document Intelligence Hub\n(OCR · Hash Verification · PDF Modal)"]
        UI6["Citizen Engagement Portal\n(Geotagged Proof & Grievances)"]
    end

    subgraph Gateway_Tier["API Gateway & Security Tier"]
        GW1["FastAPI ASGI Gateway (:8000)"]
        GW2["JWT Bearer Token Validator"]
        GW3["RBAC Authorization Middleware"]
        GW4["CORS & Rate Limiting Guards"]
    end

    subgraph Service_Tier["Core Microservices & Domain Routers"]
        R_PROJ["Projects & Milestones Router"]
        R_PRED["Dual XGBoost & TreeSHAP Router"]
        R_WARN["Early Warning & Analytics Router"]
        R_ACT["Intervention Actions Router"]
        R_DOC["Document Intelligence Service"]
        R_CIT["Citizen & Field Evidence Router"]
        R_GEO["Geospatial Inland Query Service"]
        R_FRAUD["Fraud & Red-Flag Anomaly Engine"]
        R_AUDIT["Tamper-Evident Audit Logger"]
    end

    subgraph Intelligence_Tier["AI / ML & Analytical Intelligence Core"]
        ML1["XGBoost Delay Classifier (v2.0)"]
        ML2["XGBoost Cost Overrun Regressor"]
        ML3["TreeSHAP Factor Attribution Engine"]
        ML4["Mathematical S-Curve Engine"]
        ML5["DocIntel OCR & Extractor (PyMuPDF)"]
        ML6["GPS Spatial Bounding Box Validator"]
    end

    subgraph Storage_Tier["Persistence & Data Tier"]
        DB_PG[("PostgreSQL Master Database\n(Port 6543 PgBouncer Pool)")]
        DB_SQLITE[("SQLite Edge Fallback\n(sql_app.db)")]
        DOC_STORE[("Secure Storage Vault\n(backend/storage/project-documents)")]
        CACHE_EPH[("In-Memory Ephemeral Cache\n(TTL 2-Hour Isolation)")]
    end

    subgraph External_Tier["National Digital Integrations (External APIs)"]
        EXT_GATI["PM GatiShakti National Master Plan"]
        EXT_PFMS["Public Financial Management System (PFMS)"]
        EXT_GEM["Government e-Marketplace (GeM)"]
        EXT_RAIL["Indian Railways CRIS / FOIS"]
        EXT_NHAI["NHAI Data Lake Portal"]
    end

    Client_Tier ==>|"HTTPS / REST / WebSocket"| GW1
    GW1 --> GW2 --> GW3 --> GW4
    GW4 --> Service_Tier

    R_PROJ <--> ML6
    R_PRED <--> ML1 & ML2 & ML3
    R_WARN <--> ML4
    R_DOC <--> ML5
    R_FRAUD <--> ML1 & ML2

    Service_Tier <==>|"SQLAlchemy 2.0 ORM"| DB_PG
    Service_Tier -.->|"Offline Fallback"| DB_SQLITE
    R_DOC <--> DOC_STORE
    GW1 <--> CACHE_EPH

    Service_Tier <==>|"REST Integration Connectors"| External_Tier
```

---

## 2. Data Ingestion & Ephemeral Parsing Pipeline

PRISM processes official MoSPI monthly Flash Reports (multi-hundred page unstructured PDFs, e.g. 160+ pages) without database contamination using an **Autonomous Ephemeral Extraction Pipeline**.

```mermaid
flowchart TD
    A["Official MoSPI Flash Report PDF\n(e.g., 160+ Page Flash Report)"] --> B["Ephemeral Upload Router\n(/api/v1/temporary-analysis/upload)"]
    
    subgraph Multi_Pass_Parsing["Multi-Pass Extraction Engine (PyMuPDF + pdfplumber)"]
        B --> C{"Page Classification Filter"}
        C -- "Summary / State / Appendix" --> D["Skip Non-Table Pages"]
        C -- "Table 6 Detection" --> E["Isolate Pan-India All Ongoing Projects"]
        
        E --> F["Table Boundary Snapping\n(Header Vector Coordinates)"]
        F --> G["Multi-Line Cell De-aggregation\n(Stacked Dual-Cost Splitter)"]
        G --> H["Schema Canonicalizer\n(19 Standard MoSPI Columns)"]
    end

    subgraph Validation_Sanitization["Data Validation & Normalization"]
        H --> I["Data Type & Scale Normalizer\n(INR Lakh to Crore, DD/MM/YYYY)"]
        I --> J["Spatial Geocoding Matcher\n(Census District Cross-Reference)"]
        J --> K["Anomaly & Inversion Check\n(Cost > 0, Progress in 0-100%)"]
    end

    subgraph Ephemeral_Session["Ephemeral Memory Vault (Zero DB Contamination)"]
        K --> L["Generate Ephemeral Session UUID"]
        L --> M["Compute Fast XGBoost Batch Inference"]
        M --> N["Register in In-Memory Store\n(TTL = 2 Hours)"]
        N --> O["Deliver Interactive Dashboard View"]
        N --> P["Export Canonical 19-Column CSV"]
    end

    N -- "Session Expiry or User DELETE" --> Q["Flush Memory · Clean Zero Footprint"]
```

> [!IMPORTANT]
> **Zero Database Contamination Guarantee**: Ephemeral ingestion executes completely within volatile session memory. Ad-hoc report uploads, testing files, and draft minister briefings can be simulated without writing unverified rows into the master database.

---

## 3. Dual-Engine Machine Learning & TreeSHAP Inference Engine

PRISM replaces opaque heuristic guesswork with an explainable, dual-model machine learning pipeline built on **XGBoost 2.0+** and **TreeSHAP (Tree-based Shapley Additive Explanations)**.

```mermaid
flowchart LR
    subgraph Inputs["Project Raw Features"]
        F1["Physical Progress %"]
        F2["Burn Progress Gap %"]
        F3["Time Elapsed Ratio"]
        F4["Original Cost (Cr)"]
        F5["Revised Cost Ratio"]
        F6["Milestone Slippage Days"]
        F7["Sector & State Indicators"]
    end

    subgraph Feature_Engineering["Feature Transformation & Scaling"]
        F1 & F2 & F3 & F4 & F5 & F6 & F7 --> FE["Imputation · One-Hot Encoding · Robust Scaler"]
    end

    subgraph Predictive_Models["Dual XGBoost Engines"]
        FE --> M_DELAY["Model A: Schedule Delay Classifier\n(Predicts Slippage Probability & Delay Months)"]
        FE --> M_COST["Model B: Cost Overrun Regressor\n(Predicts Overrun Severity in Crore INR)"]
    end

    subgraph Explainability["TreeSHAP Attribution Engine"]
        M_DELAY & M_COST --> SHAP["TreeSHAP Explainer Matrix\n(Exact Local Feature Contributions)"]
        SHAP --> V_WATERFALL["SHAP Waterfall Chart\n(Positive vs Negative Drivers)"]
        SHAP --> V_SUMMARY["Global Portfolio Risk Summary"]
    end

    subgraph Outputs["Downstream Actionable Intelligence"]
        M_DELAY --> O_TIER["Composite Risk Tiering\n(Critical | High | Medium | Low)"]
        M_COST --> O_TIER
        O_TIER --> O_ROADMAP["AI Grounded Mitigation Synthesizer\n(7-14 Day Immediate & 30-90 Day Milestones)"]
        V_WATERFALL --> O_ROADMAP
    end
```

### Mathematical Formulation of Dual Prediction & SHAP
The composite predictive risk score $\mathcal{R}_{\text{comp}} \in [0, 1]$ is computed as:

$$\mathcal{R}_{\text{comp}} = w_{\text{delay}} \cdot P(\text{Delay}) + w_{\text{cost}} \cdot \min\left(1.0, \frac{\Delta \text{Cost}}{\text{Sanctioned Cost}}\right)$$

Where $w_{\text{delay}} = 0.55$ and $w_{\text{cost}} = 0.45$. TreeSHAP evaluates exact additive attributions $\phi_i$:

$$f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i(x)$$

---

## 4. Early Warning & Dynamic S-Curve Assessment Engine

The Early Warning System dynamically evaluates construction cadence against an analytical logistic S-curve, detecting early operational deterioration before official schedule targets slip.

```mermaid
flowchart TD
    subgraph Input_Parameters["Project Timeline Parameters"]
        T1["Original Start Date (T_start)"]
        T2["Scheduled Completion Date (T_end)"]
        T3["Current Evaluation Date (T_now)"]
        T4["Actual Physical Progress (P_actual)"]
        T5["Cumulative Expenditure (C_exp)"]
        T6["Revised Sanctioned Budget (C_rev)"]
    end

    subgraph S_Curve_Calculation["Analytical S-Curve Engine"]
        T1 & T2 & T3 --> CALC_T["Time Elapsed Ratio: t = (T_now - T_start) / (T_end - T_start)"]
        CALC_T --> SCURVE["Logistic S-Curve Function:\nP_expected(t) = 100 / (1 + e^(-k * (t - 0.5)))"]
        SCURVE --> PROGRESS_GAP["Progress Gap: ΔP = P_actual - P_expected"]
    end

    subgraph Financial_Burn_Evaluation["Financial Burn Triangulation"]
        T4 & T5 & T6 --> BURN_CALC["Expenditure Burn Rate: B_rate = (C_exp / C_rev) * 100"]
        BURN_CALC --> BURN_GAP["Burn Variance: B_var = B_rate - P_actual"]
        
        BURN_GAP --> B_CHECK{"Burn Variance State"}
        B_CHECK -- "B_var > 20%" --> B_SEV["Severe Overburn\n(Capital draining rapidly ahead of physical assets)"]
        B_CHECK -- "5% < B_var <= 20%" --> B_MOD["Moderate Overburn\n(Front-loaded procurement & mobilization)"]
        B_CHECK -- "B_var <= 5%" --> B_BAL["Balanced / Disciplined\n(Expenditure aligned with physical progress)"]
    end

    subgraph Deterioration_Synthesis["Multi-Trigger Deterioration Engine"]
        PROGRESS_GAP & B_SEV & B_MOD & B_BAL --> TRIGGERS["Synthesize Contextual Deterioration Triggers:\n• S-Curve Milestone Slippage\n• Capital Overburn Divergence\n• Contractor Execution Velocity\n• Regulatory / RoW Stalls"]
        TRIGGERS --> SORT_ENGINE["Sort Early Warning Ledger by Risk Severity"]
        SORT_ENGINE --> ACTION_DISPATCH["Dispatch Targeted Corrective Actions\n(Show-cause, Fund reallocation, Site audit)"]
    end
```

---

## 5. Intelligent Document Processing & Authenticity Pipeline

PRISM features an enterprise document management and verification system for Detailed Project Reports (DPR), monthly monitoring reports, contractor bills, and site inspection certificates.

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Project Officer / Engineer
    participant Gateway as FastAPI Gateway (:8000)
    participant Storage as Document Storage Service
    participant DocIntel as Document Intelligence Service
    participant Database as PostgreSQL DB (Port 6543)
    participant Client as Next.js Dashboard

    Officer->>Gateway: POST /api/v1/projects/{id}/documents (PDF/Image file)
    Gateway->>Storage: Validate MIME type & enforce size boundaries (<= 50MB)
    Storage->>Storage: Generate SHA-256 Content Hash
    Storage->>Database: Query existing file_hash for duplicate detection
    
    alt File Hash Already Exists
        Storage-->>Gateway: 409 Conflict: Duplicate document detected
        Gateway-->>Officer: Alert: "Identical document already registered in project repository"
    else File Is Unique
        Storage->>Storage: Store file in vault: backend/storage/project-documents/{proj_id}/{doc_id}/v1/
        Storage->>DocIntel: Trigger async processing pipeline
        
        activate DocIntel
        DocIntel->>DocIntel: Extract raw text & structural tables (PyMuPDF / OCR)
        DocIntel->>DocIntel: Scan for project milestones, financial outlays & approval dates
        DocIntel->>DocIntel: Synthesize AI Executive Summary & Risk Tags
        DocIntel->>Database: Update Document record (status=PROCESSED, extracted_metadata, ai_summary)
        deactivate DocIntel
        
        Storage->>Database: Insert DocumentAuditLog (action=UPLOAD, user=Officer.id)
        Gateway-->>Client: 201 Created: Document metadata + Instant preview URL
        Client-->>Officer: Render interactive PDF Preview Modal with AI metadata summary
    end
```

---

## 6. Intervention Action Management & Governance State Machine

Remediation workflows follow a strict **tamper-evident state machine** with role-enforced transitions, supervisory approvals, and audit trail logging.

```mermaid
stateDiagram-v2
    [*] --> PENDING: Action Created (AI Early Warning or Manual)
    
    PENDING --> ASSIGNED: Assign to Monitoring Officer / Engineer
    ASSIGNED --> IN_PROGRESS: Officer Acknowledges & Commences Field Work
    
    IN_PROGRESS --> UNDER_SUPERVISORY_REVIEW: Officer Submits Completion Evidence & Notes
    
    state UNDER_SUPERVISORY_REVIEW {
        [*] --> InspectionPending
        InspectionPending --> EvidenceAudit
    }
    
    UNDER_SUPERVISORY_REVIEW --> REVISION_REQUESTED: Supervisor Rejects / Requests Field Verification
    REVISION_REQUESTED --> IN_PROGRESS: Officer Revises Corrective Measures
    
    UNDER_SUPERVISORY_REVIEW --> VERIFIED: Supervisor Approves Remediation Evidence
    
    VERIFIED --> CLOSED: Risk Score Normalized & Alert Cleared
    
    IN_PROGRESS --> ESCALATED: Milestone Deadline Breached / SLA Expired
    ESCALATED --> UNDER_SUPERVISORY_REVIEW: High-Priority Intervention Escalated to Ministry
    
    CLOSED --> [*]
```

> [!TIP]
> **Tamper-Evident History**: Every state change, reassignment, priority modification, and review note is immutably appended to the `intervention_action_history` table with UTC timestamp and officer credentials.

---

## 7. Citizen Ground Evidence & Fraud Detection Triangulation

PRISM bridges public transparency with automated fraud prevention by triangulating contractor progress claims against geotagged citizen submissions.

```mermaid
flowchart TB
    subgraph Citizen_Reporting["Public Citizen Transparency Portal (/citizen)"]
        C1["Citizen Inspects Local Infrastructure Asset"] --> C2["Capture Geotagged Field Photo Evidence"]
        C2 --> C3["Submit Grievance / Progress Report\n(Category, Description, Phone, GPS)"]
    end

    subgraph Spatial_Verification["Spatial Boundary & Integrity Validation"]
        C3 --> G1["Extract Camera EXIF Geolocation"]
        G1 --> G2{"Calculate Haversine Distance to Official Coordinates"}
        G2 -- "Distance <= 5.0 KM" --> G3["Flag: GEOGRAPHICALLY_VALID"]
        G2 -- "Distance > 5.0 KM" --> G4["Flag: LOCATION_MISMATCH_SUSPECT"]
    end

    subgraph Fraud_Engine["Fraud & Anomaly Detection Engine (/api/v1/fraud)"]
        G3 & G4 --> F1["Triangulate Against Contractor Reported Progress"]
        F1 --> F2{"Discrepancy Matrix Check"}
        F2 -- "Claimed 80% vs Observed Foundation" --> F3["HIGH ANOMALY: Ghost Progress Alert"]
        F2 -- "Vendor Concentration > 70% in District" --> F4["HIGH ANOMALY: Bid Rigging Risk"]
        F2 -- "Consecutive 3x Cost Escalations" --> F5["MEDIUM ANOMALY: Escalation Abuse"]
        F2 -- "Progress Verified by Spatial Consensus" --> F6["VERIFIED: Legitimate Progress"]
    end

    subgraph Executive_Escalation["Escalation & Resolution"]
        F3 & F4 & F5 --> E1["Generate Red-Flag Audit Ticket"]
        E1 --> E2["Notify Ministry Oversight Vigilance Directorate"]
        F6 --> E3["Update Project Public Verification Index"]
    end
```

---

## 8. Role-Based Access Control (RBAC) & Security Architecture

PRISM enforces strict principle-of-least-privilege access using cryptographically signed **JWT tokens** and hierarchical role permission guards.

```mermaid
flowchart TD
    subgraph User_Roles["Hierarchical Stakeholder Personas"]
        R1["Super Administrator (MoSPI IT / PMO)"]
        R2["Decision Maker (Secretary / Joint Secretary)"]
        R3["Monitoring Officer (Director / Project Engineer)"]
        R4["Policy Analyst / Auditor (NITI Aayog / CAG)"]
        R5["Public Citizen (Open Governance)"]
    end

    subgraph Permissions_Matrix["Granular Permission Capabilities"]
        P1["Full System Control & Role Management"]
        P2["Portfolio Analytics & Executive Briefing PDF Generation"]
        P3["Action Lifecycle: Create, Assign, Transition, Approve"]
        P4["Document Upload, OCR Triggering & PDF Inspection"]
        P5["Citizen Grievance Submission & Public Status Tracking"]
        P6["Fraud Engine Configuration & Anomaly Dismissal"]
    end

    R1 --> P1 & P2 & P3 & P4 & P6
    R2 --> P2 & P3 & P4
    R3 --> P3 & P4
    R4 --> P2 & P4
    R5 --> P5
```

### Permission Guard Matrix

| Role | Command Center | Geospatial GIS | Early Warning | Action Lifecycle | Doc Management | Fraud Alerts | User Admin |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Super Admin** | 🟢 Read/Write | 🟢 Full Access | 🟢 Full Access | 🟢 Full Access | 🟢 Full Access | 🟢 Full Access | 🟢 Manage All |
| **Decision Maker** | 🟢 Read/Write | 🟢 Full Access | 🟢 Full Access | 🟢 Approve/Close | 🟢 View/Download | 🟢 Review Flags | 🔴 Read Only |
| **Monitoring Officer** | 🟢 Read Only | 🟢 Sector GIS | 🟢 Operational | 🟢 Update/Submit | 🟢 Upload/View | 🟡 View Project | 🔴 Restricted |
| **Policy Analyst** | 🟢 Read Only | 🟢 Spatial Read | 🟢 Analytical | 🟡 View Only | 🟢 View Only | 🟡 View Metrics | 🔴 Restricted |
| **Public Citizen** | 🔴 Restricted | 🟡 Public Map | 🔴 Restricted | 🔴 Restricted | 🔴 Restricted | 🔴 Restricted | 🔴 Restricted |

---

## 9. Database Entity Relationship Diagram (ERD)

The persistence layer uses a high-performance relational schema with UUID primary keys, JSONB polymorphic payloads, and cascade safety constraints.

```mermaid
erDiagram
    PROFILES ||--o{ PROJECTS : "supervises"
    PROFILES ||--o{ ACTION_ITEMS : "assigned_to"
    PROFILES ||--o{ ALERTS : "acknowledges"
    PROFILES ||--o{ AUDIT_LOGS : "generates"

    PROJECTS ||--o{ RISK_PREDICTIONS : "evaluates"
    PROJECTS ||--o{ ALERTS : "triggers"
    PROJECTS ||--o{ MILESTONES : "schedules"
    PROJECTS ||--o{ ACTION_ITEMS : "remediates"
    PROJECTS ||--o{ DOCUMENTS : "attaches"
    PROJECTS ||--o{ CITIZEN_GRIEVANCES : "receives"
    PROJECTS ||--o{ FIELD_EVIDENCE : "verifies"

    ACTION_ITEMS ||--o{ INTERVENTION_ACTION_HISTORY : "tracks_changes"
    ACTION_ITEMS ||--o{ ACTION_COMMENTS : "collaborates"

    DOCUMENTS ||--o{ DOCUMENT_AUDIT_LOGS : "logs_access"

    PROJECTS {
        uuid id PK
        string project_name
        string ministry
        string sector
        string state
        string district
        numeric latitude
        numeric longitude
        numeric original_cost_cr
        numeric revised_cost_cr
        numeric cumulative_expenditure_cr
        numeric physical_progress_pct
        date scheduled_completion_date
        date revised_completion_date
        string project_scale
        numeric burn_rate_pct
        numeric burn_progress_gap
        numeric time_elapsed_ratio
    }

    RISK_PREDICTIONS {
        uuid id PK
        uuid project_id FK
        numeric delay_probability
        numeric delay_duration_months
        numeric cost_overrun_probability
        numeric cost_overrun_amount_cr
        numeric composite_risk_score
        string risk_tier
        jsonb shap_values
        text ai_risk_narrative
        string model_version
    }

    ACTION_ITEMS {
        uuid id PK
        string action_number UK
        uuid project_id FK
        string title
        text description
        string assigned_to
        uuid assigned_officer_id FK
        string priority
        string status
        integer completion_percentage
        text root_cause
        text recommended_action
        string approval_status
        uuid approved_by FK
    }

    DOCUMENTS {
        uuid id PK
        uuid project_id FK
        string doc_type
        string title
        string file_name
        string file_hash
        string file_path
        string processing_status
        text extracted_text
        jsonb extracted_metadata
        text ai_summary
        string confidentiality_level
    }

    CITIZEN_GRIEVANCES {
        uuid id PK
        uuid project_id FK
        string reference_id UK
        string citizen_name
        string category
        text description
        numeric latitude
        numeric longitude
        string status
    }
```

---

## 10. National Digital Ecosystem & Interoperability Gateway

PRISM functions as the central analytical nucleus interconnecting diverse national government portals through standard RESTful JSON integrations.

```mermaid
flowchart LR
    subgraph PRISM_Core["PRISM Infrastructure Intelligence Core"]
        CORE["PRISM Unified Gateway (:8000)"]
    end

    subgraph Planning_Spatial["Planning & Spatial Systems"]
        GATI["PM GatiShakti National Master Plan\n(GIS Layer Sync & Corridor Overlays)"]
    end

    subgraph Financial_Systems["Financial Disbursal Systems"]
        PFMS["PFMS Central Ledger\n(Expenditure Sanctions & Utilization Certs)"]
    end

    subgraph Procurement_Systems["Procurement & Contracting"]
        GEM["Government e-Marketplace (GeM)\n(Tender Timelines & Contractor Awards)"]
    end

    subgraph Sector_Authorities["Sector-Specific Portals"]
        CRIS["Indian Railways CRIS / FOIS\n(Track Laying & Electrification Telemetry)"]
        NHAI["NHAI Data Lake Portal\n(Highway Milestone Progress & Toll Stations)"]
    end

    subgraph Public_Transparency["Citizen Portals"]
        DIGI["DigiLocker Ecosystem\n(Verified Engineering Certificates)"]
    end

    CORE <==>|"GeoJSON Spatial Vectors"| GATI
    CORE <==>|"Expenditure Reconciliation"| PFMS
    CORE <==>|"Vendor & Contract Data"| GEM
    CORE <==>|"Telemetry Progress APIs"| CRIS
    CORE <==>|"Corridor Geodata"| NHAI
    CORE <==>|"Certificate Attestation"| DIGI
```

---

## 11. Performance, Resilience & High-Availability Architecture

To support uninterrupted nationwide monitoring during emergency reviews and cabinet meetings, PRISM implements enterprise fault tolerance:

```mermaid
flowchart TB
    subgraph Load_Balancing["Edge Traffic Ingress"]
        LB["High-Performance Reverse Proxy / Cloudflare Edge"]
    end

    subgraph Frontend_Cluster["Stateless Web Nodes (Next.js 16 App Router)"]
        FE1["Next.js Node Instance A"]
        FE2["Next.js Node Instance B"]
    end

    subgraph Backend_Cluster["Asynchronous Application Core (FastAPI ASGI)"]
        API1["FastAPI Worker A (Uvicorn)"]
        API2["FastAPI Worker B (Uvicorn)"]
    end

    subgraph Database_Tier["Resilient Multi-Mode Persistence"]
        POOL["PgBouncer Connection Pooler (:6543)"]
        PG_PRIMARY[("PostgreSQL Primary Node\n(Production Master)")]
        PG_REPLICA[("PostgreSQL Read Replica\n(Analytics Offload)")]
        SQLITE_LOCAL[("SQLite Local Storage\n(Offline Edge Fallback)")]
    end

    LB --> FE1 & FE2
    FE1 & FE2 ==>|"Fast API REST"| API1 & API2
    API1 & API2 --> POOL
    POOL --> PG_PRIMARY
    PG_PRIMARY -.->|"Continuous Replication"| PG_REPLICA
    API1 & API2 -.->|"Automatic Failover on Network Loss"| SQLITE_LOCAL
```

### Resilience Guarantees
1. **Offline Edge Resilience**: If PostgreSQL network connectivity is disrupted, the backend gracefully switches to local `sql_app.db` SQLite storage, ensuring zero downtime for field officers.
2. **Connection Starvation Prevention**: PgBouncer transaction pooling prevents PostgreSQL connection exhaustion during concurrent portfolio scans across 1,981+ assets.
3. **Sub-40 Millisecond API Response**: Optimized database indexing on `(state, sector, risk_tier)` and lightweight Pydantic v2 schemas deliver sub-40ms response times for virtualized tables.

---

<div align="center">
  <sub>Engineered with precision for National Infrastructure Intelligence · Smart India Hackathon 2026</sub>
  <br />
  <sub>Official Repository: <a href="https://github.com/vedant1506/SIH-26">vedant1506/SIH-26</a></sub>
</div>
