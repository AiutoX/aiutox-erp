"""Reporting router for reports endpoints."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth.dependencies import require_permission
from app.core.db.deps import get_db
from app.core.reporting.engine import ReportingEngine
from app.core.reporting.schemas import (
    AvailableDataSourcesResponse,
    DataSourceInfo,
    ReportRequest,
    ReportResult,
    ReportResultResponse,
)
from app.core.users.models import User
from app.schemas.common import StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)

engine = ReportingEngine()


@router.get(
    "/datasources",
    response_model=StandardResponse[AvailableDataSourcesResponse],
    summary="List available data sources",
    tags=["Reports"],
)
async def list_datasources(
    current_user: Annotated[User, Depends(require_permission("reporting.read"))],
) -> StandardResponse[AvailableDataSourcesResponse]:
    """List all available data sources for reports."""
    try:
        datasources = [
            DataSourceInfo(name=name, label=name.replace("_", " ").title())
            for name in engine._data_sources
        ]
        return StandardResponse(
            data=AvailableDataSourcesResponse(
                data_sources=datasources,
                total=len(datasources),
            )
        )
    except Exception as e:
        logger.error(f"Failed to list datasources: {e}")
        raise


@router.post(
    "/run",
    response_model=StandardResponse[ReportResultResponse],
    summary="Run a report",
    tags=["Reports"],
)
async def run_report(
    current_user: Annotated[User, Depends(require_permission("reporting.run"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: ReportRequest,
) -> StandardResponse[ReportResultResponse]:
    """Run a report using a specified data source."""
    if not current_user.tenant_id:
        raise Exception("User must have a tenant assigned")

    try:
        logger.info(
            f"Running report: data_source={request.data_source}, "
            f"user={current_user.id}, tenant={current_user.tenant_id}"
        )

        raw = await engine.run_report(
            filters=request.filters,
            pagination={"skip": request.skip, "limit": request.limit},
        )

        return StandardResponse(
            data=ReportResultResponse(
                data_source=request.data_source,
                result=ReportResult(
                    data=raw.get("data", []),
                    total=raw.get("total", 0),
                    columns=raw.get("columns", []),
                ),
            )
        )
    except ValueError as e:
        logger.error(f"Report validation error: {e}")
        return StandardResponse(
            data=ReportResultResponse(
                data_source=request.data_source,
                result=ReportResult(),
            )
        )
    except Exception as e:
        logger.error(f"Report execution failed: {e}", exc_info=True)
        return StandardResponse(
            data=ReportResultResponse(
                data_source=request.data_source,
                result=ReportResult(),
            )
        )
