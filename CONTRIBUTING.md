# Contributing to PRISM

Thank you for your interest in contributing to **PRISM (Predictive Risk & Infrastructure Status Monitoring)**, developed for the **Smart India Hackathon 2026 (SIH26103)** in collaboration with the **Ministry of Statistics and Programme Implementation (MoSPI)**.

PRISM is an enterprise-grade platform combining predictive machine learning (Dual XGBoost + TreeSHAP), ISRO Bhuvan satellite GIS, statutory procurement compliance auditing (GFR Rule 175), and ephemeral document intelligence.

---

## 🧭 Code of Conduct

All contributors and maintainers are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Please ensure interactions remain respectful, inclusive, and professional.

---

## 🛠️ Development Setup

### Prerequisites
- **Python**: Version 3.11 or 3.12 (with `pip` and virtual environment support)
- **Node.js**: Version 20+ LTS (with `npm`)
- **Docker & Docker Compose** (optional, recommended for isolated multi-service development)
- **Git**: Configured with user email and name

### Local Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/vedant1506/SIH-26.git
   cd SIH-26
   ```

2. **Backend Setup**:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate

   pip install -r requirements.txt
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Launch Development Servers**:
   ```bash
   # From root directory:
   python start_all.py
   ```
   Or run individually:
   - Backend: `uvicorn backend.app.main:app --reload --port 8000`
   - Frontend: `cd frontend && npm run dev`

5. **Docker Setup (Alternative)**:
   ```bash
   docker compose up --build
   ```

---

## 🌿 Git Branching Strategy

We follow a structured Git branching model:
- `main`: Production-ready, stable, and verified releases. All commits here must pass automated CI pipelines.
- `feat/<feature-name>`: Dedicated branches for new features or modules.
- `fix/<bug-description>`: Bug fixes and security patches.
- `docs/<doc-name>`: Documentation, architecture specs, and diagram updates.
- `chore/<maintenance>`: Dependency upgrades, CI/CD tweaks, and toolchains.

---

## 📝 Conventional Commit Taxonomy

We strictly enforce senior-engineering semantic commit messages. Every commit must follow this format:

```
<type>(<scope>): <short imperative summary>

[optional detailed description]
```

### Commit Types
| Type | Description |
|---|---|
| `feat` | New functionality or user-facing feature |
| `fix` | Bug fix or calculation error correction |
| `docs` | Documentation, README, or architecture updates |
| `perf` | Performance improvement or computational optimization |
| `refactor` | Code refactoring without changing observable behavior |
| `test` | Adding or updating unit/integration/E2E test suites |
| `chore` | Build tools, CI/CD configuration, dependencies |

### Examples:
- `feat(geo-map): integrate ISRO Bhuvan WMS vector boundary layer`
- `fix(gfr175): correct milestone front-loading risk threshold calculation`
- `docs(readme): add official demonstration video and quickstart guide`

---

## 🧪 Testing & Validation Standards

Before submitting a Pull Request, run all relevant validation suites:

```bash
# 1. Ephemeral Flash Report Parser & GFR-175 Statutory Integrity Tests
python -m pytest backend/tests/test_temporary_analysis.py backend/app/tests/test_gfr175_compliance.py

# 2. Master Geospatial Validation (23 Stages)
python tests/test_master_geo_validation.py

# 3. Geolocation Invariant Audit (100% Boundary Containment)
python scripts/validate_after_rebuild.py

# 4. Frontend Lint & Build Check
cd frontend
npm run lint
cd ..
```

---

## 🔍 Pull Request (PR) Checklist

1. **Self-Review**: Review your own code diffs before requesting review.
2. **Deterministic Tests**: Ensure all automated test suites pass locally.
3. **Documentation**: Update [README.md](README.md) or [ARCHITECTURE.md](ARCHITECTURE.md) if adding new endpoints, config flags, or architectural layers.
4. **No Unintentional Artifacts**: Do not commit temp logs, `.db-wal` files, or raw large model checkpoints.

Thank you for contributing to national infrastructure governance and intelligence!
