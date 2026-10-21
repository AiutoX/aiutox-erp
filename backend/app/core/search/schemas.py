"""Pydantic schemas for search module.

SRC-002: corrected contract — the frontend (search.api.ts) already expects
this SearchResultItem shape (title/description/url/score/dates); the backend
previously returned an incompatible label/data-grouped-by-type shape. See
docs/04-modules/core/search/MODULE-SPEC.md Section 11.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SearchRequest(BaseModel):
    """POST /search request body."""

    model_config = ConfigDict()

    query: str = Field(..., min_length=2, max_length=500, description="Search query")
    entity_types: list[str] | None = Field(None, description="Filter by entity types")
    limit: int = Field(20, ge=1, le=100, description="Max results")
    offset: int = Field(0, ge=0, description="Result offset")


class SearchResultItem(BaseModel):
    """Single search result, matching the frontend's SearchResultItem contract.

    created_at/updated_at use a camelCase alias to match the frontend's
    existing createdAt/updatedAt field names exactly (see
    frontend/app/features/search/api/search.api.ts) while keeping the
    Python-side attribute snake_case per project convention.
    """

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    type: str
    title: str
    description: str | None = None
    url: str
    icon: str | None = None
    score: float | None = None
    created_at: str | None = Field(None, alias="createdAt")
    updated_at: str | None = Field(None, alias="updatedAt")
    metadata: dict[str, Any] = Field(default_factory=dict)


class SuggestionItem(BaseModel):
    """Single autocomplete suggestion."""

    model_config = ConfigDict(from_attributes=True)

    text: str
    entity_type: str
    entity_id: str


class SearchableType(BaseModel):
    """One entry in the searchable-types catalog."""

    model_config = ConfigDict(from_attributes=True)

    entity_type: str
    label: str
    icon: str | None = None
    module_id: str


class ReindexJobResponse(BaseModel):
    """POST /search/reindex/{module_id} response."""

    model_config = ConfigDict()

    job_id: str
    status: str


class IndexEntityRequest(BaseModel):
    """POST /search/index request body — manual/direct indexing, used by
    admin tooling and E2E test setup. Most indexing happens automatically
    via SearchIndexConsumer; this is the escape hatch for entities without
    a registered SearchProvider or for test fixtures."""

    model_config = ConfigDict()

    entity_type: str = Field(..., max_length=50)
    entity_id: str
    title: str = Field(..., max_length=255)
    content: str | None = None
    module_id: str = Field(default="manual")
    metadata: dict[str, Any] | None = None
