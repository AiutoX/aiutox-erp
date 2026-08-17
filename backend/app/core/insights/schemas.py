"""Insights API Pydantic v2 schemas."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class BillingMonthlyRevenueRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tenant_id: uuid.UUID
    month: date
    revenue: Decimal
    invoice_count: int


class MaintenanceBacklogRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tenant_id: uuid.UUID
    tech_user_id: uuid.UUID | None
    backlog_count: int
    oldest_days: int


class CrmPipelineRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tenant_id: uuid.UUID
    stage: str
    deal_count: int
    total_value: Decimal
