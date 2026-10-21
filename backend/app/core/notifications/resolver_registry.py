"""Registry for notification recipient resolver plugins.

Business modules register resolver functions here at startup so the automation
engine (core) can resolve named recipient selectors (e.g. "lease_owner") without
importing directly from business modules.

Pattern mirrors the task type provider registry.
"""

from collections.abc import Callable
from typing import Any

_registry: dict[str, Callable[..., Any]] = {}


def register_resolver(key: str, fn: Callable[..., Any]) -> None:
    """Register a recipient resolver for a given selector key.

    The callable signature must be:
        async fn(selector: str, event_data: dict, tenant_id: UUID, db: Session)
            -> list[RecipientContact]

    Args:
        key: Selector key used in automation rule actions (e.g. "lease_owner").
        fn: Async callable that resolves the key to a list of RecipientContact objects.
    """
    _registry[key] = fn


def get_resolver(key: str) -> Callable[..., Any] | None:
    """Return the resolver callable for key, or None if not registered."""
    return _registry.get(key)


def list_registered_keys() -> list[str]:
    """Return all registered selector keys (for diagnostics)."""
    return list(_registry.keys())
