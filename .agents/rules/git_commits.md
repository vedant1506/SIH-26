# Git Commit Guidelines

All git commit messages in this repository must follow strict senior-engineering and generative standards:

1. **Format**: Semantic conventional commit format with specific scopes:
   `<type>(<scope>): <high-context generative description>`
   - Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `chore`, `test`, `style`.
   - Examples of Scopes: `orchestration`, `inference`, `ingestion`, `parser`, `gis`, `viewport`, `telemetry`.

2. **No AI-sounding Clichés**:
   - Never write robotic or vague messages like "fix bug as requested", "update code", "add changes", "refactor code for user", or "fix issue in component".
   - Instead, write crisp, technical, intent-driven descriptions highlighting *what was architecturally achieved* and *why* (e.g., `bypass CPU tensor thrashing via dynamic empirical heuristic dispatch`, `harden slide-over mobile drawer against layout reflow on touch viewports`).

3. **Tone**:
   - Imperative mood, lowercase description (e.g. `feat(parser): isolate table 6 ongoing register with dual-cost cell normalization`).
   - Grounded in real architectural domain terms (e.g. TreeSHAP, PyMuPDF, XGBoost, Turbopack, Recharts, Viewport).
