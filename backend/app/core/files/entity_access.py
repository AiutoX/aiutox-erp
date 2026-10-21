"""Entity-based access inheritance for files attached to business entities.

Files with an `entity_type`/`entity_id` (e.g. attached to a task, a property, a
lease) should not require a separate `files.*` global permission or a manually
configured `FilePermission` row for every user who can already act on the owning
entity. Each business module registers a resolver here that answers "can this
user do <action> on entity <entity_id>?", reusing that module's own existing
object-level ownership check (e.g. `app.core.tasks.ownership.user_owns_task`)
instead of duplicating that logic in `files`.

`files` (core) never imports a business module directly — modules register
themselves here at startup (see `app/main.py` lifespan), keeping the dependency
direction one-way per the project's module-isolation rules.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol
from uuid import UUID

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class EntityAccessResolver(Protocol):
    """Answers whether a user can perform `action` on one entity instance.

    `action` is one of "view", "download", "edit", "delete" — the same
    vocabulary `FileService.check_permissions()` already uses. A module's
    resolver may map these to its own permission model however it likes (e.g.
    "edit"/"delete" both requiring `tasks.manage.all`, "view" requiring only
    `tasks.view` or being an assignee).

    `db` is the caller's own request-scoped session (from `FileService.db`),
    not a session owned by the resolver — resolvers are registered once at
    startup and must not hold onto a session across requests.
    """

    def can_access(
        self,
        db: Session,
        entity_id: UUID,
        user_id: UUID,
        tenant_id: UUID,
        user_permissions: set[str],
        action: str,
    ) -> bool: ...


_RESOLVERS: dict[str, EntityAccessResolver] = {}


def register_entity_access_resolver(
    entity_type: str, resolver: EntityAccessResolver
) -> None:
    """Register a module's access resolver for one `entity_type` value."""
    _RESOLVERS[entity_type] = resolver


def get_entity_access_resolver(entity_type: str) -> EntityAccessResolver | None:
    """Look up the resolver registered for `entity_type`, if any."""
    return _RESOLVERS.get(entity_type)


def clear_entity_access_resolvers() -> None:
    """Reset all registrations. Test-only — mirrors `set_module_registry`'s
    pattern of a swappable global for isolation between test runs.
    """
    _RESOLVERS.clear()
