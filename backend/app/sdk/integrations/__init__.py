"""aiutox_sdk.integrations — webhook dispatch + event registry surface.

Provides business modules with access to webhook handling and event registry,
but not to the internal IntegrationRepository. Queries must go through
public service functions.
"""

from app.core.integrations.event_registry import (
    EventCategory,
    ModuleEventRegistry,
    WebhookEvent,
    WebhookEventRegistry,
    get_event_registry,
)
from app.core.integrations.models import Integration, Webhook
from app.core.integrations.webhooks import WebhookHandler

__all__ = [
    "WebhookHandler",
    "get_event_registry",
    "WebhookEventRegistry",
    "ModuleEventRegistry",
    "WebhookEvent",
    "EventCategory",
    "Integration",
    "Webhook",
]
