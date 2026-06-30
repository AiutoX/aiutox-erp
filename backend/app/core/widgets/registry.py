"""WidgetRegistry — aggregates WidgetManifests from all enabled modules."""

from __future__ import annotations

import logging
import uuid

from app.core.module_interface import ModuleInterface, WidgetManifest

logger = logging.getLogger(__name__)

_TIER_ORDER = {"basic": 0, "pro": 1, "enterprise": 2}


def _tenant_tier_allows(
    tenant_tiers: dict[str, dict[str, str]],
    tenant_id: uuid.UUID,
    module_id: str,
    required_tier: str,
) -> bool:
    """Return True if the tenant's tier for the module meets or exceeds required_tier."""
    module_prefix = module_id.split(".")[0]
    tenant_map = tenant_tiers.get(str(tenant_id), {})
    active = tenant_map.get(module_prefix, "basic")
    return _TIER_ORDER.get(active, 0) >= _TIER_ORDER.get(required_tier, 0)


class WidgetRegistry:
    """Aggregates widget manifests from registered modules, applying tier + enable filters."""

    def __init__(
        self,
        modules: list[ModuleInterface] | None = None,
        tenant_tiers: dict[str, dict[str, str]] | None = None,
    ) -> None:
        self._modules = modules or []
        self._tenant_tiers: dict[str, dict[str, str]] = tenant_tiers or {}

    def get_available_widgets(self, tenant_id: uuid.UUID) -> list[WidgetManifest]:
        """Return widgets from enabled modules that the tenant's tier allows.

        Modules whose get_widgets() raises are skipped with a warning.
        """
        result: list[WidgetManifest] = []

        for module in self._modules:
            if not module.enabled:
                continue

            try:
                manifests = module.get_widgets()
            except Exception as exc:
                logger.warning(
                    "WidgetRegistry: module %s get_widgets() failed — skipping. Error: %s",
                    module.module_id,
                    exc,
                )
                continue

            for manifest in manifests:
                if _tenant_tier_allows(
                    self._tenant_tiers,
                    tenant_id,
                    manifest.widget_id,
                    manifest.required_tier,
                ):
                    result.append(manifest)

        return result
