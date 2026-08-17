"""aiutox_sdk.exceptions — re-exports of app.core.exceptions public surface.

All business modules MUST raise APIException (never HTTPException directly).
Use the raise_* helpers for common error scenarios.
"""

from app.core.exceptions import (
    APIException,
    BusinessRuleError,
    raise_bad_request,
    raise_conflict,
    raise_forbidden,
    raise_internal_server_error,
    raise_not_found,
    raise_too_many_requests,
    raise_unauthorized,
)

__all__ = [
    "APIException",
    "BusinessRuleError",
    "raise_not_found",
    "raise_bad_request",
    "raise_unauthorized",
    "raise_forbidden",
    "raise_conflict",
    "raise_too_many_requests",
    "raise_internal_server_error",
]
