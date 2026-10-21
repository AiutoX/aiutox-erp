"""aiutox_sdk.module_interface — re-exports of ModuleInterface ABC.

Every business module MUST declare a class that extends ModuleInterface.
"""

from app.core.catalogs.descriptors import (
    CatalogDescriptor,
    CatalogItemDescriptor,
    load_catalog_declarations,
)
from app.core.module_interface import (
    ModuleInterface,
    ModuleNavigationItem,
    ModuleNavigationSettingRequirement,
    RolePermissionSeed,
    WidgetManifest,
)

__all__ = [
    "CatalogDescriptor",
    "CatalogItemDescriptor",
    "ModuleInterface",
    "ModuleNavigationItem",
    "ModuleNavigationSettingRequirement",
    "RolePermissionSeed",
    "WidgetManifest",
    "load_catalog_declarations",
]
