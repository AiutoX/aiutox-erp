"""Catalog descriptor types and the catalogs.yaml declaration loader.

A module that wants to offer a shared option list (gender, organization type,
document type, and so on) declares it in a `catalogs.yaml` file next to its
`__init__.py`, then returns the loaded descriptors from a `get_catalogs()`
override on its `ModuleInterface` subclass. This module provides the typed
descriptor shapes (`CatalogDescriptor`, `CatalogItemDescriptor`) and the
loader (`load_catalog_declarations`) that turns a `catalogs.yaml` file into
those descriptors.

This loader validates only the YAML *shape* (required keys, types, no unknown
keys). Business-rule validation (namespace conventions, code format,
duplicate keys across modules, and so on) belongs to `CatalogSyncService`,
which is out of scope for this module.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml  # type: ignore[import-untyped]
from pydantic import BaseModel, ConfigDict, ValidationError


@dataclass(frozen=True)
class CatalogItemDescriptor:
    """A single option within a catalog (e.g. "male" within "gender")."""

    code: str
    labels: dict[str, str]
    sort_order: int = 0
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CatalogDescriptor:
    """A catalog (option list) declared by a module."""

    key: str
    labels: dict[str, str]
    items: tuple[CatalogItemDescriptor, ...]
    description: dict[str, str] | None = None
    tenant_can_manage: bool = False
    is_extensible: bool = False
    is_locked: bool = False
    manage_permission: str | None = None


class _CatalogItemYamlSchema(BaseModel):
    """Shape validation for a single item entry in catalogs.yaml."""

    model_config = ConfigDict(extra="forbid")

    code: str
    labels: dict[str, str]
    sort_order: int = 0
    attributes: dict[str, Any] = {}


class _CatalogYamlSchema(BaseModel):
    """Shape validation for a single catalog entry in catalogs.yaml."""

    model_config = ConfigDict(extra="forbid")

    key: str
    labels: dict[str, str]
    items: list[_CatalogItemYamlSchema]
    description: dict[str, str] | None = None
    tenant_can_manage: bool = False
    is_extensible: bool = False
    is_locked: bool = False
    manage_permission: str | None = None


class _CatalogsYamlSchema(BaseModel):
    """Shape validation for the top-level catalogs.yaml document."""

    model_config = ConfigDict(extra="forbid")

    catalogs: list[_CatalogYamlSchema]


def load_catalog_declarations(path: Path) -> list[CatalogDescriptor]:
    """Load and validate a catalogs.yaml file into typed descriptors.

    Args:
        path: Path to the catalogs.yaml file.

    Returns:
        List of validated CatalogDescriptor objects, in file order.

    Raises:
        ValueError: If the parsed YAML does not match the expected shape
            (missing required key, wrong type, unknown key). This loader
            validates shape only, never business rules.
    """
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))

    try:
        parsed = _CatalogsYamlSchema.model_validate(raw)
    except ValidationError as exc:
        raise ValueError(f"Malformed catalogs.yaml shape at {path}: {exc}") from exc

    return [
        CatalogDescriptor(
            key=catalog.key,
            labels=catalog.labels,
            items=tuple(
                CatalogItemDescriptor(
                    code=item.code,
                    labels=item.labels,
                    sort_order=item.sort_order,
                    attributes=item.attributes,
                )
                for item in catalog.items
            ),
            description=catalog.description,
            tenant_can_manage=catalog.tenant_can_manage,
            is_extensible=catalog.is_extensible,
            is_locked=catalog.is_locked,
            manage_permission=catalog.manage_permission,
        )
        for catalog in parsed.catalogs
    ]
