"""Calendar permissions."""

from app.core.calendar.permissions.permissions import (  # noqa: F401
    ALL_CALENDAR_PERMISSIONS,
    CALENDAR_ADMIN,
    CALENDAR_DELETE,
    CALENDAR_READ,
    CALENDAR_WRITE,
    PERMISSION_DESCRIPTIONS,
)

__all__ = [
    "CALENDAR_READ",
    "CALENDAR_WRITE",
    "CALENDAR_DELETE",
    "CALENDAR_ADMIN",
    "ALL_CALENDAR_PERMISSIONS",
    "PERMISSION_DESCRIPTIONS",
]
