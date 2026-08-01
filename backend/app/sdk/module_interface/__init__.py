"""aiutox_sdk.module_interface — re-exports of ModuleInterface ABC.

Every business module MUST declare a class that extends ModuleInterface.
"""

from app.core.module_interface import (
    ModuleInterface,
    ModuleNavigationItem,
    ModuleNavigationSettingRequirement,
    RolePermissionSeed,
    WidgetManifest,
)

__all__ = [
    "ModuleInterface",
    "ModuleNavigationItem",
    "ModuleNavigationSettingRequirement",
    "RolePermissionSeed",
    "WidgetManifest",
]
