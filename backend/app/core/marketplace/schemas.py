"""Marketplace Pydantic schemas — request/response for API layer."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class PlanType(StrEnum):
    trial = "trial"
    monthly = "monthly"
    annual = "annual"


class PurchaseRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    module_id: str
    tier: str
    plan: PlanType = PlanType.trial


class PurchaseResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    module_id: str
    tier: str
    plan: str
    license_jwt: str
    expires_at: datetime
    purchase_id: str
