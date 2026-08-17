"""Single source of truth for notification channels and per-tenant availability.

Frontend consumers (TemplateManager, NotifyActionConfig, SendMessageDialog)
each used to maintain their own hardcoded channel list, drifting out of sync
with the backend and with each other (e.g. Telegram/Mattermost/Rocket.Chat
missing from some lists). This module derives availability by calling the
exact same resolution logic each channel's real send path already uses —
it does not duplicate or approximate that logic.
"""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.integrations.service import IntegrationService
from app.core.notifications.service import NotificationService

# Channels resolved from a linked ContactMethod on the recipient — mirrors
# crm/api.py's _CHANNEL_TO_METHOD_TYPES (which now imports from here instead
# of maintaining its own copy). Channels absent from this dict have no
# per-recipient identity concept — they resolve to a single tenant-level
# destination (a configured webhook) regardless of who the notification is
# nominally "for".
CHANNEL_METHOD_TYPES: dict[str, list[str]] = {
    "email": ["email"],
    "whatsapp": ["whatsapp"],
    "telegram": ["telegram"],
    "sms": ["mobile", "phone"],
}

ALL_CHANNELS = (
    "email",
    "sms",
    "whatsapp",
    "telegram",
    "mattermost",
    "rocketchat",
    "webhook",
    "in-app",
)


@dataclass(frozen=True)
class ChannelCatalogEntry:
    """One channel's identity and this tenant's ability to send through it."""

    channel: str
    available: bool
    requires_contact_method: bool
    method_types: list[str]


def get_channel_catalog(db: Session, tenant_id: UUID) -> list[ChannelCatalogEntry]:
    """Build the channel catalog for a tenant.

    Availability mirrors each channel's real send path:
    - email: NotificationService._get_tenant_smtp_config (tenant config, or
      the instance-wide SMTP_HOST fallback if set and not "localhost")
    - whatsapp/telegram/mattermost/rocketchat: IntegrationService's
      get_*_credentials (per-tenant, encrypted)
    - webhook: channels.webhook.enabled + channels.webhook.url via
      NotificationService._get_tenant_webhook_url
    - sms: always unavailable — the send path's branch exists but never
      calls a real provider (documented gap, not "planned")
    - in-app: always available — _send_notification's in-app branch is a
      no-op, the NotificationQueue row itself is the delivery, no external
      config is ever required
    """
    notification_service = NotificationService(db, event_publisher=None)
    integration_service = IntegrationService(db)

    availability: dict[str, bool] = {
        "email": notification_service._get_tenant_smtp_config(tenant_id) is not None,
        "sms": False,
        "whatsapp": bool(integration_service.get_whatsapp_credentials(tenant_id)),
        "telegram": bool(integration_service.get_telegram_credentials(tenant_id)),
        "mattermost": bool(integration_service.get_mattermost_credentials(tenant_id)),
        "rocketchat": bool(integration_service.get_rocketchat_credentials(tenant_id)),
        "webhook": bool(notification_service._get_tenant_webhook_url(tenant_id)),
        "in-app": True,
    }

    return [
        ChannelCatalogEntry(
            channel=channel,
            available=availability[channel],
            requires_contact_method=channel in CHANNEL_METHOD_TYPES,
            method_types=CHANNEL_METHOD_TYPES.get(channel, []),
        )
        for channel in ALL_CHANNELS
    ]
