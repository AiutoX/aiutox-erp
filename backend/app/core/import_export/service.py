"""Import/Export service for data import and export management."""

import csv
import io
import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.files.service import FileService
from app.core.import_export.models import ExportJob, ImportJob, ImportStatus
from app.core.pubsub import EventPublisher, get_event_publisher
from app.core.pubsub.models import EventMetadata
from app.repositories.import_export_repository import ImportExportRepository

logger = logging.getLogger(__name__)


class DataExporter:
    """Service for exporting data to various formats. Delegates to the
    dedicated exporters/ classes to avoid duplicating format-specific logic
    (those classes are also reused directly by audit and reports)."""

    def __init__(self, db: Session):
        """Initialize exporter with database session."""
        self.db = db

    def export_to_csv(
        self, data: list[dict[str, Any]], columns: list[str] | None = None
    ) -> bytes:
        """Export data to CSV format."""
        from app.core.import_export.exporters.csv_exporter import CSVExporter

        return CSVExporter().export(data, fieldnames=columns)

    def export_to_excel(
        self, data: list[dict[str, Any]], columns: list[str] | None = None
    ) -> bytes:
        """Export data to Excel format.

        ExcelExporter.export() returns b"" for empty data regardless of
        columns, but generate_import_template_file() needs a header-only
        workbook for an empty dataset (blank template download) — build that
        case directly instead of delegating to preserve that behavior.
        """
        if not data and columns:
            from openpyxl import Workbook

            wb = Workbook()
            ws = wb.active
            ws.append(columns)
            output = io.BytesIO()
            wb.save(output)
            return output.getvalue()

        from app.core.import_export.exporters.excel_exporter import ExcelExporter

        return ExcelExporter().export(data, fieldnames=columns)

    def export_to_pdf(
        self,
        data: list[dict[str, Any]],
        columns: list[str] | None = None,
        title: str = "Export",
    ) -> bytes:
        """Export data to PDF format."""
        from app.core.import_export.exporters.pdf_exporter import PDFExporter

        return PDFExporter().export(data, columns=columns, title=title)


class DataImporter:
    """Service for importing data from various formats."""

    def __init__(self, db: Session):
        """Initialize importer with database session."""
        self.db = db

    def import_from_csv(
        self,
        file_content: bytes,
        delimiter: str = ",",
        encoding: str = "utf-8",
        skip_header: bool = True,
    ) -> list[dict[str, Any]]:
        """Import data from CSV format.

        Args:
            file_content: CSV file content as bytes
            delimiter: CSV delimiter
            encoding: File encoding
            skip_header: Whether to skip the first row (header)

        Returns:
            List of dictionaries representing rows
        """
        try:
            content = file_content.decode(encoding)
            reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)

            data = []
            for row in reader:
                # Convert empty strings to None
                cleaned_row = {k: (v if v else None) for k, v in row.items()}
                data.append(cleaned_row)

            return data

        except Exception as e:
            logger.error(f"Failed to import CSV: {e}")
            raise ValueError(f"Failed to parse CSV file: {e}")

    def validate_data(
        self, data: list[dict[str, Any]], validation_rules: dict[str, Any] | None = None
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Validate imported data.

        Args:
            data: List of dictionaries representing rows
            validation_rules: Validation rules (optional)

        Returns:
            Tuple of (valid_rows, invalid_rows_with_errors)
        """
        valid_rows = []
        invalid_rows = []

        for idx, row in enumerate(data):
            errors = []
            # Basic validation (can be extended with validation_rules)
            if validation_rules:
                for field, rules in validation_rules.items():
                    value = row.get(field)
                    if "required" in rules and rules["required"] and not value:
                        errors.append(f"{field} is required")
                    if "type" in rules and value:
                        expected_type = rules["type"]
                        if expected_type == "int" and not isinstance(value, int):
                            try:
                                int(value)
                            except (ValueError, TypeError):
                                errors.append(f"{field} must be an integer")

            if errors:
                invalid_rows.append({"row": idx + 1, "data": row, "errors": errors})
            else:
                valid_rows.append(row)

        return valid_rows, invalid_rows


class ImportExportService:
    """Service for managing import and export operations."""

    def __init__(
        self,
        db: Session,
        file_service: FileService | None = None,
        event_publisher: EventPublisher | None = None,
    ):
        """Initialize import/export service.

        Args:
            db: Database session
            file_service: FileService instance (created if not provided)
            event_publisher: EventPublisher instance (created if not provided)
        """
        self.db = db
        self.repository = ImportExportRepository(db)
        self.exporter = DataExporter(db)
        self.importer = DataImporter(db)
        self.file_service = file_service or FileService(db)
        self.event_publisher = event_publisher or get_event_publisher()

    def create_import_job(
        self,
        job_data: dict,
        tenant_id: UUID,
        user_id: UUID,
    ) -> ImportJob:
        """Create a new import job.

        Args:
            job_data: Import job data
            tenant_id: Tenant ID
            user_id: User ID who created the job

        Returns:
            Created ImportJob object
        """
        job_data["tenant_id"] = tenant_id
        job_data["created_by"] = user_id
        job_data["status"] = ImportStatus.PENDING

        job = self.repository.create_import_job(job_data)

        # Publish event
        from app.core.pubsub.event_helpers import safe_publish_event

        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type="import.started",
            entity_type="import_job",
            entity_id=job.id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata=EventMetadata(
                source="import_export_service",
                version="1.0",
                additional_data={"module": job.module, "file_name": job.file_name},
            ),
        )

        return job

    def create_export_job(
        self,
        job_data: dict,
        tenant_id: UUID,
        user_id: UUID,
    ) -> ExportJob:
        """Create a new export job.

        Args:
            job_data: Export job data
            tenant_id: Tenant ID
            user_id: User ID who created the job

        Returns:
            Created ExportJob object
        """
        job_data["tenant_id"] = tenant_id
        job_data["created_by"] = user_id
        job_data["status"] = ImportStatus.PENDING

        return self.repository.create_export_job(job_data)

    async def get_import_job_errors(
        self, job_id: UUID, tenant_id: UUID
    ) -> list[dict] | None:
        """Get errors for an import job."""
        job = self.repository.get_import_job_by_id(job_id, tenant_id)
        if not job:
            return None
        errors = job.errors
        if not isinstance(errors, list):
            return None
        return errors  # type: ignore[return-value]

    async def get_export_job_file(
        self, job_id: UUID, tenant_id: UUID
    ) -> tuple[bytes, str] | None:
        """Get export job file content and filename.

        Returns:
            Tuple of (file_content, filename) or None if job/file not found
        """
        job = self.repository.get_export_job_by_id(job_id, tenant_id)
        if not job or not job.file_path:
            return None

        # Check if file exists via storage backend
        # We assume file_path is relative to storage root as managed by FileService
        try:
            content = await self.file_service.storage_backend.download(job.file_path)
            return content, job.file_name or "export"
        except Exception as e:
            logger.error(f"Failed to download export file {job.file_path}: {e}")
            return None

    async def generate_import_template_file(
        self, template_id: UUID, tenant_id: UUID
    ) -> bytes | None:
        """Generate import template file (Excel)."""
        template = self.repository.get_import_template_by_id(template_id, tenant_id)
        if not template:
            return None

        # Extract headers from field_mapping
        # field_mapping is JSONB: { "csv_col": "model_field" } or { "model_field": "csv_col" }?
        # Usually template defines what columns are expected.
        # Assuming field_mapping keys are the CSV headers.
        headers = []
        if template.field_mapping and isinstance(template.field_mapping, dict):
            headers = list(template.field_mapping.keys())

        # Generate empty Excel with headers
        return self.exporter.export_to_excel([], columns=headers)

    def get_import_job(self, job_id: UUID, tenant_id: UUID) -> ImportJob | None:
        """Get import job by ID."""
        return self.repository.get_import_job_by_id(job_id, tenant_id)

    async def process_import_job(
        self, job_id: UUID, tenant_id: UUID, user_id: UUID
    ) -> ImportJob:
        """Process a pending import job: read the uploaded file, delegate to the
        target module's ImportExportHandler, and update the job with real results.
        """
        from app.core.module_registry import get_module_registry

        job = self.repository.get_import_job_by_id(job_id, tenant_id)
        if not job:
            raise ValueError(f"Import job {job_id} not found")

        job = self.repository.update_import_job(
            job, {"status": ImportStatus.PROCESSING}
        )

        registry = get_module_registry()
        handler = registry.get_import_export_handler(job.module, tenant_id)

        if handler is None:
            return self.repository.update_import_job(
                job,
                {
                    "status": ImportStatus.FAILED,
                    "errors": [
                        {"message": f"Module '{job.module}' does not support import"}
                    ],
                },
            )

        options = job.options if isinstance(job.options, dict) else {}
        file_path = options.get("file_path")
        if not file_path:
            return self.repository.update_import_job(
                job,
                {
                    "status": ImportStatus.FAILED,
                    "errors": [{"message": "No file was uploaded for this job"}],
                },
            )

        try:
            file_content = await self.file_service.storage_backend.download(file_path)
        except Exception as exc:
            return self.repository.update_import_job(
                job,
                {
                    "status": ImportStatus.FAILED,
                    "errors": [{"message": f"Failed to read uploaded file: {exc}"}],
                },
            )

        rows = self.importer.import_from_csv(file_content)
        result = await handler.import_rows(rows, tenant_id, user_id)

        from app.core.pubsub.event_helpers import safe_publish_event
        from app.core.pubsub.models import EventMetadata

        final_status = (
            ImportStatus.COMPLETED if result.failed == 0 else ImportStatus.FAILED
        )
        updated_job = self.repository.update_import_job(
            job,
            {
                "status": final_status,
                "total_rows": len(rows),
                "processed_rows": len(rows),
                "successful_rows": result.successful,
                "failed_rows": result.failed,
                "errors": result.errors or None,
            },
        )

        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type="import.completed" if result.failed == 0 else "import.failed",
            entity_type="import_job",
            entity_id=job.id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata=EventMetadata(
                source="import_export_service",
                version="1.0",
                additional_data={
                    "module": job.module,
                    "successful_rows": result.successful,
                    "failed_rows": result.failed,
                },
            ),
        )

        return updated_job

    async def process_export_job(
        self, job_id: UUID, tenant_id: UUID, user_id: UUID
    ) -> ExportJob:
        """Process a pending export job: fetch real data via the target module's
        ImportExportHandler, generate a real file, and update the job with the
        real file_path so it can be downloaded.
        """
        from app.core.module_registry import get_module_registry

        job = self.repository.get_export_job_by_id(job_id, tenant_id)
        if not job:
            raise ValueError(f"Export job {job_id} not found")

        job = self.repository.update_export_job(
            job, {"status": ImportStatus.PROCESSING}
        )

        registry = get_module_registry()
        handler = registry.get_import_export_handler(job.module, tenant_id)

        if handler is None:
            return self.repository.update_export_job(
                job, {"status": ImportStatus.FAILED}
            )

        filters = job.filters if isinstance(job.filters, dict) else None
        rows = await handler.export_rows(tenant_id, filters)

        columns = job.columns if isinstance(job.columns, list) else None
        if not rows:
            # Empty result set: FileService rejects a zero-byte upload as
            # FILE_TOO_LARGE, so always emit at least a marker line instead
            # of delegating to DataExporter (which returns b"" for []).
            header = ",".join(columns) if columns else "no_data"
            file_bytes = f"{header}\n".encode()
            extension = "xlsx" if job.export_format == "excel" else "csv"
        elif job.export_format == "excel":
            file_bytes = self.exporter.export_to_excel(rows, columns=columns)
            extension = "xlsx"
        else:
            file_bytes = self.exporter.export_to_csv(rows, columns=columns)
            extension = "csv"

        filename = f"{job.module}_export_{job.id}.{extension}"
        uploaded = await self.file_service.upload_file(
            file_content=file_bytes,
            filename=filename,
            entity_type="export_job",
            entity_id=UUID(str(job.id)),
            tenant_id=tenant_id,
            user_id=user_id,
            description=f"Export of {job.module}",
        )

        from app.core.pubsub.event_helpers import safe_publish_event
        from app.core.pubsub.models import EventMetadata

        updated_job = self.repository.update_export_job(
            job,
            {
                "status": ImportStatus.COMPLETED,
                "file_name": filename,
                "file_path": uploaded.storage_path,
                "file_size": len(file_bytes),
                "total_rows": len(rows),
                "exported_rows": len(rows),
            },
        )

        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type="export.completed",
            entity_type="export_job",
            entity_id=job.id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata=EventMetadata(
                source="import_export_service",
                version="1.0",
                additional_data={"module": job.module, "exported_rows": len(rows)},
            ),
        )

        return updated_job

    def get_export_job(self, job_id: UUID, tenant_id: UUID) -> ExportJob | None:
        """Get export job by ID."""
        return self.repository.get_export_job_by_id(job_id, tenant_id)

    def create_import_template(
        self,
        template_data: dict,
        tenant_id: UUID,
        user_id: UUID,
    ) -> Any:
        """Create a new import template."""
        template_data["tenant_id"] = tenant_id
        template_data["created_by"] = user_id
        return self.repository.create_import_template(template_data)

    def get_import_template(self, template_id: UUID, tenant_id: UUID) -> Any:
        """Get import template by ID."""
        return self.repository.get_import_template_by_id(template_id, tenant_id)

    def get_import_templates(
        self,
        tenant_id: UUID,
        module: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Any]:
        """Get import templates."""
        return self.repository.get_import_templates(tenant_id, module, skip, limit)

    def count_import_jobs(
        self,
        tenant_id: UUID,
        module: str | None = None,
        status: str | None = None,
    ) -> int:
        """Count import jobs with optional filters."""
        return self.repository.count_import_jobs(tenant_id, module, status)

    def count_export_jobs(
        self,
        tenant_id: UUID,
        module: str | None = None,
        status: str | None = None,
    ) -> int:
        """Count export jobs with optional filters."""
        return self.repository.count_export_jobs(tenant_id, module, status)

    def count_import_templates(
        self,
        tenant_id: UUID,
        module: str | None = None,
    ) -> int:
        """Count import templates with optional filters."""
        return self.repository.count_import_templates(tenant_id, module)
