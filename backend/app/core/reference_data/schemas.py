"""Pydantic schemas for the reference data subsystem.

``CoDivisionAttributes`` validates the country-specific ``attributes`` JSONB
column of ``ref_admin_divisions`` for Colombia (MODULE-SPEC Section 9,
"Attributes schema (CO)").
"""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

DivisionType = Literal[
    "department",
    "capital_district",
    "municipality",
    "island",
    "non_municipalized_area",
]


class CoDivisionAttributes(BaseModel):
    """Colombia-specific attributes stored in ``ref_admin_divisions.attributes``."""

    model_config = ConfigDict(extra="forbid")

    division_type: DivisionType
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


# ---------------------------------------------------------------------------
# Read API response schemas (ISSUE-026, contract C23)
#
# Rows are read from global tables; the shapes below mirror MODULE-SPEC
# Section 9 ("API Design"). ``names`` is the CLDR ``{"es": ..., "en": ...}``
# pair. ``source_version`` is read from ``ref_sync_state`` (it is ``null``
# only when the dataset has never been synced).
# ---------------------------------------------------------------------------


class RefCountryOut(BaseModel):
    """One ISO 3166-1 country."""

    code: str = Field(description="ISO 3166-1 alpha-2 code, uppercase")
    names: dict[str, str] = Field(description="Localized names: {es, en}")
    currency_code: str | None = Field(
        default=None, description="ISO 4217 code of the country's currency"
    )
    has_divisions: bool = Field(
        description="True when ref_admin_divisions holds rows for this country"
    )
    is_active: bool


class RefCurrencyOut(BaseModel):
    """One ISO 4217 currency."""

    code: str = Field(description="ISO 4217 code, uppercase")
    names: dict[str, str] = Field(description="Localized names: {es, en}")
    symbol: str
    minor_units: int
    is_active: bool


class RefLanguageOut(BaseModel):
    """One ISO 639-1 language."""

    code: str = Field(description="ISO 639-1 code, lowercase")
    names: dict[str, str] = Field(description="Localized names: {es, en}")
    native_name: str | None = None
    is_active: bool


class RefCountriesOut(BaseModel):
    """Payload of ``GET /reference/countries`` (not paginated)."""

    source_version: str | None
    items: list[RefCountryOut]


class RefCurrenciesOut(BaseModel):
    """Payload of ``GET /reference/currencies`` (not paginated)."""

    source_version: str | None
    items: list[RefCurrencyOut]


class RefLanguagesOut(BaseModel):
    """Payload of ``GET /reference/languages`` (not paginated)."""

    source_version: str | None
    items: list[RefLanguageOut]


class RefAdminDivisionOut(BaseModel):
    """One administrative division (department / municipality)."""

    country_code: str
    code: str = Field(description="Division code as text; leading zeros are kept")
    parent_code: str | None = None
    level: int = Field(description="1 = department, 2 = municipality")
    name: str
    attributes: dict[str, Any] = Field(
        default_factory=dict,
        description="Country-specific attributes (CO: see CoDivisionAttributes)",
    )
    is_active: bool


class RefDivisionParentOut(BaseModel):
    """The parent reference embedded in a division detail."""

    code: str
    name: str


class RefAdminDivisionDetailOut(RefAdminDivisionOut):
    """Payload of ``GET /reference/divisions/{country}/{code}``."""

    parent: RefDivisionParentOut | None = Field(
        default=None, description="Null for level-1 divisions"
    )
    source_version: str | None = Field(
        default=None,
        description="Dataset edition from ref_sync_state (e.g. DIVIPOLA junio 2026)",
    )
