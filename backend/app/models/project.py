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
                return str(uuid.UUID(str(value)))
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(str(value))
            else:
                return value


JSON_TYPE = JSON().with_variant(JSONB, "postgresql")
IS_POSTGRES = engine.dialect.name == "postgresql"
SCHEMA_ARGS = {"schema": "public"} if IS_POSTGRES else {}
FK_PROJECTS = "public.projects.id" if IS_POSTGRES else "projects.id"
FK_PROFILES = "public.profiles.id" if IS_POSTGRES else "profiles.id"


class Profile(Base):
    """User profile linked to Supabase Auth user."""
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Project(Base):
    """Core infrastructure project table."""
    __tablename__ = "projects"
    __table_args__ = SCHEMA_ARGS

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_name = Column(String, nullable=False)
    ministry = Column(String, nullable=False)
    sector = Column(String, nullable=False)        # Roads, Railways, Power, etc.
    state = Column(String, nullable=False)
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

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    predictions = relationship("RiskPrediction", back_populates="project", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")


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

