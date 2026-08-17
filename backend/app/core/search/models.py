"""Search index models for global search functionality."""

from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Column, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, TSVECTOR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.db.session import Base


class SearchIndex(Base):
    """Search index model for indexing entities for global search."""

    __tablename__ = "search_indices"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Entity reference (polymorphic)
    entity_type = Column(
        String(50), nullable=False, index=True
    )  # e.g., 'product', 'contact', 'order'
    entity_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)

    # Searchable content
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)  # Full text content for search
    search_vector = Column(
        TSVECTOR, nullable=True
    )  # PostgreSQL full-text search vector

    # Additional searchable fields (stored as JSON for flexibility)
    search_metadata = Column(
        "metadata", Text, nullable=True
    )  # JSON string with additional searchable fields

    # Owning module id — lets the read path check "is this module still
    # enabled for this tenant" via a single indexed column, no second lookup
    # per candidate row.
    module_id = Column(String(50), nullable=False, index=True)

    # Normalized value for exact/prefix-only lookups (e.g. a user's email or
    # phone). Deliberately NEVER folded into search_vector's fuzzy full-text
    # index — see MODULE-SPEC.md Section 9/RULE set and PRD FR-11.
    exact_match_value = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_search_indices_entity", "entity_type", "entity_id", unique=True),
        Index(
            "idx_search_indices_tenant_entity", "tenant_id", "entity_type", "entity_id"
        ),
        Index("idx_search_indices_vector", "search_vector", postgresql_using="gin"),
        Index("idx_search_indices_tenant_module", "tenant_id", "module_id"),
        Index(
            "idx_search_indices_tenant_exact_match", "tenant_id", "exact_match_value"
        ),
    )

    def __repr__(self) -> str:
        return f"<SearchIndex(id={self.id}, entity_type={self.entity_type}, entity_id={self.entity_id})>"


class ReindexJobStatus(StrEnum):
    """Status of a search backfill/reindex job."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReindexJob(Base):
    """Tracks a paginated, resumable backfill/reindex run for one
    (tenant, module) pair. last_cursor_id is the primary key of the last
    successfully processed row — used to resume a batch from where it left
    off (cursor-based, never OFFSET, per MODULE-SPEC.md Section 8/13)."""

    __tablename__ = "search_reindex_jobs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module_id = Column(String(50), nullable=False, index=True)
    status = Column(String(20), nullable=False, default=ReindexJobStatus.PENDING)
    last_cursor_id = Column(PG_UUID(as_uuid=True), nullable=True)
    indexed_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)

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
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_search_reindex_jobs_tenant_module", "tenant_id", "module_id"),
    )

    def __init__(self, **kwargs: object) -> None:
        kwargs.setdefault("status", ReindexJobStatus.PENDING)
        kwargs.setdefault("indexed_count", 0)
        kwargs.setdefault("failed_count", 0)
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"<ReindexJob(id={self.id}, module_id={self.module_id}, status={self.status})>"
