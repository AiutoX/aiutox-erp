"""Re-export. The canonical definitions live in aiutox_sdk.module_interface (DEC-20261020-014)."""

from aiutox_sdk.module_interface import (
    ModuleInterface,
    ModuleNavigationItem,
    ModuleNavigationSettingRequirement,
    NotificationEventDescriptor,
    RolePermissionSeed,
    WidgetManifest,
)

__all__ = [
    "ModuleInterface",
    "ModuleNavigationItem",
    "ModuleNavigationSettingRequirement",
    "NotificationEventDescriptor",
    "RolePermissionSeed",
    "WidgetManifest",
]
