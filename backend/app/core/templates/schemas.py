"""Templates module schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class VariableDefinition(BaseModel):
    """Template variable definition."""

    name: str
    type: str
    description: str | None = None


class TemplateCreate(BaseModel):
    """Create template request."""

    name: str = Field(..., min_length=1, max_length=255)
    body: str = Field(...)
    description: str | None = None
    category: str | None = None
    variables: list[VariableDefinition] | None = None
    is_active: bool = True


class TemplateUpdate(BaseModel):
    """Update template request."""

    name: str | None = Field(None, min_length=1, max_length=255)
    body: str | None = None
    description: str | None = None
    category: str | None = None
    variables: list[VariableDefinition] | None = None
    is_active: bool | None = None


class TemplateRenderRequest(BaseModel):
    """Template render request."""

    context: dict[str, Any] | None = None
    entity_type: str | None = None
    entity_id: UUID | None = None


class TemplateRenderResponse(BaseModel):
    """Template render response."""

    rendered_content: str
    template_id: UUID


class RenderedTemplateResponse(BaseModel):
    """Rendered template history response."""

    id: UUID
    template_id: UUID
    rendered_content: str
    context: dict[str, Any] | None = None
    entity_type: str | None = None
    entity_id: UUID | None = None
    created_at: datetime


class TemplateResponse(BaseModel):
    """Template response."""

    id: UUID
    tenant_id: UUID
    name: str
    body: str
    description: str | None = None
    category: str | None = None
    variables: list[VariableDefinition] | None = None
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime


class TemplateListResponse(BaseModel):
    """Template list response."""

    items: list[TemplateResponse]
    total: int
    skip: int
    limit: int
