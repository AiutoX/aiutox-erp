"""License JWT exception types — P10-T02."""


class LicenseError(Exception):
    """Base class for all license errors."""


class LicenseInvalidError(LicenseError):
    """JWT signature is invalid or token is malformed."""


class LicenseExpiredError(LicenseError):
    """JWT has passed its exp claim."""


class LicenseRevokedError(LicenseError):
    """License has been administratively revoked (revoked_at is set)."""
