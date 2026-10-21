"""aiutox_sdk.insights — public insights surface for cross-module access."""

from app.core.insights.schemas import (
    BillingMonthlyRevenueRow,
    CrmPipelineRow,
    MaintenanceBacklogRow,
)
from app.core.insights.service import InsightsService

__all__ = [
    "InsightsService",
    "BillingMonthlyRevenueRow",
    "MaintenanceBacklogRow",
    "CrmPipelineRow",
]
