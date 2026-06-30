"""Telegram notification provider."""

import logging
from typing import Any

import httpx

from app.core.notifications.providers.base_provider import NotificationProvider

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


class TelegramProvider(NotificationProvider):
    """Sends messages via the Telegram Bot API using httpx."""

    @property
    def channel_name(self) -> str:
        return "telegram"

    async def validate_recipient(self, recipient: str) -> bool:
        """Accept numeric chat_ids (positive or negative, non-empty)."""
        stripped = recipient.lstrip("-")
        return bool(stripped) and stripped.isdigit()

    async def send(  # type: ignore[override]
        self,
        chat_id: str,
        text: str,
        bot_token: str,
        reply_to_message_id: int | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Send a Telegram message.

        Args:
            chat_id: Telegram chat_id (numeric string, positive or negative).
            text: Message text.
            bot_token: Bot token from BotFather.
            reply_to_message_id: Optional message to reply to.

        Returns:
            ``{"status": "sent", "message_id": <int>}`` on success.
            ``{"status": "failed", "error": "<reason>"}`` on any failure.
        """
        if not bot_token:
            return {"status": "failed", "error": "bot_token is required"}

        url = f"{TELEGRAM_API_BASE}/bot{bot_token}/sendMessage"
        payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
        if reply_to_message_id is not None:
            payload["reply_parameters"] = {"message_id": reply_to_message_id}

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(url, json=payload)

            if response.status_code == 200:
                data = response.json()
                message_id: int = data["result"]["message_id"]
                logger.info(
                    "Telegram message sent to chat_id=%s, message_id=%d",
                    chat_id,
                    message_id,
                )
                return {"status": "sent", "message_id": message_id}

            # Telegram returns 4xx for caller errors (bad chat_id, bot blocked, etc.)
            error_description = "unknown"
            try:
                error_description = response.json().get("description", "unknown")
            except Exception:
                pass
            logger.warning(
                "Telegram API error %d for chat_id=%s: %s",
                response.status_code,
                chat_id,
                error_description,
            )
            return {"status": "failed", "error": error_description}

        except httpx.ConnectError as exc:
            logger.error("Telegram network error for chat_id=%s: %s", chat_id, exc)
            return {"status": "failed", "error": str(exc)}
        except Exception as exc:
            logger.error(
                "Unexpected error sending Telegram message to chat_id=%s: %s",
                chat_id,
                exc,
            )
            return {"status": "failed", "error": str(exc)}

    # The base class send() signature is (recipient, subject, body, data).
    # TelegramProvider is called directly via _send_telegram() and never through
    # the generic base interface, so send_batch uses the overridden send().
    async def send_batch(  # type: ignore[override]
        self,
        recipients: list[str],
        subject: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Not used for Telegram — each send requires a bot_token."""
        raise NotImplementedError("Use send() directly with bot_token per message")
