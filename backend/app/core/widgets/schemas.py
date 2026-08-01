"""Widget preference Pydantic v2 schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class WidgetPreferenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    widget_id: str
    position_x: int
    position_y: int
    width: int
    height: int
    settings_json: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class WidgetPreferenceCreate(BaseModel):
    position_x: int = 0
    position_y: int = 0
    width: int = 4
    height: int = 2
    settings_json: dict[str, Any] | None = None


class WidgetPreferenceBatchItem(BaseModel):
    widget_id: str
    position_x: int = 0
    position_y: int = 0
    width: int = 4
    height: int = 2
    settings_json: dict[str, Any] | None = None


class WidgetManifestOut(BaseModel):
    widget_id: str
    label: str
    description: str
    frontend_component: str = ""
    required_tier: str = "basic"
    width: int = 4
    height: int = 2
    config_schema: dict[str, Any] | None = None
