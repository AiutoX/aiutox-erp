"""aiutox_sdk.widgets — public widget surface for cross-module access."""

from app.core.module_interface import WidgetManifest
from app.core.widgets.models import UserWidgetPreference
from app.core.widgets.registry import WidgetRegistry
from app.core.widgets.schemas import (
    WidgetManifestOut,
    WidgetPreferenceBatchItem,
    WidgetPreferenceCreate,
    WidgetPreferenceOut,
)
from app.core.widgets.service import WidgetPreferenceService

__all__ = [
    "WidgetManifest",
    "WidgetRegistry",
    "UserWidgetPreference",
    "WidgetPreferenceService",
    "WidgetManifestOut",
    "WidgetPreferenceOut",
    "WidgetPreferenceCreate",
    "WidgetPreferenceBatchItem",
]
