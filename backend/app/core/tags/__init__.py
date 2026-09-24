"""Tags module for tag management."""

from app.core.tags.events import (
    ALL_TAG_EVENTS,
    TAG_APPLIED,
    TAG_CREATED,
    TAG_DELETED,
    TAG_REMOVED,
    TAG_UPDATED,
    TagEventPublisher,
)
from app.core.tags.models import EntityTag, Tag, TagCategory
from app.core.tags.permissions import (
    ALL_PERMISSIONS,
    PERMISSION_DESCRIPTIONS,
    TAGS_ADMIN,
    TAGS_DELETE,
    TAGS_READ,
    TAGS_WRITE,
)
from app.core.tags.service import TagService

__all__ = [
    # Models
    "Tag",
    "TagCategory",
    "EntityTag",
    # Service
    "TagService",
    # Events
    "TAG_CREATED",
    "TAG_UPDATED",
    "TAG_DELETED",
    "TAG_APPLIED",
    "TAG_REMOVED",
    "ALL_TAG_EVENTS",
    "TagEventPublisher",
    # Permissions
    "TAGS_READ",
    "TAGS_WRITE",
    "TAGS_DELETE",
    "TAGS_ADMIN",
    "ALL_PERMISSIONS",
    "PERMISSION_DESCRIPTIONS",
]
