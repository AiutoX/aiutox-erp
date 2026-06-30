"""Files module schemas — re-export shim from app.schemas.file.

Canonical DTOs live in app/schemas/file.py.
This module provides the expected core/<module>/schemas.py import path.
"""

from app.schemas.file import (  # noqa: F401
    FileBase,
    FileCreate,
    FilePermissionRequest,
    FilePermissionResponse,
    FileResponse,
    FileUpdate,
    FileVersionCreate,
    FileVersionResponse,
)

__all__ = [
    "FileBase",
    "FileCreate",
    "FileUpdate",
    "FileResponse",
    "FileVersionResponse",
    "FileVersionCreate",
    "FilePermissionRequest",
    "FilePermissionResponse",
]
