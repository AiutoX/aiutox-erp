"""Template models for document and message templating."""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.db.session import Base


class Template(Base):
    """Template model for document and message templates."""

    __tablename__ = "templates"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Template information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    body = Column(Text, nullable=False)

    # Variables metadata (JSON array of variable names and types)
    # Example: [{"name": "user_name", "type": "string"}, {"name": "order_id", "type": "integer"}]
    variables = Column(JSONB, nullable=True, default=[])

    # Category for organizing templates
    category = Column(String(100), nullable=True, index=True)

    # Active status
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Version tracking
    version = Column(Integer, nullable=False, default=1)

    # Metadata (creation source, tags, etc.)
    template_metadata = Column(JSONB, nullable=True)

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

    # Relationships
    rendered_templates = relationship(
        "RenderedTemplate", back_populates="template", cascade="all, delete-orphan"
    )

    def __init__(self, **kwargs: object) -> None:
        kwargs.setdefault("variables", [])
        kwargs.setdefault("is_active", True)
        kwargs.setdefault("version", 1)
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"<Template(id={self.id}, name={self.name}, tenant_id={self.tenant_id})>"


class TemplateVersion(Base):
    """Template version model for tracking template content history."""

    __tablename__ = "template_versions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    template_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    variables = Column(JSONB, nullable=True)
    changelog = Column(Text, nullable=True)
    is_current = Column(Boolean, nullable=False, default=True, index=True)
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

    def __repr__(self) -> str:
        return f"<TemplateVersion(id={self.id}, template_id={self.template_id}, version={self.version_number})>"


class RenderedTemplate(Base):
    """Rendered template model for tracking template renders."""

    __tablename__ = "rendered_templates"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    template_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Rendered content
    rendered_content = Column(Text, nullable=False)

    # Context used for rendering (JSON)
    context = Column(JSONB, nullable=False, default={})

    # Polymorphic relationship (optional)
    entity_type = Column(String(50), nullable=True, index=True)
    entity_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)

    # Timestamps
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    # Relationships
    template = relationship("Template", back_populates="rendered_templates")

    def __repr__(self) -> str:
        return f"<RenderedTemplate(id={self.id}, template_id={self.template_id})>"
