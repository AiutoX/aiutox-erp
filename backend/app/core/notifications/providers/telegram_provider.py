"""Telegram notification provider."""

import logging
from typing import Any

import httpx

from app.core.notifications.providers.base_provider import NotificationProvider

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


def verify_bot_token(bot_token: str) -> bool:
    """Synchronously verify a Telegram bot token via the Bot API's getMe
    endpoint. Used by IntegrationService.test_integration()'s Telegram
    dispatch, which is itself synchronous (matches run_webhook_integration's
    sync httpx.Client pattern)."""
    if not bot_token:
        return False

    url = f"{TELEGRAM_API_BASE}/bot{bot_token}/getMe"
    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(url)
        if response.status_code != 200:
            return False
        return bool(response.json().get("ok"))
    except Exception as exc:
        logger.warning("Telegram bot token verification failed: %s", exc)
        return False


class TelegramProvider(NotificationProvider):
    """Sends messages via the Telegram Bot API using httpx.

    ABC-conformant: bot_token is held on the instance (set at construction),
    matching EvolutionApiProvider's shape — not passed per-call.
    """

    def __init__(self, bot_token: str) -> None:
        self.bot_token = bot_token

    @property
    def channel_name(self) -> str:
        return "telegram"

    async def validate_recipient(self, recipient: str) -> bool:
        """Accept numeric chat_ids (positive or negative, non-empty)."""
        stripped = recipient.lstrip("-")
        return bool(stripped) and stripped.isdigit()

    async def send(
        self,
        recipient: str,
        subject: str | None,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send a Telegram message.

        Args:
            recipient: Telegram chat_id (numeric string, positive or negative).
            subject: Optional subject, prepended to body as "*subject*\\n\\nbody"
                (matches EvolutionApiProvider's convention).
            body: Message text.
            data: Optional extra fields; "reply_to_message_id" is honored.

        Returns:
            ``{"status": "sent", "message_id": <int>}`` on success.
            ``{"status": "failed", "error": "<reason>"}`` on any failure.
        """
        if not self.bot_token:
            return {"status": "failed", "error": "bot_token is required"}

        text = f"*{subject}*\n\n{body}" if subject else body
        reply_to_message_id = (data or {}).get("reply_to_message_id")

        url = f"{TELEGRAM_API_BASE}/bot{self.bot_token}/sendMessage"
        payload: dict[str, Any] = {"chat_id": recipient, "text": text}
        if reply_to_message_id is not None:
            payload["reply_parameters"] = {"message_id": reply_to_message_id}

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(url, json=payload)

            if response.status_code == 200:
                result = response.json()
                message_id: int = result["result"]["message_id"]
                logger.info(
                    "Telegram message sent to chat_id=%s, message_id=%d",
                    recipient,
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
                recipient,
                error_description,
            )
            return {"status": "failed", "error": error_description}

        except httpx.ConnectError as exc:
            logger.error("Telegram network error for chat_id=%s: %s", recipient, exc)
            return {"status": "failed", "error": str(exc)}
        except Exception as exc:
            logger.error(
                "Unexpected error sending Telegram message to chat_id=%s: %s",
                recipient,
                exc,
            )
            return {"status": "failed", "error": str(exc)}
