"""Telegram inbound webhook receiver.

Receives Telegram Bot API updates for a specific tenant, resolves the
tenant's own bot credentials for authenticity verification, matches
pending employee link codes, resolves channel identity, and publishes a
message.received event to PubSub.

Endpoint: POST /api/v1/integrations/channels/telegram/webhook/{tenant_id}
Auth: X-Telegram-Bot-Api-Secret-Token header, verified against that
tenant's own webhook_secret (stored alongside its bot_token in
Integration.credentials) — never a single shared/global secret, since a
shared secret would let one tenant's leaked path spoof another tenant's
updates (MSG-002).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import re
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Path, Request, Response, status
from sqlalchemy.orm import Session

from app.core.db.deps import get_db
from app.core.integrations.channels.telegram_link import (
    LINK_CODE_LENGTH,
    consume_link_code,
)
from app.core.integrations.events import MESSAGE_RECEIVED
from app.core.integrations.service import IntegrationService
from app.core.notifications.providers.telegram_provider import TelegramProvider
from app.core.pubsub import EventPublisher, get_event_publisher
from app.core.pubsub.models import EventMetadata
from app.core.redis import get_redis_client
from app.repositories.channel_identity_repository import ChannelIdentityRepository

logger = logging.getLogger(__name__)

router = APIRouter(tags=["telegram"])

_CHANNEL = "telegram"
# Must be exactly LINK_CODE_LENGTH chars, uppercase alphanumeric, and
# contain at least one digit — the generated code alphabet always mixes
# letters and digits (see telegram_link._CODE_ALPHABET), so a plain
# English word of the same length (e.g. "UNKNOWN") never matches this and
# is treated as ordinary message text, not a link-code attempt.
_LINK_CODE_PATTERN = re.compile(rf"^(?=.*[0-9])[A-Z0-9]{{{LINK_CODE_LENGTH}}}$")


def _verify_secret(header_value: str | None, expected_secret: str) -> bool:
    """Constant-time comparison of Telegram's secret token header."""
    if not header_value:
        return False
    return hmac.compare_digest(
        hashlib.sha256(header_value.encode()).digest(),
        hashlib.sha256(expected_secret.encode()).digest(),
    )


@router.post(
    "/channels/telegram/webhook/{tenant_id}",
    status_code=status.HTTP_200_OK,
    summary="Telegram inbound webhook",
    description=(
        "Receives Telegram Bot API Update objects for a specific tenant. "
        "Returns 200 immediately — Telegram requires a response within 5 s."
    ),
)
async def telegram_webhook(
    request: Request,
    response: Response,
    tenant_id: UUID = Path(...),
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
    publisher: EventPublisher = Depends(get_event_publisher),
) -> dict[str, str]:
    integration_service = IntegrationService(db)
    credentials = integration_service.get_telegram_credentials(tenant_id)

    if credentials is None:
        logger.warning(
            "Telegram webhook called for tenant %s with no Telegram integration configured",
            tenant_id,
        )
        response.status_code = status.HTTP_403_FORBIDDEN
        return {"detail": "telegram not configured for this tenant"}

    expected_secret = credentials.get("webhook_secret", "")
    if expected_secret and not _verify_secret(
        x_telegram_bot_api_secret_token, expected_secret
    ):
        response.status_code = status.HTTP_403_FORBIDDEN
        return {"detail": "invalid secret token"}

    try:
        update: dict[str, Any] = await request.json()
    except Exception:
        return {"status": "ok"}

    message: dict[str, Any] | None = update.get("message")
    if not message:
        return {"status": "ok"}

    chat_id = str(message.get("chat", {}).get("id", ""))
    text: str = message.get("text") or ""

    if not chat_id:
        return {"status": "ok"}

    # Link-code matching: an unrecognized code has no side effect beyond a
    # generic bot reply — never reveals whether a code existed/expired vs.
    # was simply never issued.
    if _LINK_CODE_PATTERN.match(text.strip().upper()):
        redis = await get_redis_client()
        pending = await consume_link_code(redis, text.strip().upper())
        bot_token = credentials.get("bot_token", "")

        if pending is not None and pending.get("tenant_id") == str(tenant_id):
            repo = ChannelIdentityRepository(db)
            repo.create(
                tenant_id=tenant_id,
                channel=_CHANNEL,
                channel_user_id=chat_id,
                user_id=UUID(pending["user_id"]),
            )
            if bot_token:
                provider = TelegramProvider(bot_token=bot_token)
                await provider.send(
                    recipient=chat_id,
                    subject=None,
                    body="Your Telegram account is now linked.",
                )
        else:
            if bot_token:
                provider = TelegramProvider(bot_token=bot_token)
                await provider.send(
                    recipient=chat_id,
                    subject=None,
                    body="No pending link request found for this code.",
                )
        return {"status": "ok"}

    repo = ChannelIdentityRepository(db)
    user = repo.resolve(tenant_id, _CHANNEL, chat_id)
    user_id: UUID | None = UUID(str(user.id)) if user else None

    try:
        await publisher.publish(
            event_type=MESSAGE_RECEIVED,
            entity_type="message",
            entity_id=tenant_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata=EventMetadata(
                source="telegram_receiver",
                additional_data={
                    "channel": _CHANNEL,
                    "channel_user_id": chat_id,
                    "text": text,
                },
            ),
        )
    except Exception as exc:
        logger.error("Failed to publish message.received for Telegram: %s", exc)

    return {"status": "ok"}
