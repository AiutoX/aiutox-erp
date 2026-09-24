"""Widget preference service — CRUD operations for UserWidgetPreference."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import raise_conflict, raise_not_found
from app.core.widgets.models import UserWidgetPreference
from app.core.widgets.registry import WidgetRegistry

# Auto-layout column count for _build_defaults' deterministic grid — width-agnostic
# stacking, roughly matching the old hardcoded 3-column-equivalent layout.
_AUTO_LAYOUT_COLUMNS = 12


def _build_widget_registry() -> WidgetRegistry:
    from app.core.module_registry import get_module_registry

    try:
        reg = get_module_registry()
        modules = list(reg.get_all_modules().values())
    except RuntimeError:
        modules = []
    return WidgetRegistry(modules=modules)


class WidgetPreferenceService:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_preferences(
        self, tenant_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[UserWidgetPreference]:
        prefs = (
            self._db.query(UserWidgetPreference)
            .filter(
                UserWidgetPreference.tenant_id == tenant_id,
                UserWidgetPreference.user_id == user_id,
            )
            .all()
        )
        if not prefs:
            return self._build_defaults(tenant_id, user_id)
        return prefs

    def _build_defaults(
        self, tenant_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[UserWidgetPreference]:
        now = datetime.now(UTC)
        registry = _build_widget_registry()
        manifests = [
            m for m in registry.get_available_widgets(tenant_id) if m.default_enabled
        ]

        prefs = []
        cursor_x = 0
        cursor_y = 0
        row_height = 0
        for manifest in manifests:
            if cursor_x + manifest.width > _AUTO_LAYOUT_COLUMNS:
                cursor_x = 0
                cursor_y += row_height
                row_height = 0

            prefs.append(
                UserWidgetPreference(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    user_id=user_id,
                    widget_id=manifest.widget_id,
                    position_x=cursor_x,
                    position_y=cursor_y,
                    width=manifest.width,
                    height=manifest.height,
                    settings_json=None,
                    created_at=now,
                    updated_at=now,
                )
            )
            cursor_x += manifest.width
            row_height = max(row_height, manifest.height)

        return prefs

    def add_preference(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        widget_id: str,
        position_x: int = 0,
        position_y: int = 0,
        width: int = 4,
        height: int = 2,
        settings_json: dict[str, Any] | None = None,
    ) -> UserWidgetPreference:
        now = datetime.now(UTC)
        pref = UserWidgetPreference(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            widget_id=widget_id,
            position_x=position_x,
            position_y=position_y,
            width=width,
            height=height,
            settings_json=settings_json,
            created_at=now,
            updated_at=now,
        )
        self._db.add(pref)
        try:
            self._db.flush()
        except IntegrityError:
            self._db.rollback()
            raise_conflict("widget_preference", f"{user_id}/{widget_id}")
        return pref

    def batch_update(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        items: list[dict[str, Any]],
    ) -> list[UserWidgetPreference]:
        now = datetime.now(UTC)
        result: list[UserWidgetPreference] = []

        for item in items:
            widget_id = item["widget_id"]
            existing = (
                self._db.query(UserWidgetPreference)
                .filter(
                    UserWidgetPreference.tenant_id == tenant_id,
                    UserWidgetPreference.user_id == user_id,
                    UserWidgetPreference.widget_id == widget_id,
                )
                .first()
            )
            if existing:
                existing.position_x = item.get("position_x", existing.position_x)
                existing.position_y = item.get("position_y", existing.position_y)
                existing.width = item.get("width", existing.width)
                existing.height = item.get("height", existing.height)
                existing.settings_json = item.get(
                    "settings_json", existing.settings_json
                )
                existing.updated_at = now
                result.append(existing)
            else:
                pref = UserWidgetPreference(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    user_id=user_id,
                    widget_id=widget_id,
                    position_x=item.get("position_x", 0),
                    position_y=item.get("position_y", 0),
                    width=item.get("width", 4),
                    height=item.get("height", 2),
                    settings_json=item.get("settings_json"),
                    created_at=now,
                    updated_at=now,
                )
                self._db.add(pref)
                result.append(pref)

        self._db.flush()
        return result

    def remove_preference(
        self, tenant_id: uuid.UUID, user_id: uuid.UUID, widget_id: str
    ) -> None:
        pref = (
            self._db.query(UserWidgetPreference)
            .filter(
                UserWidgetPreference.tenant_id == tenant_id,
                UserWidgetPreference.user_id == user_id,
                UserWidgetPreference.widget_id == widget_id,
            )
            .first()
        )
        if pref is None:
            raise_not_found("widget_preference", widget_id)
        self._db.delete(pref)
        self._db.flush()
