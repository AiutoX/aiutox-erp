"""Marketplace catalog loader — reads from marketplace_catalog.yaml."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, ConfigDict, Field


class TierPricing(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    monthly_usd: float = 0
    annual_usd: float = 0
    description: str = ""


class ModuleCatalogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    module_id: str
    name: str
    description: str
    category: str
    icon: str = "Package"
    available_tiers: list[str] = Field(default_factory=list)
    pricing: dict[str, TierPricing] = Field(default_factory=dict)
    screenshots: list[str] = Field(default_factory=list)
    features_by_tier: dict[str, list[str]] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)


_CATALOG_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent
    / "config"
    / "marketplace_catalog.yaml"
)


class CatalogLoader:
    """Loads and queries the marketplace catalog from YAML."""

    @staticmethod
    @lru_cache(maxsize=1)
    def _raw() -> list[dict[str, Any]]:
        with open(_CATALOG_PATH, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("modules", [])

    @classmethod
    def load(cls) -> list[ModuleCatalogEntry]:
        """Return all catalog entries validated as ModuleCatalogEntry."""
        return [ModuleCatalogEntry.model_validate(m) for m in cls._raw()]

    @classmethod
    def get_by_id(cls, module_id: str) -> ModuleCatalogEntry | None:
        """Return a single entry by module_id, or None if not found."""
        for entry in cls.load():
            if entry.module_id == module_id:
                return entry
        return None

    @classmethod
    def filter_by_category(cls, category: str) -> list[ModuleCatalogEntry]:
        """Return entries matching the given category."""
        return [e for e in cls.load() if e.category == category]
