import uuid
from datetime import date, datetime
from sqlalchemy import (
    Column, String, Numeric, Boolean, Date, DateTime,
    ForeignKey, Text, Computed, Integer, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base, engine

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(36), storing as stringified hex values.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                try:
                    return str(uuid.UUID(str(value)))
                except Exception:
                    return str(value)
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                try:
                    return uuid.UUID(str(value))
                except Exception:
                    return str(value)
            else:
                return value


JSON_TYPE = JSON().with_variant(JSONB, "postgresql")
IS_POSTGRES = engine.dialect.name == "postgresql"
SCHEMA_ARGS = {"schema": "public"} if IS_POSTGRES else {}
FK_PROJECTS = "public.projects.id" if IS_POSTGRES else "projects.id"
FK_PROFILES = "public.profiles.id" if IS_POSTGRES else "profiles.id"


class Profile(Base):
    """
    User profile for PRISM platform stakeholders.
    Roles: admin | decision_maker | monitoring_officer | analyst
    """
    __tablename__ = "profiles"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(
        String,
        nullable=False,
        default="monitoring_officer",
        # Valid roles: admin, decision_maker, monitoring_officer, analyst
    )
    # Government officer identity fields
    designation = Column(String, nullable=True)              # e.g. "Joint Secretary", "Chief Project Officer"
    department_or_ministry = Column(String, nullable=True)   # e.g. "MoSPI", "NHAI", "NITI Aayog"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Project(Base):
    """Core infrastructure project table."""
    __tablename__ = "projects"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_name = Column(String, nullable=False)
    ministry = Column(String, nullable=False)
    sector = Column(String, nullable=False)        # Roads, Railways, Power, etc.
    state = Column(String, nullable=False)
    district = Column(String)
    location_name = Column(String)
    latitude = Column(Numeric)
    longitude = Column(Numeric)

    # Financial fields (in Crore INR)
    original_cost_cr = Column(Numeric, nullable=False)
    revised_cost_cr = Column(Numeric)
    cumulative_expenditure_cr = Column(Numeric)

    # Progress
    physical_progress_pct = Column(Numeric)         # 0–100

    # Dates
    original_start_date = Column(Date)
    scheduled_completion_date = Column(Date)
    revised_completion_date = Column(Date)
    actual_completion_date = Column(Date)

    # Scale classification
    project_scale = Column(String)                  # mega (>=1000Cr), major (150-1000Cr), other

    # Derived risk indicators (computed by backend service)
    burn_rate_pct = Column(Numeric)                 # expenditure / revised_cost * 100
    burn_progress_gap = Column(Numeric)             # burn_rate - physical_progress
    time_elapsed_ratio = Column(Numeric)            # elapsed_days / total_days

    # Authoritative flash report attributes (April 2026 dataset)
    project_id = Column(String, unique=True, index=True, nullable=True)  # Numeric identifier e.g. "612786"
    agency = Column(String, nullable=True)
    pmgid = Column(String, nullable=True)
    legacy_ocms_code = Column(String, nullable=True)
    approval_date_mm_yyyy = Column(String, nullable=True)
    start_date_mm_yyyy = Column(String, nullable=True)
    original_target_doc_mm_yyyy = Column(String, nullable=True)
    revised_target_doc_mm_yyyy = Column(String, nullable=True)
    report_month = Column(String, nullable=True)  # "April 2026"
    source_pdf_page = Column(Integer, nullable=True)
    sl_no = Column(Integer, nullable=True)
    public_status = Column(String, index=True, nullable=True)  # ON_SCHEDULE | ACTIVE_MONITORING | DELAYED

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    predictions = relationship("RiskPrediction", back_populates="project", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    grievances = relationship("CitizenGrievance", back_populates="project", cascade="all, delete-orphan")
    field_evidence = relationship("FieldEvidence", back_populates="project", cascade="all, delete-orphan")


class RiskPrediction(Base):
    """Stores ML model predictions and SHAP explanations for a project."""
    __tablename__ = "risk_predictions"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID, ForeignKey(FK_PROJECTS, ondelete="CASCADE"), nullable=False)
    predicted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Delay model outputs
    delay_probability = Column(Numeric)             # 0.0 – 1.0
    delay_duration_months = Column(Numeric)         # predicted delay in months

    # Cost overrun model outputs
    cost_overrun_probability = Column(Numeric)      # 0.0 – 1.0
    cost_overrun_amount_cr = Column(Numeric)        # predicted overrun in Crore INR

    # Composite risk
    composite_risk_score = Column(Numeric)          # 0.0 – 1.0
    risk_tier = Column(String)                      # low, medium, high, critical

    # SHAP values as JSON array
    # Format: [{"feature": "burn_progress_gap", "value": 0.35, "direction": "positive", "label": "..."}]
    shap_values = Column(JSON_TYPE)
    ai_risk_narrative = Column(Text)

    model_version = Column(String, default="v1.0")


    # Relationship
    project = relationship("Project", back_populates="predictions")


class Alert(Base):
    """Early warning alerts triggered when risk tier changes."""
    __tablename__ = "alerts"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID, ForeignKey(FK_PROJECTS, ondelete="CASCADE"), nullable=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    alert_type = Column(String, nullable=False)     # risk_escalation, milestone_breach, etc.
    previous_tier = Column(String)
    new_tier = Column(String)
    message = Column(Text)
    status = Column(String, default="NEW")          # NEW | ACKNOWLEDGED | UNDER_REVIEW | ACTION_ASSIGNED | RESOLVED
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(GUID, ForeignKey(FK_PROFILES), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    project = relationship("Project", back_populates="alerts")


class Milestone(Base):
    """Project milestone tracking."""
    __tablename__ = "milestones"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID, ForeignKey(FK_PROJECTS, ondelete="CASCADE"), nullable=False)
    milestone_name = Column(String, nullable=False)
    scheduled_date = Column(Date)
    actual_date = Column(Date)
    is_completed = Column(Boolean, default=False)

    # Relationship
    project = relationship("Project", back_populates="milestones")


class ActionItem(Base):
    """Intervention actions assigned to government officers for stalled/at-risk projects."""
    __tablename__ = "action_items"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    action_number = Column(String, unique=True, index=True, nullable=True)  # e.g. ACT-2026-0001
    project_id = Column(GUID, ForeignKey(FK_PROJECTS, ondelete="CASCADE"), nullable=True)
    alert_id = Column(GUID, nullable=True)
    risk_id = Column(GUID, nullable=True)
    mitigation_id = Column(GUID, nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    assigned_to = Column(String, nullable=True)          # e.g. "Er. Vikram Patel" or designation
    assigned_officer_id = Column(GUID, ForeignKey(FK_PROFILES), nullable=True)  # FK to profiles for formal assignment
    due_date = Column(String, nullable=True)               # YYYY-MM-DD
    priority = Column(String, default="medium")            # critical | high | medium | low
    status = Column(String, default="pending")             # pending | assigned | in_progress | completed | verified | cancelled

    # Execution & Completion Tracking
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    completion_percentage = Column(Integer, default=0)

    # Diagnostic & Remediation Context
    root_cause = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    expected_outcome = Column(Text, nullable=True)
    actual_outcome = Column(Text, nullable=True)
    verification_notes = Column(Text, nullable=True)

    # Provenance & Source
    source_type = Column(String, default="MANUAL")        # MANUAL | EARLY_WARNING | RISK_ENGINE | LLM_RECOMMENDATION | SYSTEM
    source_reference = Column(String, nullable=True)
    last_updated_by = Column(String, nullable=True)

    # Approval / Supervisor Workflow Fields
    approval_status = Column(String, default="not_required")  # not_required | pending | approved | rejected | revision_requested
    approved_by = Column(GUID, ForeignKey(FK_PROFILES), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approval_notes = Column(Text, nullable=True)           # Supervisor's approval/rejection notes
    evidence_url = Column(String, nullable=True)           # File URL uploaded as completion evidence
    response_notes = Column(Text, nullable=True)           # Officer's response when submitting for approval
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project")
    history = relationship("InterventionActionHistory", back_populates="action", cascade="all, delete-orphan", order_by="desc(InterventionActionHistory.created_at)")
    comments = relationship("ActionComment", back_populates="action", cascade="all, delete-orphan", order_by="desc(ActionComment.created_at)")


class InterventionActionHistory(Base):
    """Tamper-evident audit timeline for all state transitions, reassignments, and priority shifts."""
    __tablename__ = "intervention_action_history"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    action_id = Column(GUID, ForeignKey("action_items.id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by_id = Column(String, nullable=True)
    changed_by_name = Column(String, nullable=True)
    changed_by_role = Column(String, nullable=True)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    previous_assignee = Column(String, nullable=True)
    new_assignee = Column(String, nullable=True)
    previous_priority = Column(String, nullable=True)
    new_priority = Column(String, nullable=True)
    comment = Column(Text, nullable=True)
    event_type = Column(String, nullable=False, default="STATUS_CHANGE")  # CREATE | ASSIGN | REASSIGN | STATUS_CHANGE | PRIORITY_CHANGE | COMPLETE | VERIFY | CANCEL | COMMENT | EDIT
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    action = relationship("ActionItem", back_populates="history")


class ActionComment(Base):
    """Stakeholder collaboration notes and status updates for an intervention action."""
    __tablename__ = "action_comments"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    action_id = Column(GUID, ForeignKey("action_items.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, nullable=True)
    user_name = Column(String, nullable=True)
    user_role = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    action = relationship("ActionItem", back_populates="comments")


class CitizenGrievance(Base):
    """Public citizen grievance and feedback mechanism for infrastructure projects."""
    __tablename__ = "citizen_grievances"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID, ForeignKey(FK_PROJECTS, ondelete="CASCADE"), nullable=False)
    reference_id = Column(String, unique=True, index=True, nullable=False)
    citizen_name = Column(String, nullable=False)
    citizen_phone = Column(String, nullable=True)
    citizen_email = Column(String, nullable=True)
    category = Column(String, nullable=False)       # Work Delay, Substandard Quality, Pollution/Hazard, Traffic Disruption, Corruption/Irregularity, Other
    description = Column(Text, nullable=False)
    pincode = Column(String, nullable=True)
    latitude = Column(Numeric, nullable=True)
    longitude = Column(Numeric, nullable=True)
    status = Column(String, default="SUBMITTED")    # SUBMITTED | ACKNOWLEDGED | UNDER_INVESTIGATION | RESOLVED
    action_taken = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    project = relationship("Project", back_populates="grievances")


class FieldEvidence(Base):
    """Geotagged site inspection photo capture with device GPS spatial verification."""
    __tablename__ = "field_evidence"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID, ForeignKey(FK_PROJECTS, ondelete="CASCADE"), nullable=False)
    inspector_name = Column(String, nullable=False)
    inspector_designation = Column(String, nullable=True)
    stage_name = Column(String, nullable=False)      # Foundation, Pier/Pillar, Deck Slab, Superstructure, Finishing
    photo_url = Column(String, nullable=False)
    latitude = Column(Numeric, nullable=False)
    longitude = Column(Numeric, nullable=False)
    distance_to_project_km = Column(Numeric, nullable=True)
    is_verified = Column(Boolean, default=False)
    physical_progress_observed_pct = Column(Numeric, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    project = relationship("Project", back_populates="field_evidence")


class IntegrationDispatchLog(Base):
    """Audit logs for external government system integrations (GatiShakti, DigiLocker, SMS/Email)."""
    __tablename__ = "integration_logs"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    service = Column(String, nullable=False)         # gatishakti | digilocker | sms | email
    event_type = Column(String, nullable=False)      # GATISHAKTI_GIS_SYNC | DIGILOCKER_CERT_VERIFIED | SMS_ALERT_DISPATCHED | EMAIL_SHOWCAUSE_DISPATCHED
    project_id = Column(GUID, ForeignKey(FK_PROJECTS, ondelete="SET NULL"), nullable=True)
    recipient = Column(String, nullable=True)
    payload_summary = Column(Text, nullable=True)
    status = Column(String, default="SUCCESS")       # SUCCESS | FAILED | SIMULATED
    response_code = Column(Integer, default=200)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    """
    Tamper-evident audit trail for all significant user actions on the platform.
    Covers: login, project update, risk update, alert ack, action create/assign/update,
    approval, rejection, document upload, evidence upload, data import, user change, role change.
    """
    __tablename__ = "audit_logs"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=True)          # profile id or "system"
    user_email = Column(String, nullable=True)
    user_role = Column(String, nullable=True)
    action = Column(String, nullable=False)          # LOGIN | PROJECT_UPDATE | ALERT_ACK | ACTION_CREATE | APPROVE | REJECT | etc.
    entity_type = Column(String, nullable=True)     # project | alert | action | document | user | role
    entity_id = Column(String, nullable=True)       # UUID of affected entity
    entity_name = Column(String, nullable=True)     # Human-readable entity name
    old_value = Column(JSON_TYPE, nullable=True)    # Previous state snapshot
    new_value = Column(JSON_TYPE, nullable=True)    # New state snapshot
    extra_metadata = Column(JSON_TYPE, nullable=True)  # Extra context (IP, user-agent, session)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Document(Base):
    """
    Project-specific documents: DPR, monthly reports, expenditure statements,
    contractor reports, administrative documents, supporting evidence.
    Every document MUST be associated with a project_id.
    """
    __tablename__ = "documents"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID, ForeignKey(FK_PROJECTS, ondelete="CASCADE"), nullable=False)
    doc_type = Column(String, nullable=False)          # monthly_report | dpr | expenditure_statement | contractor_report | admin_doc | evidence
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)           # Local path or external URL
    file_name = Column(String, nullable=True)
    original_file_name = Column(String, nullable=True)
    file_path = Column(String, nullable=True)          # Filesystem storage relative path
    storage_url = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    file_hash = Column(String(64), index=True, nullable=True)  # SHA-256 for duplicate detection
    report_month = Column(String, nullable=True)       # e.g. "2026-07" for monthly reports
    document_date = Column(String, nullable=True)      # YYYY-MM-DD
    uploaded_by_id = Column(String, nullable=True)     # profile id
    uploaded_by_name = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    version_number = Column(Integer, default=1)
    parent_document_id = Column(GUID, nullable=True)
    status = Column(String, default="ACTIVE")          # ACTIVE | ARCHIVED | DELETED
    processing_status = Column(String, default="UPLOADED", index=True)  # UPLOADED | PROCESSING | PROCESSED | PARTIAL | FAILED
    extraction_status = Column(String, default="NONE")  # NONE | COMPLETED | OCR_REQUIRED | OCR_UNAVAILABLE | FAILED
    extracted_text = Column(Text, nullable=True)
    extracted_metadata = Column(JSON_TYPE, nullable=True)  # JSON structured extracted data (cost, progress, dates, tables)
    ai_summary = Column(Text, nullable=True)               # AI generated executive summary & findings
    ai_tags = Column(JSON_TYPE, nullable=True)             # AI tags list
    source = Column(String, default="UPLOAD")              # UPLOAD | MANUAL | EXTRACTED | AI
    confidentiality_level = Column(String, default="INTERNAL")  # PUBLIC | INTERNAL | RESTRICTED | CONFIDENTIAL
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    project = relationship("Project")


class DocumentAuditLog(Base):
    """
    Audit log for document actions: upload, preview, download, update, version, reprocess.
    """
    __tablename__ = "document_audit_logs"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    project_id = Column(GUID, ForeignKey(FK_PROJECTS, ondelete="CASCADE"), nullable=True)
    user_id = Column(String, nullable=True)
    user_name = Column(String, nullable=True)
    user_email = Column(String, nullable=True)
    role = Column(String, nullable=True)
    action = Column(String, nullable=False)  # UPLOAD | VIEW | DOWNLOAD | UPDATE | NEW_VERSION | REPROCESS | ARCHIVE | RESTORE | DELETE | AI_QUERY
    details = Column(JSON_TYPE, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document")
    project = relationship("Project")


class Notification(Base):
    """
    Persistent in-app notification system.
    Generated by: risk escalation, action assignment, action due soon/overdue,
    approval workflow events, data import completion, alert creation.
    """
    __tablename__ = "notifications"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=True)            # Target user (None = broadcast to all)
    target_role = Column(String, nullable=True)        # If set, shown to all users with this role
    notification_type = Column(String, nullable=False) # CRITICAL_RISK | HIGH_RISK | COST_ESCALATION | SCHEDULE_DELAY | MILESTONE_OVERDUE | ACTION_ASSIGNED | ACTION_DUE_SOON | ACTION_OVERDUE | APPROVAL_REQUESTED | APPROVED | REJECTED | RISK_ESCALATED | RISK_REDUCED | IMPORT_COMPLETE
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String, default="info")          # critical | high | medium | info
    entity_type = Column(String, nullable=True)        # project | alert | action
    entity_id = Column(String, nullable=True)          # UUID of related entity
    entity_name = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProjectMonthlySnapshot(Base):
    """
    Stores monthly historical snapshots of project data.
    Allows tracking project evolution across months without overwriting data.
    Created automatically when new monthly data is approved during import.
    """
    __tablename__ = "project_monthly_snapshots"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID, ForeignKey(FK_PROJECTS, ondelete="CASCADE"), nullable=False)
    report_month = Column(String, nullable=False)        # YYYY-MM e.g. "2026-07"
    # Financial snapshot
    original_cost_cr = Column(Numeric, nullable=True)
    revised_cost_cr = Column(Numeric, nullable=True)
    cumulative_expenditure_cr = Column(Numeric, nullable=True)
    # Progress snapshot
    physical_progress_pct = Column(Numeric, nullable=True)
    burn_rate_pct = Column(Numeric, nullable=True)
    burn_progress_gap = Column(Numeric, nullable=True)
    time_elapsed_ratio = Column(Numeric, nullable=True)
    # Timeline snapshot
    scheduled_completion_date = Column(Date, nullable=True)
    revised_completion_date = Column(Date, nullable=True)
    # Risk snapshot (from latest prediction at time of snapshot)
    risk_tier = Column(String, nullable=True)
    composite_risk_score = Column(Numeric, nullable=True)
    delay_probability = Column(Numeric, nullable=True)
    cost_overrun_probability = Column(Numeric, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project")



