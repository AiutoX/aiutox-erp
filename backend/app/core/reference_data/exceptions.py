"""Error codes and raise helpers for the reference data read API (ISSUE-026).

Kept in this package (parallel to ``app.core.catalogs.exceptions``) so that
``reference_data`` never imports from ``catalogs``.
"""

from typing import NoReturn

from app.core.exceptions import APIException

REFERENCE_COUNTRY_NOT_FOUND = "REFERENCE_COUNTRY_NOT_FOUND"
REFERENCE_DIVISION_NOT_FOUND = "REFERENCE_DIVISION_NOT_FOUND"


def raise_country_not_found(country: str) -> NoReturn:
    """Raise 404 ``REFERENCE_COUNTRY_NOT_FOUND`` for an unknown country code."""
    raise APIException(
        REFERENCE_COUNTRY_NOT_FOUND,
        f"Country '{country}' does not exist in the reference data.",
        status_code=404,
    )


def raise_division_not_found(country: str, code: str) -> NoReturn:
    """Raise 404 ``REFERENCE_DIVISION_NOT_FOUND`` for an unknown division."""
    raise APIException(
        REFERENCE_DIVISION_NOT_FOUND,
        f"Division '{code}' of country '{country}' does not exist "
        "in the reference data.",
        status_code=404,
    )
