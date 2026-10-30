"""Re-export. The canonical definitions live in aiutox_sdk._event_registry (DEC-20261020-014).

`_event_registry` is re-exported too: it is the singleton itself, shared with the SDK.
"""

from aiutox_sdk._event_registry import (
    EventCategory,
    ModuleEventRegistry,
    WebhookEvent,
    WebhookEventRegistry,
    _event_registry,
    get_event_registry,
)

__all__ = [
    "EventCategory",
    "ModuleEventRegistry",
    "WebhookEvent",
    "WebhookEventRegistry",
    "_event_registry",
    "get_event_registry",
]
