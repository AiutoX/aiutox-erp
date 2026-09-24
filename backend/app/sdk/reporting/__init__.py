"""aiutox_sdk.reporting — re-exports of reporting registry + data source surface."""

from app.core.reporting.data_source import BaseDataSource
from app.core.reporting.datasources.billing import BillingDataSource
from app.core.reporting.datasources.finances import FinancesDataSource
from app.core.reporting.engine import ReportingEngine
from app.core.reporting.models import ReportDefinition
from app.core.reporting.registry import DataSourceRegistry, get_registry
from app.core.reporting.service import ReportingService

__all__ = [
    "get_registry",
    "DataSourceRegistry",
    "BaseDataSource",
    # Concrete core data sources a module may reuse rather than reimplementing
    # its own aggregation queries. Added for DASH-002/003, where real_estate's
    # and finances' dashboard widgets compute from billing/finances data they
    # do not own. Import these from the SDK, not app.core.reporting.datasources.
    "BillingDataSource",
    "FinancesDataSource",
    "ReportingEngine",
    "ReportingService",
    "ReportDefinition",
]
