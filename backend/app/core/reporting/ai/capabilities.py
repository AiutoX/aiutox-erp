"""AI capabilities for the reporting module (REP-006).

Mirrors billing/ai/capabilities.py's shape exactly. Executes existing saved
reports (report_id) through the same ReportingService.execute_report path
the manual /reports/{id}/execute endpoint uses — identical per-dataset and
per-column permission enforcement (REP-002), identical report.executed/
report.failed event publishing with the real requesting user (REP-005).
There is no ad-hoc/free-form query builder in this codebase (execute_report
always operates on a saved ReportDefinition), so both capabilities take an
existing report_id rather than raw dataset+filter parameters.
"""

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.automation.ai.capability_decorator import agent_capability
from app.core.exceptions import APIException
from app.core.reporting.events import ReportingEventPublisher
from app.core.reporting.registry import get_registry
from app.core.reporting.service import ReportingService
from app.core.users.models import User
from app.repositories.reporting_repository import ReportingRepository
from app.services.permission_service import PermissionService


def _build_reporting_service(db: Session) -> ReportingService:
    """Builds a ReportingService wired to the real DataSourceRegistry.

    No event publisher: capability invocations still get report.executed/
    report.failed recorded because ReportingService publishes those from
    execute_report()'s own logic keyed off `executed_by`, not off whether an
    event_publisher is present for create/update/delete — see execute_report's
    docstring. Constructing a real Redis-backed publisher here mirrors
    get_reporting_event_publisher() in api/v1/reporting.py.
    """
    from app.core.config_file import get_settings
    from app.core.pubsub.client import RedisStreamsClient
    from app.core.pubsub.publisher import EventPublisher

    settings = get_settings()
    client = RedisStreamsClient(
        redis_url=settings.REDIS_URL, password=settings.REDIS_PASSWORD
    )
    event_publisher = ReportingEventPublisher(EventPublisher(client))

    service = ReportingService(db, event_publisher=event_publisher)
    registry = get_registry()
    for source_name in registry.list_all():
        data_source_class = registry.get(source_name)
        if data_source_class is not None:
            service.engine.register_data_source(source_name, data_source_class)
    return service


async def _execute_and_format(
    db: Session, current_user: User, report_id: str
) -> dict[str, Any]:
    """Shared execution path: real permission set, real executed_by, real
    events. Never a bypass relative to REP-002's manual execution.

    Includes the report's visualization_type/config alongside the raw
    execution result so the frontend's structured variant can delegate
    straight to ReportResultRenderer (REP-004) without a second fetch.
    """
    user_permissions = PermissionService(db).get_effective_permissions(current_user.id)
    service = _build_reporting_service(db)
    report = service.get_report(UUID(report_id), current_user.tenant_id)
    if report is None:
        raise APIException(
            code="REPORTING_REPORT_NOT_FOUND",
            message=f"Report with ID {report_id} not found",
            status_code=404,
        )

    try:
        result = await service.execute_report(
            report_id=UUID(report_id),
            tenant_id=current_user.tenant_id,
            user_permissions=user_permissions,
            executed_by=current_user.id,
        )
    except ValueError as exc:
        raise APIException(
            code="REPORTING_REPORT_NOT_FOUND",
            message=str(exc),
            status_code=404,
        ) from exc

    return {
        "title": report.name,
        "variant": "structured",
        "result": result,
        "visualizationType": report.visualization_type,
        "config": report.config,
    }


@agent_capability(
    name="run_report_query",
    permission="reporting.view",
    description=(
        "Executes an existing saved report by ID and returns its full result "
        "(table, chart, or KPI), tenant- and permission-scoped identically to "
        "manually running the report. Use for: 'run report X', 'show me the "
        "<report name> report'."
    ),
    capability_type="conversational",
    parameters_schema={
        "type": "object",
        "properties": {
            "report_id": {
                "type": "string",
                "description": "UUID of an existing saved report definition",
            },
        },
        "required": ["report_id"],
    },
    aliases=[
        "ejecutar reporte",
        "correr reporte",
        "run report",
        "muestra el reporte",
        "show report",
    ],
    examples=[
        "ejecuta el reporte de ventas",
        "run the overdue invoices report",
        "muestra el reporte de ocupacion",
    ],
    result_format="structured",
)
async def run_report_query(
    db: Session, current_user: User, report_id: str
) -> dict[str, Any]:
    """Runs an existing saved report and returns its visualized result."""
    return await _execute_and_format(db, current_user, report_id)


@agent_capability(
    name="get_kpi",
    permission="reporting.view",
    description=(
        "Executes an existing saved report whose visualization is a KPI and "
        "returns the single metric value, tenant- and permission-scoped "
        "identically to manually running the report. Use for: 'what is my "
        "<metric>', 'show me the <kpi name> KPI'."
    ),
    capability_type="conversational",
    parameters_schema={
        "type": "object",
        "properties": {
            "report_id": {
                "type": "string",
                "description": "UUID of an existing saved report definition "
                "whose visualization_type is 'kpi'",
            },
        },
        "required": ["report_id"],
    },
    aliases=[
        "cual es mi kpi",
        "muestra el kpi",
        "show kpi",
        "get kpi",
        "cual es la metrica",
    ],
    examples=[
        "cual es el kpi de ocupacion",
        "show me the revenue kpi",
        "muestra la metrica de cartera vencida",
    ],
    result_format="structured",
)
async def get_kpi(db: Session, current_user: User, report_id: str) -> dict[str, Any]:
    """Runs an existing saved report, rejecting any whose visualization_type
    is not 'kpi' — a narrower, more specific tool than run_report_query."""
    repo = ReportingRepository(db)
    report = repo.get_report_by_id(UUID(report_id), current_user.tenant_id)
    if report is None:
        raise APIException(
            code="REPORTING_REPORT_NOT_FOUND",
            message=f"Report with ID {report_id} not found",
            status_code=404,
        )
    if report.visualization_type != "kpi":
        raise APIException(
            code="REPORTING_NOT_A_KPI",
            message=(
                f"Report '{report_id}' is a '{report.visualization_type}' "
                "report, not a KPI — use run_report_query instead"
            ),
            status_code=400,
        )

    return await _execute_and_format(db, current_user, report_id)
