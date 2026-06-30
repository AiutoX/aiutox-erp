"""Re-export shim for StandardResponse.

Provides backward-compatible import path for routers that use:
    from app.core.responses import StandardResponse

The canonical source is app.schemas.common.
"""

from app.schemas.common import (  # noqa: F401
    ErrorResponse,
    PaginationMeta,
    StandardListResponse,
    StandardResponse,
)

__all__ = [
    "StandardResponse",
    "StandardListResponse",
    "PaginationMeta",
    "ErrorResponse",
]
