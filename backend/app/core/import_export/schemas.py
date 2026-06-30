"""Pydantic schemas for import/export operations."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ImportJobBase(BaseModel):
    """Base schema for import job."""

    module: str = Field(..., min_length=1, max_length=50)
    file_name: str = Field(..., min_length=1, max_length=255)


class ImportJobCreate(ImportJobBase):
    """Schema for creating an import job."""

    mapping: dict[str, Any] | None = None
    options: dict[str, Any] | None = None


class ImportJobRead(ImportJobBase):
    """Schema for reading an import job."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    file_path: str | None = None
    file_size: int | None = None
    template_id: UUID | None = None
    status: str
    progress: int = Field(ge=0, le=100)
    total_rows: int | None = None
    processed_rows: int = 0
    successful_rows: int = 0
    failed_rows: int = 0
    errors: list[dict[str, Any]] | None = None
    warnings: list[dict[str, Any]] | None = None
    result_summary: dict[str, Any] | None = None
    created_by: UUID | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ExportJobBase(BaseModel):
    """Base schema for export job."""

    module: str = Field(..., min_length=1, max_length=50)
    export_format: str = Field(..., description="csv, excel, or pdf")


class ExportJobCreate(ExportJobBase):
    """Schema for creating an export job."""

    filters: dict[str, Any] | None = None
    columns: list[str] | None = None
    options: dict[str, Any] | None = None


class ExportJobRead(ExportJobBase):
    """Schema for reading an export job."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    file_name: str | None = None
    file_path: str | None = None
    file_size: int | None = None
    status: str
    total_rows: int | None = None
    exported_rows: int = 0
    created_by: UUID | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ImportTemplateBase(BaseModel):
    """Base schema for import template."""

    name: str = Field(..., min_length=1, max_length=255)
    module: str = Field(..., min_length=1, max_length=50)
    field_mapping: dict[str, str] = Field(
        ..., description="CSV column -> model field mapping"
    )


class ImportTemplateCreate(ImportTemplateBase):
    """Schema for creating an import template."""

    description: str | None = Field(None, max_length=1000)
    default_values: dict[str, Any] | None = None
    validation_rules: dict[str, Any] | None = None
    transformations: dict[str, Any] | None = None
    skip_header: bool = True
    delimiter: str = Field(",", min_length=1, max_length=1)
    encoding: str = Field("utf-8", max_length=20)


class ImportTemplateRead(ImportTemplateBase):
    """Schema for reading an import template."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    description: str | None = None
    default_values: dict[str, Any] | None = None
    validation_rules: dict[str, Any] | None = None
    transformations: dict[str, Any] | None = None
    skip_header: bool
    delimiter: str
    encoding: str
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


# Request/Response schemas for export endpoints
class CsvExportRequest(BaseModel):
    """Schema for CSV export request."""

    data: list[dict[str, Any]] = Field(..., description="Data to export")
    columns: list[str] | None = Field(
        None, description="Columns to export (if None, uses all keys)"
    )
    delimiter: str = Field(",", min_length=1, max_length=1)
    filename: str = Field("export", max_length=255)


class ExcelExportRequest(BaseModel):
    """Schema for Excel export request."""

    data: list[dict[str, Any]] = Field(..., description="Data to export")
    columns: list[str] | None = Field(
        None, description="Columns to export (if None, uses all keys)"
    )
    sheet_name: str = Field("Data", max_length=255)
    filename: str = Field("export", max_length=255)


class PdfExportRequest(BaseModel):
    """Schema for PDF export request."""

    data: list[dict[str, Any]] = Field(..., description="Data to export")
    columns: list[str] | None = Field(
        None, description="Columns to export (if None, uses all keys)"
    )
    title: str = Field("Export", max_length=255)
    filename: str = Field("export", max_length=255)
    template_id: UUID | None = Field(
        None, description="Optional import template UUID for PDF layout"
    )


class CsvImportRequest(BaseModel):
    """Schema for CSV import request."""

    file_name: str = Field(..., min_length=1, max_length=255)
    module: str = Field(..., min_length=1, max_length=50)
    template_id: UUID | None = None
    mapping: dict[str, str] | None = None
    delimiter: str = Field(",", min_length=1, max_length=1)
    encoding: str = Field("utf-8", max_length=20)
    skip_header: bool = True


class ImportJobListResponse(BaseModel):
    """Schema for listing import jobs."""

    items: list[ImportJobRead]
    total: int
    skip: int
    limit: int


class ExportJobListResponse(BaseModel):
    """Schema for listing export jobs."""

    items: list[ExportJobRead]
    total: int
    skip: int
    limit: int


class ImportTemplateListResponse(BaseModel):
    """Schema for listing import templates."""

    items: list[ImportTemplateRead]
    total: int
    skip: int
    limit: int
