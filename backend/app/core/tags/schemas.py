"""Pydantic schemas for tag operations."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TagCategoryBase(BaseModel):
    """Base schema for tag category."""

    name: str = Field(..., min_length=1, max_length=100)
    color: str | None = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    description: str | None = Field(None, max_length=500)
    parent_id: UUID | None = None
    sort_order: int = Field(default=0, ge=0)


class TagCategoryCreate(TagCategoryBase):
    """Schema for creating a tag category."""


class TagCategoryUpdate(BaseModel):
    """Schema for updating a tag category."""

    name: str | None = Field(None, min_length=1, max_length=100)
    color: str | None = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    description: str | None = Field(None, max_length=500)
    parent_id: UUID | None = None
    sort_order: int | None = None


class TagCategoryRead(TagCategoryBase):
    """Schema for reading a tag category."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    created_at: str
    updated_at: str


class TagBase(BaseModel):
    """Base schema for tag."""

    name: str = Field(..., min_length=1, max_length=100)
    color: str | None = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    description: str | None = Field(None, max_length=500)
    category_id: UUID | None = None


class TagCreate(TagBase):
    """Schema for creating a tag."""


class TagUpdate(BaseModel):
    """Schema for updating a tag."""

    name: str | None = Field(None, min_length=1, max_length=100)
    color: str | None = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    description: str | None = Field(None, max_length=500)
    category_id: UUID | None = None


class TagRead(TagBase):
    """Schema for reading a tag."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    is_active: bool
    created_at: str
    updated_at: str


class EntityTagCreate(BaseModel):
    """Schema for applying a tag to an entity."""

    tag_id: UUID
    entity_type: str = Field(..., min_length=1, max_length=50)
    entity_id: UUID


class EntityTagRead(BaseModel):
    """Schema for reading an entity-tag relationship."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tag_id: UUID
    entity_type: str
    entity_id: UUID
    tenant_id: UUID
    created_at: str
    tag: TagRead | None = None  # Populated if relationship includes tag data


class TagListResponse(BaseModel):
    """Response schema for tag list operations."""

    tags: list[TagRead]
    total: int
    limit: int
    offset: int


class EntityTagsResponse(BaseModel):
    """Response schema for entity tags."""

    entity_type: str
    entity_id: UUID
    tags: list[TagRead]
    total: int
