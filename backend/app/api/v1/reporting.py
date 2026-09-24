"""Reporting router for report management."""

from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_user_permissions, require_permission
from app.core.auth.permissions import has_permission
from app.core.config_file import get_settings
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.pubsub.client import RedisStreamsClient
from app.core.pubsub.publisher import EventPublisher
from app.core.reporting.events import ReportingEventPublisher
from app.core.reporting.registry import get_registry
from app.core.reporting.service import ReportingService
from app.core.users.models import User
from app.schemas.common import StandardListResponse, StandardResponse
from app.schemas.reporting import (
    FieldPermissionCreate,
    FieldPermissionResponse,
    ReportDefinitionCreate,
    ReportDefinitionResponse,
    ReportDefinitionUpdate,
    ReportExecutionHistoryResponse,
    ReportExecutionRequest,
    ReportExecutionResponse,
)

router = APIRouter()


def get_reporting_event_publisher() -> ReportingEventPublisher:
    """Dependency to get ReportingEventPublisher (same wiring other routers
    use — see automation/router.py's get_event_publisher).

    Constructing the service WITHOUT this publisher silently disables
    report.created/updated/deleted/executed/failed publishing (REP-005).
    """
    settings = get_settings()
    client = RedisStreamsClient(
        redis_url=settings.REDIS_URL, password=settings.REDIS_PASSWORD
    )
    return ReportingEventPublisher(EventPublisher(client))


def get_reporting_service(
    db: Annotated[Session, Depends(get_db)],
    event_publisher: Annotated[
        ReportingEventPublisher, Depends(get_reporting_event_publisher)
    ],
) -> ReportingService:
    """Dependency to get ReportingService.

    Sources every data source from the real DataSourceRegistry — each
    built-in source's own ImportError guard (see registry.py) is the single
    source of truth for whether it's genuinely usable, not a duplicated
    check here.
    """
    service = ReportingService(db, event_publisher=event_publisher)
    registry = get_registry()
    for source_name in registry.list_all():
        data_source_class = registry.get(source_name)
        if data_source_class is not None:
            service.engine.register_data_source(source_name, data_source_class)
    return service


@router.post(
    "/reports",
    response_model=StandardResponse[ReportDefinitionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create report",
    description="Create a new report definition. Requires reporting.manage permission.",
)
async def create_report(
    report_data: ReportDefinitionCreate,
    current_user: Annotated[User, Depends(require_permission("reporting.manage"))],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
) -> StandardResponse[ReportDefinitionResponse]:
    """Create a new report definition."""
    report = service.create_report(
        tenant_id=current_user.tenant_id,
        name=report_data.name,
        description=report_data.description,
        data_source_type=report_data.data_source_type,
        visualization_type=report_data.visualization_type,
        created_by=current_user.id,
        filters=report_data.filters,
        config=report_data.config,
    )

    return StandardResponse(
        data=ReportDefinitionResponse.model_validate(report),
    )


@router.get(
    "/reports",
    response_model=StandardListResponse[ReportDefinitionResponse],
    status_code=status.HTTP_200_OK,
    summary="List reports",
    description="List all reports for the current tenant. Requires reporting.view permission.",
)
async def list_reports(
    current_user: Annotated[User, Depends(require_permission("reporting.view"))],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Page size"),
) -> StandardListResponse[ReportDefinitionResponse]:
    """List all reports."""
    skip = (page - 1) * page_size
    reports, total = service.get_all_reports(
        tenant_id=current_user.tenant_id, skip=skip, limit=page_size
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return StandardListResponse(
        data=[ReportDefinitionResponse.model_validate(report) for report in reports],
        meta={
            "total": total,
            "page": page,
            "page_size": (
                max(page_size, 1) if total == 0 else page_size
            ),  # Minimum page_size is 1
            "total_pages": total_pages,
        },
        error=None,
    )


@router.get(
    "/reports/executions",
    response_model=StandardListResponse[ReportExecutionHistoryResponse],
    status_code=status.HTTP_200_OK,
    summary="List report execution history",
    description=(
        "List report execution history (Auditoria tab), filterable by report "
        "and date range. Requires auth.view_audit permission."
    ),
)
async def list_report_executions(
    current_user: Annotated[User, Depends(require_permission("auth.view_audit"))],
    db: Annotated[Session, Depends(get_db)],
    report_id: UUID | None = Query(None, description="Filter by report ID"),
    date_from: datetime | None = Query(
        None, description="Filter by start date (ISO format)"
    ),
    date_to: datetime | None = Query(
        None, description="Filter by end date (ISO format)"
    ),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Page size"),
) -> StandardListResponse[ReportExecutionHistoryResponse]:
    """List report execution history for the current tenant."""
    from app.repositories.reporting_repository import ReportingRepository

    repo = ReportingRepository(db)
    skip = (page - 1) * page_size
    executions, total = repo.list_executions(
        tenant_id=current_user.tenant_id,
        report_id=report_id,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=page_size,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return StandardListResponse(
        data=[
            ReportExecutionHistoryResponse.model_validate(execution)
            for execution in executions
        ],
        meta={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
        error=None,
    )


@router.get(
    "/reports/{report_id}",
    response_model=StandardResponse[ReportDefinitionResponse],
    status_code=status.HTTP_200_OK,
    summary="Get report",
    description="Get a specific report by ID. Requires reporting.view permission.",
)
async def get_report(
    report_id: UUID,
    current_user: Annotated[User, Depends(require_permission("reporting.view"))],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
) -> StandardResponse[ReportDefinitionResponse]:
    """Get a specific report."""
    report = service.get_report(report_id, current_user.tenant_id)
    if not report:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="REPORTING_REPORT_NOT_FOUND",
            message=f"Report with ID {report_id} not found",
        )

    return StandardResponse(
        data=ReportDefinitionResponse.model_validate(report),
    )


@router.put(
    "/reports/{report_id}",
    response_model=StandardResponse[ReportDefinitionResponse],
    status_code=status.HTTP_200_OK,
    summary="Update report",
    description="Update a report definition. Requires reporting.manage permission.",
)
async def update_report(
    report_id: UUID,
    report_data: ReportDefinitionUpdate,
    current_user: Annotated[User, Depends(require_permission("reporting.manage"))],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
) -> StandardResponse[ReportDefinitionResponse]:
    """Update a report definition."""
    report = service.update_report(
        report_id=report_id,
        tenant_id=current_user.tenant_id,
        name=report_data.name,
        description=report_data.description,
        filters=report_data.filters,
        config=report_data.config,
        updated_by=current_user.id,
    )

    if not report:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="REPORTING_REPORT_NOT_FOUND",
            message=f"Report with ID {report_id} not found",
        )

    return StandardResponse(
        data=ReportDefinitionResponse.model_validate(report),
    )


@router.delete(
    "/reports/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete report",
    description="Delete a report definition. Requires reporting.manage permission.",
)
async def delete_report(
    report_id: UUID,
    current_user: Annotated[User, Depends(require_permission("reporting.manage"))],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
) -> None:
    """Delete a report definition."""
    deleted = service.delete_report(
        report_id, current_user.tenant_id, deleted_by=current_user.id
    )
    if not deleted:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="REPORTING_REPORT_NOT_FOUND",
            message=f"Report with ID {report_id} not found",
        )


@router.post(
    "/reports/{report_id}/execute",
    response_model=StandardResponse[ReportExecutionResponse],
    status_code=status.HTTP_200_OK,
    summary="Execute report",
    description="Execute a report and get results. Requires reporting.view permission.",
)
async def execute_report(
    report_id: UUID,
    execution_data: ReportExecutionRequest,
    current_user: Annotated[User, Depends(require_permission("reporting.view"))],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
) -> StandardResponse[ReportExecutionResponse]:
    """Execute a report."""
    try:
        result = await service.execute_report(
            report_id=report_id,
            tenant_id=current_user.tenant_id,
            filters=execution_data.filters,
            pagination=execution_data.pagination,
            user_permissions=user_permissions,
            executed_by=current_user.id,
        )
        return StandardResponse(
            data=ReportExecutionResponse(**result),
        )
    except ValueError as e:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="REPORTING_REPORT_NOT_FOUND",
            message=str(e),
        )


@router.get(
    "/data-sources",
    response_model=StandardResponse[list[dict[str, Any]]],
    status_code=status.HTTP_200_OK,
    summary="List data sources",
    description="List available data sources. Requires reporting.view permission.",
)
async def list_data_sources(
    current_user: Annotated[User, Depends(require_permission("reporting.view"))],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
) -> StandardResponse[list[dict[str, Any]]]:
    """List available data sources.

    A dataset whose required_permission the user lacks is never listed —
    not just blocked at execution (UX-003).
    """
    data_sources = [
        {"type": source_type, "name": source_type.capitalize()}
        for source_type, data_source_class in service.engine._data_sources.items()
        if _user_can_access_dataset(data_source_class, user_permissions)
    ]

    return StandardResponse(
        data=data_sources,
    )


def _user_can_access_dataset(
    data_source_class: Any, user_permissions: set[str]
) -> bool:
    """True if the user holds the dataset's declared required_permission
    (or the dataset declares none)."""
    required_permission = getattr(data_source_class, "required_permission", None)
    if required_permission is None:
        return True
    return has_permission(user_permissions, required_permission)


@router.get(
    "/data-sources/{source_type}/columns",
    response_model=StandardResponse[list[dict[str, Any]]],
    status_code=status.HTTP_200_OK,
    summary="Get data source columns",
    description="Get available columns for a data source. Requires reporting.view permission.",
)
async def get_data_source_columns(
    source_type: str,
    current_user: Annotated[User, Depends(require_permission("reporting.view"))],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
    db: Annotated[Session, Depends(get_db)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
) -> StandardResponse[list[dict[str, Any]]]:
    """Get columns for a data source."""
    data_source_class = service.engine._data_sources.get(source_type)
    if not data_source_class:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="REPORTING_DATA_SOURCE_NOT_FOUND",
            message=f"Data source type '{source_type}' not found",
        )

    if not _user_can_access_dataset(data_source_class, user_permissions):
        raise APIException(
            status_code=status.HTTP_403_FORBIDDEN,
            code="REPORTING_DATASET_FORBIDDEN",
            message=(
                f"You do not have the required permission to access the "
                f"'{source_type}' dataset"
            ),
        )

    # Create temporary instance to get columns
    data_source = data_source_class(db, current_user.tenant_id, user_permissions)
    columns = data_source.get_columns()

    return StandardResponse(
        data=columns,
    )


@router.get(
    "/data-sources/{source_type}/filters",
    response_model=StandardResponse[list[dict[str, Any]]],
    status_code=status.HTTP_200_OK,
    summary="Get data source filters",
    description="Get available filters for a data source. Requires reporting.view permission.",
)
async def get_data_source_filters(
    source_type: str,
    current_user: Annotated[User, Depends(require_permission("reporting.view"))],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
    db: Annotated[Session, Depends(get_db)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
) -> StandardResponse[list[dict[str, Any]]]:
    """Get filters for a data source."""
    data_source_class = service.engine._data_sources.get(source_type)
    if not data_source_class:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="REPORTING_DATA_SOURCE_NOT_FOUND",
            message=f"Data source type '{source_type}' not found",
        )

    if not _user_can_access_dataset(data_source_class, user_permissions):
        raise APIException(
            status_code=status.HTTP_403_FORBIDDEN,
            code="REPORTING_DATASET_FORBIDDEN",
            message=(
                f"You do not have the required permission to access the "
                f"'{source_type}' dataset"
            ),
        )

    # Create temporary instance to get filters
    data_source = data_source_class(db, current_user.tenant_id, user_permissions)
    filters = data_source.get_filters()

    return StandardResponse(
        data=filters,
    )


# ─── Field Permissions (FR-7 — per-column visibility rules) ────────────────


@router.get(
    "/field-permissions",
    response_model=StandardResponse[list[FieldPermissionResponse]],
    status_code=status.HTTP_200_OK,
    summary="List field permission rules",
    description=(
        "List column visibility rules for the tenant, optionally scoped to "
        "one dataset. Requires reporting.manage permission."
    ),
)
async def list_field_permissions(
    current_user: Annotated[User, Depends(require_permission("reporting.manage"))],
    db: Annotated[Session, Depends(get_db)],
    dataset_type: str | None = Query(default=None),
) -> StandardResponse[list[FieldPermissionResponse]]:
    """List column visibility rules."""
    from app.repositories.reporting_repository import ReportingRepository

    repo = ReportingRepository(db)
    rules = repo.list_field_permissions(current_user.tenant_id, dataset_type)

    return StandardResponse(
        data=[FieldPermissionResponse.model_validate(r) for r in rules],
    )


@router.post(
    "/field-permissions",
    response_model=StandardResponse[FieldPermissionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create field permission rule",
    description=(
        "Restrict a dataset column to users holding a specific permission. "
        "Requires reporting.manage permission. The required_permission must "
        "be a real, checked permission from the system's permission catalog."
    ),
)
async def create_field_permission(
    rule_data: FieldPermissionCreate,
    current_user: Annotated[User, Depends(require_permission("reporting.manage"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[FieldPermissionResponse]:
    """Create a column visibility rule."""
    from app.core.reporting.column_rule_service import ReportingColumnRuleService
    from app.repositories.reporting_repository import ReportingRepository

    _validate_permission_exists(db, rule_data.required_permission)

    repo = ReportingRepository(db)
    try:
        rule = repo.create_field_permission(
            tenant_id=current_user.tenant_id,
            dataset_type=rule_data.dataset_type,
            column_name=rule_data.column_name,
            required_permission=rule_data.required_permission,
            created_by=current_user.id,
        )
    except IntegrityError:
        raise APIException(
            status_code=status.HTTP_409_CONFLICT,
            code="REPORTING_FIELD_PERMISSION_EXISTS",
            message=(
                f"A rule for column '{rule_data.column_name}' on dataset "
                f"'{rule_data.dataset_type}' already exists"
            ),
        )

    ReportingColumnRuleService(repo).invalidate(
        current_user.tenant_id, rule_data.dataset_type
    )

    return StandardResponse(
        data=FieldPermissionResponse.model_validate(rule),
    )


@router.delete(
    "/field-permissions/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete field permission rule",
    description="Remove a column visibility rule. Requires reporting.manage permission.",
)
async def delete_field_permission(
    rule_id: UUID,
    current_user: Annotated[User, Depends(require_permission("reporting.manage"))],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete a column visibility rule."""
    from app.core.reporting.column_rule_service import ReportingColumnRuleService
    from app.repositories.reporting_repository import ReportingRepository

    repo = ReportingRepository(db)
    rules = repo.list_field_permissions(current_user.tenant_id)
    rule = next((r for r in rules if r.id == rule_id), None)

    deleted = repo.delete_field_permission(rule_id, current_user.tenant_id)
    if not deleted:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="REPORTING_FIELD_PERMISSION_NOT_FOUND",
            message=f"Field permission with ID {rule_id} not found",
        )

    if rule is not None:
        ReportingColumnRuleService(repo).invalidate(
            current_user.tenant_id, rule.dataset_type
        )


def _validate_permission_exists(db: Session, permission: str) -> None:
    """Reject any required_permission string that isn't a real, checked
    permission in the system's catalog (acceptance criteria — never allow
    free text)."""
    from app.services.permission_service import PermissionService

    catalog = PermissionService(db).get_all_permissions_grouped()
    all_permissions = {perm for group in catalog for perm in group["permissions"]}

    if permission not in all_permissions:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="REPORTING_INVALID_PERMISSION",
            message=(f"'{permission}' is not a real permission in the system catalog"),
        )
