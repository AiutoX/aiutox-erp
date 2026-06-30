"""Telegram inbound webhook receiver.

Receives Telegram Bot API updates, resolves channel identity,
and publishes a message.received event to PubSub.

Endpoint: POST /api/v1/integrations/channels/telegram/webhook
Auth: X-Telegram-Bot-Api-Secret-Token header (set when registering the webhook).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request, Response, status
from sqlalchemy.orm import Session

from app.core.db.deps import get_db
from app.core.integrations.events import MESSAGE_RECEIVED
from app.core.pubsub import EventPublisher, get_event_publisher
from app.core.pubsub.models import EventMetadata
from app.repositories.channel_identity_repository import ChannelIdentityRepository

logger = logging.getLogger(__name__)

router = APIRouter(tags=["telegram"])

_CHANNEL = "telegram"


def _verify_secret(header_value: str | None, expected_secret: str) -> bool:
    """Constant-time comparison of Telegram's secret token header."""
    if not header_value:
        return False
    return hmac.compare_digest(
        hashlib.sha256(header_value.encode()).digest(),
        hashlib.sha256(expected_secret.encode()).digest(),
    )


def _get_telegram_secret() -> str:
    """Return the configured Telegram webhook secret."""
    from app.core.config_file import get_settings

    settings = get_settings()
    return getattr(settings, "TELEGRAM_WEBHOOK_SECRET", "")


def _get_tenant_id_for_telegram() -> UUID | None:
    """Return the tenant UUID configured for the Telegram integration.

    In Phase 3 we use a single global Telegram bot per deployment.
    The tenant is resolved from settings; returns None if not configured.
    """
    from app.core.config_file import get_settings

    settings = get_settings()
    raw = getattr(settings, "TELEGRAM_TENANT_ID", None)
    if not raw:
        return None
    try:
        return UUID(str(raw))
    except ValueError:
        logger.warning("TELEGRAM_TENANT_ID is not a valid UUID: %s", raw)
        return None


@router.post(
    "/channels/telegram/webhook",
    status_code=status.HTTP_200_OK,
    summary="Telegram inbound webhook",
    description=(
        "Receives Telegram Bot API Update objects. "
        "Returns 200 immediately — Telegram requires a response within 5 s."
    ),
)
async def telegram_webhook(
    request: Request,
    response: Response,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
    publisher: EventPublisher = Depends(get_event_publisher),
) -> dict[str, str]:
    expected_secret = _get_telegram_secret()

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

    tenant_id = _get_tenant_id_for_telegram()
    if tenant_id is None:
        logger.warning("TELEGRAM_TENANT_ID not configured — cannot publish event")
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
