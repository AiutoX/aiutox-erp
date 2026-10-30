"""Re-export. The canonical definitions live in aiutox_sdk._licensing_errors (DEC-20261020-014)."""

from aiutox_sdk._licensing_errors import (
    LicenseError,
    LicenseExpiredError,
    LicenseInvalidError,
    LicenseRevokedError,
)

__all__ = [
    "LicenseError",
    "LicenseExpiredError",
    "LicenseInvalidError",
    "LicenseRevokedError",
]
