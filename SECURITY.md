# Security Policy

## 🛡️ Supported Versions

Security updates are actively applied to the primary production branch:

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| 1.0.x (Current `main`) | :white_check_mark: | Production & Hackathon Baseline |
| < 1.0   | :x:                | Deprecated / Development Prototypes |

---

## 🔒 Reporting a Vulnerability

We take the security of government infrastructure analytics and citizen data seriously. If you discover a security vulnerability, please do NOT file a public issue on GitHub. Instead, follow these steps:

1. **Direct Notification**: Email the maintainers at `shahadpathan@users.noreply.github.com` with the subject `[SECURITY] Potential Vulnerability in PRISM`.
2. **Details to Include**:
   - Description of the potential vulnerability and affected endpoints or components.
   - Proof-of-concept (PoC) scripts or reproduction steps.
   - Potential impact (e.g., unauthorized data access, privilege escalation, resource exhaustion).
3. **Response Timeline**:
   - **Initial Acknowledgement**: Within 24-48 hours.
   - **Triage & Remediation Plan**: Within 5 business days.
   - **Coordinated Disclosure**: Fixes will be deployed and verified before public disclosure.

---

## ⚖️ Statutory & Compliance Security Standards

PRISM is designed with strict adherence to public sector security best practices:
- **Zero Database Contamination**: Ephemeral document parsing runs isolated in memory with session TTLs, ensuring unverified draft reports cannot alter authoritative databases.
- **Role-Based Access Control (RBAC)**: All sensitive operations (acknowledging alerts, updating remediations, triggering AI retrains) require signed JWT bearer authentication with verified roles (`admin`, `decision_maker`, `monitoring_officer`).
- **Cryptographic Document Deduplication**: Project documents and audit attachments are hashed using SHA-256 for tamper detection and deduplication.
- **Statutory GFR Rule 175 Auditing**: Public procurement integrity checks operate in advisory mode to preserve statutory confidentiality and legal separation of powers.
