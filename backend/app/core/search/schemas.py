"""Pydantic schemas for search module."""

from typing import Any

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Search request schema."""

    query: str = Field(..., min_length=2, max_length=500, description="Search query")
    entity_types: list[str] | None = Field(None, description="Filter by entity types")
    limit: int = Field(50, ge=1, le=1000, description="Max results")
    offset: int = Field(0, ge=0, description="Result offset")


class SearchResultItem(BaseModel):
    """Single search result."""

    id: str
    entity_type: str
    label: str
    score: float | None = None
    data: dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    """Search response schema."""

    query: str
    total: int
    results: list[SearchResultItem]
    entity_types: list[str] | None = None


class SearchSuggestion(BaseModel):
    """Search suggestion."""

    text: str
    entity_type: str
    count: int = 0


class SuggestionsResponse(BaseModel):
    """Suggestions response."""

    query: str
    suggestions: list[SearchSuggestion]
