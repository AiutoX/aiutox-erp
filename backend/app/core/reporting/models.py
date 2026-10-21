"""Reporting models for report definitions and dashboards."""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import (
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.db.session import Base


class ReportDefinition(Base):
    """Report definition model."""

    __tablename__ = "report_definitions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    data_source_type = Column(
        String(100), nullable=False, index=True
    )  # e.g., 'products', 'inventory'
    filters = Column(JSONB, nullable=True)  # Filter configuration
    visualization_type = Column(String(50), nullable=False)  # 'table', 'chart', 'kpi'
    config = Column(JSONB, nullable=True)  # Visualization-specific configuration
    created_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_report_definitions_tenant", "tenant_id"),
        Index("idx_report_definitions_data_source", "data_source_type"),
    )


class DashboardWidget(Base):
    """Dashboard widget model."""

    __tablename__ = "dashboard_widgets"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    dashboard_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("dashboards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    report_definition_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("report_definitions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    position = Column(JSONB, nullable=False)  # {x, y, width, height}
    size = Column(JSONB, nullable=False)  # Widget size configuration
    filters = Column(JSONB, nullable=True)  # Widget-specific filters
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_dashboard_widgets_dashboard", "dashboard_id"),
        Index("idx_dashboard_widgets_report", "report_definition_id"),
    )


class ReportExecution(Base):
    """Record of one report execution (success or failure), including
    permission-denied attempts (REP-005 open question: recorded for audit
    completeness, same as any other failure)."""

    __tablename__ = "report_executions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    report_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("report_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    row_count = Column(Integer, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False)  # 'success' | 'failed'
    error_message = Column(Text, nullable=True)
    filters_used = Column(JSONB, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_report_executions_tenant_created", "tenant_id", "created_at"),
        Index("idx_report_executions_report", "report_id"),
    )


class FieldPermission(Base):
    """Per-column visibility rule for a reporting data source (FR-7).

    A row means: to see `column_name` on `dataset_type`, a user must hold
    `required_permission` — checked the same way per-dataset access is
    (app.core.auth.permissions.has_permission), not a separate ABAC engine.
    """

    __tablename__ = "reporting_field_permissions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dataset_type = Column(String(100), nullable=False)
    column_name = Column(String(100), nullable=False)
    required_permission = Column(String(255), nullable=False)
    created_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "dataset_type",
            "column_name",
            name="uq_reporting_field_permissions_tenant_dataset_column",
        ),
        Index("idx_reporting_field_permissions_tenant", "tenant_id"),
        Index(
            "idx_reporting_field_permissions_dataset",
            "tenant_id",
            "dataset_type",
        ),
    )
