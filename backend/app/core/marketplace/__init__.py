"""Marketplace core module — self-service module discovery and trial activation."""

import os


def is_marketplace_enabled() -> bool:
    """Return True unless AIUTOX_MARKETPLACE_ENABLED is explicitly 'false'."""
    return os.getenv("AIUTOX_MARKETPLACE_ENABLED", "true").lower() != "false"
