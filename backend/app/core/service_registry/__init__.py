"""Core provider store: named objects that modules register for others to read.

A module registers a provider under a stable name at import time; a consumer
looks it up by that name. The store knows nothing about what a provider is, so
core never imports a business module and business modules never import each
other. Typed, public access goes through ``aiutox_sdk.service_registry``.
"""

from __future__ import annotations

__all__ = ["clear_provider", "get_provider", "register_provider"]

_providers: dict[str, object] = {}


def register_provider(name: str, provider: object) -> None:
    """Register ``provider`` under ``name``, replacing any previous one."""
    _providers[name] = provider


def get_provider(name: str) -> object | None:
    """Return the provider registered under ``name``, or None."""
    return _providers.get(name)


def clear_provider(name: str) -> None:
    """Remove the provider registered under ``name``; absent is not an error."""
    _providers.pop(name, None)
