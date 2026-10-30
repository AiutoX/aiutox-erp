"""Pydantic schemas for the reporting module."""

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReportRequest(BaseModel):
    """Request schema for running a report."""

    data_source: str = Field(
        ..., description="Data source name (e.g., 'billing', 'finances')"
    )
    filters: dict[str, Any] | None = Field(None, description="Report filters")
    columns: list[str] | None = Field(None, description="Columns to include")
    skip: int = Field(0, ge=0, description="Pagination offset")
    limit: int = Field(100, ge=1, le=1000, description="Pagination limit")


class ReportResult(BaseModel):
    """Result of a report execution."""

    data: list[dict[str, Any]] = Field(default_factory=list, description="Report rows")
    total: int = Field(0, description="Total number of rows")
    columns: list[dict[str, str]] = Field(
        default_factory=list, description="Column metadata"
    )


class ReportResultResponse(BaseModel):
    """API response wrapper for report execution results."""

    model_config = ConfigDict(from_attributes=True)

    report_id: UUID | None = Field(
        None, description="Report definition ID if applicable"
    )
    data_source: str = Field(..., description="Data source used")
    result: ReportResult = Field(..., description="Report data and metadata")


class DataSourceInfo(BaseModel):
    """Metadata about an available data source."""

    name: str = Field(..., description="Data source identifier")
    label: str = Field(..., description="Human-readable label")
    description: str = Field("", description="Data source description")


class AvailableDataSourcesResponse(BaseModel):
    """Response containing all available data sources."""

    data_sources: list[DataSourceInfo] = Field(
        default_factory=list, description="List of available data sources"
    )
    total: int = Field(0, description="Total number of available data sources")
