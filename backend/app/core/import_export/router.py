"""Import/Export router for data import and export management."""

import logging
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, UploadFile, status
from fastapi import File as FastAPIFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.auth.dependencies import require_permission
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.import_export.schemas import (
    ExportJobCreate,
    ExportJobListResponse,
    ExportJobRead,
    ImportJobListResponse,
    ImportJobRead,
    ImportTemplateCreate,
    ImportTemplateListResponse,
    ImportTemplateRead,
    PdfExportRequest,
)
from app.core.import_export.service import ImportExportService
from app.core.users.models import User
from app.schemas.common import StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def get_import_export_service(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("import_export.read"))],
) -> ImportExportService:
    """Dependency to get ImportExportService."""
    return ImportExportService(db)


# Import Job Endpoints


@router.post(
    "/import",
    response_model=StandardResponse[ImportJobRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create import job",
    tags=["Import Jobs"],
)
async def create_import_job(
    current_user: Annotated[User, Depends(require_permission("import_export.write"))],
    service: Annotated[ImportExportService, Depends(get_import_export_service)],
    file: UploadFile = FastAPIFile(..., description="CSV/Excel file to import"),
    module: str = Query(..., min_length=1, max_length=50),
    template_id: UUID | None = Query(None),
) -> StandardResponse[ImportJobRead]:
    """Create a new import job."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_TENANT",
            message="User must have a tenant assigned",
        )

    try:
        await file.read()
        job_data = {
            "module": module,
            "file_name": file.filename or "import",
            "file_path": None,
            "template_id": template_id,
        }
        job = service.create_import_job(
            job_data, current_user.tenant_id, current_user.id
        )
        return StandardResponse(data=job)
    except Exception as e:
        logger.error(f"Failed to create import job: {e}")
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="IMPORT_CREATION_FAILED",
            message=str(e),
        )


@router.get(
    "/import",
    response_model=StandardResponse[ImportJobListResponse],
    summary="List import jobs",
    tags=["Import Jobs"],
)
async def list_import_jobs(
    current_user: Annotated[User, Depends(require_permission("import_export.read"))],
    service: Annotated[ImportExportService, Depends(get_import_export_service)],
    module: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> StandardResponse[ImportJobListResponse]:
    """List import jobs."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_TENANT",
            message="User must have a tenant assigned",
        )

    try:
        total = service.count_import_jobs(current_user.tenant_id, module, status_filter)
        items: list[Any] = []
        return StandardResponse(
            data=ImportJobListResponse(items=items, total=total, skip=skip, limit=limit)
        )
    except Exception as e:
        logger.error(f"Failed to list import jobs: {e}")
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="IMPORT_LIST_FAILED",
            message=str(e),
        )


@router.get(
    "/import/{job_id}",
    response_model=StandardResponse[ImportJobRead],
    summary="Get import job details",
    tags=["Import Jobs"],
)
async def get_import_job(
    current_user: Annotated[User, Depends(require_permission("import_export.read"))],
    service: Annotated[ImportExportService, Depends(get_import_export_service)],
    job_id: UUID = Path(...),
) -> StandardResponse[ImportJobRead]:
    """Get import job details."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_TENANT",
            message="User must have a tenant assigned",
        )

    job = service.get_import_job(job_id, current_user.tenant_id)
    if not job:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="IMPORT_JOB_NOT_FOUND",
            message="Import job not found",
        )

    return StandardResponse(data=job)


# Export Job Endpoints


@router.post(
    "/export",
    response_model=StandardResponse[ExportJobRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create export job",
    tags=["Export Jobs"],
)
async def create_export_job(
    current_user: Annotated[User, Depends(require_permission("import_export.write"))],
    service: Annotated[ImportExportService, Depends(get_import_export_service)],
    request: ExportJobCreate,
) -> StandardResponse[ExportJobRead]:
    """Create a new export job."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_TENANT",
            message="User must have a tenant assigned",
        )

    try:
        job_data = request.model_dump()
        job = service.create_export_job(
            job_data, current_user.tenant_id, current_user.id
        )
        return StandardResponse(data=job)
    except Exception as e:
        logger.error(f"Failed to create export job: {e}")
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EXPORT_CREATION_FAILED",
            message=str(e),
        )


@router.get(
    "/export",
    response_model=StandardResponse[ExportJobListResponse],
    summary="List export jobs",
    tags=["Export Jobs"],
)
async def list_export_jobs(
    current_user: Annotated[User, Depends(require_permission("import_export.read"))],
    service: Annotated[ImportExportService, Depends(get_import_export_service)],
    module: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> StandardResponse[ExportJobListResponse]:
    """List export jobs."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_TENANT",
            message="User must have a tenant assigned",
        )

    try:
        total = service.count_export_jobs(current_user.tenant_id, module, status_filter)
        items: list[Any] = []
        return StandardResponse(
            data=ExportJobListResponse(items=items, total=total, skip=skip, limit=limit)
        )
    except Exception as e:
        logger.error(f"Failed to list export jobs: {e}")
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EXPORT_LIST_FAILED",
            message=str(e),
        )


@router.get(
    "/export/{job_id}",
    response_model=StandardResponse[ExportJobRead],
    summary="Get export job details",
    tags=["Export Jobs"],
)
async def get_export_job(
    current_user: Annotated[User, Depends(require_permission("import_export.read"))],
    service: Annotated[ImportExportService, Depends(get_import_export_service)],
    job_id: UUID = Path(...),
) -> StandardResponse[ExportJobRead]:
    """Get export job details."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_TENANT",
            message="User must have a tenant assigned",
        )

    job = service.get_export_job(job_id, current_user.tenant_id)
    if not job:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="EXPORT_JOB_NOT_FOUND",
            message="Export job not found",
        )

    return StandardResponse(data=job)


# Import Template Endpoints


@router.post(
    "/import-templates",
    response_model=StandardResponse[ImportTemplateRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create import template",
    tags=["Import Templates"],
)
async def create_import_template(
    current_user: Annotated[User, Depends(require_permission("import_export.write"))],
    service: Annotated[ImportExportService, Depends(get_import_export_service)],
    request: ImportTemplateCreate,
) -> StandardResponse[ImportTemplateRead]:
    """Create a new import template."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_TENANT",
            message="User must have a tenant assigned",
        )

    try:
        template_data = request.model_dump()
        template = service.create_import_template(
            template_data, current_user.tenant_id, current_user.id
        )
        return StandardResponse(data=template)
    except Exception as e:
        logger.error(f"Failed to create import template: {e}")
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TEMPLATE_CREATION_FAILED",
            message=str(e),
        )


@router.get(
    "/import-templates",
    response_model=StandardResponse[ImportTemplateListResponse],
    summary="List import templates",
    tags=["Import Templates"],
)
async def list_import_templates(
    current_user: Annotated[User, Depends(require_permission("import_export.read"))],
    service: Annotated[ImportExportService, Depends(get_import_export_service)],
    module: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> StandardResponse[ImportTemplateListResponse]:
    """List import templates."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_TENANT",
            message="User must have a tenant assigned",
        )

    try:
        total = service.count_import_templates(current_user.tenant_id, module)
        items: list[Any] = []
        return StandardResponse(
            data=ImportTemplateListResponse(
                items=items, total=total, skip=skip, limit=limit
            )
        )
    except Exception as e:
        logger.error(f"Failed to list import templates: {e}")
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TEMPLATE_LIST_FAILED",
            message=str(e),
        )


@router.get(
    "/import-templates/{template_id}",
    response_model=StandardResponse[ImportTemplateRead],
    summary="Get import template details",
    tags=["Import Templates"],
)
async def get_import_template(
    current_user: Annotated[User, Depends(require_permission("import_export.read"))],
    service: Annotated[ImportExportService, Depends(get_import_export_service)],
    template_id: UUID = Path(...),
) -> StandardResponse[ImportTemplateRead]:
    """Get import template details."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_TENANT",
            message="User must have a tenant assigned",
        )

    template = service.get_import_template(template_id, current_user.tenant_id)
    if not template:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="TEMPLATE_NOT_FOUND",
            message="Import template not found",
        )

    return StandardResponse(data=template)


# ─── Direct Export Endpoints ───────────────────────────────────────────────────


@router.post(
    "/export/pdf",
    summary="Export data as PDF",
    tags=["Export Jobs"],
    response_class=Response,
)
async def export_pdf(
    current_user: Annotated[User, Depends(require_permission("import_export.write"))],
    request: PdfExportRequest,
) -> Response:
    """Export data directly as a PDF file.

    Accepts optional ``template_id`` to apply a layout template defined via
    the import templates system.  When provided, the template's ``field_mapping``
    is used to select and rename columns in the PDF output.
    """
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_TENANT",
            message="User must have a tenant assigned",
        )

    try:
        from app.core.import_export.exporters.pdf_exporter import PDFExporter

        exporter = PDFExporter()
        pdf_bytes = exporter.export(
            data=request.data,
            columns=request.columns,
            title=request.title,
            template_id=request.template_id,
        )

        filename = f"{request.filename}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        logger.error(f"PDF export failed: {e}")
        raise APIException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="PDF_EXPORT_FAILED",
            message=str(e),
        )
