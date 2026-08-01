"""Rocket.Chat notification provider (incoming webhook only)."""

import logging
from typing import Any

import httpx

from app.core.notifications.providers.base_provider import NotificationProvider

logger = logging.getLogger(__name__)


def verify_webhook_url(webhook_url: str) -> bool:
    """Synchronously verify a Rocket.Chat incoming-webhook URL is reachable.

    A reachability probe only, never a visible test post — used by
    IntegrationService.test_integration()'s Rocket.Chat dispatch. Incoming
    webhooks typically reject GET/HEAD without a POST body, so any non-5xx,
    non-connection-error response counts as reachable.
    """
    if not webhook_url:
        return False

    try:
        with httpx.Client(timeout=10) as client:
            response = client.head(webhook_url)
            if response.status_code == 405:
                response = client.get(webhook_url)
        return response.status_code < 500
    except Exception as exc:
        logger.warning("Rocket.Chat webhook URL verification failed: %s", exc)
        return False


class RocketChatProvider(NotificationProvider):
    """Sends messages via a Rocket.Chat incoming webhook using httpx.

    ABC-conformant: webhook_url is held on the instance (set at
    construction), matching EvolutionApiProvider/TelegramProvider's shape.
    There is no per-employee recipient concept — the webhook's configured
    target channel is the recipient. Kept as a separate file from
    MattermostProvider (not a shared base class), consistent with this
    codebase's one-provider-per-file style.
    """

    def __init__(
        self,
        webhook_url: str,
        channel: str | None = None,
        alias: str | None = None,
        avatar: str | None = None,
    ) -> None:
        self.webhook_url = webhook_url
        self.channel = channel
        self.alias = alias
        self.avatar = avatar

    @property
    def channel_name(self) -> str:
        return "rocketchat"

    async def validate_recipient(self, recipient: str) -> bool:
        """No per-employee recipient concept for this channel."""
        return True

    async def send(
        self,
        recipient: str,
        subject: str | None,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Post a message to the configured Rocket.Chat incoming webhook.

        Args:
            recipient: Unused — the webhook's target channel is fixed.
            subject: Optional subject, prepended to body as "**subject**\\n\\nbody".
            body: Message text.
            data: Unused for this channel.

        Returns:
            ``{"status": "sent"}`` on success.
            ``{"status": "failed", "error": "<reason>"}`` on any failure.
        """
        if not self.webhook_url:
            return {"status": "failed", "error": "webhook_url is required"}

        text = f"**{subject}**\n\n{body}" if subject else body
        payload: dict[str, Any] = {"text": text}
        if self.channel:
            payload["channel"] = self.channel
        if self.alias:
            payload["alias"] = self.alias
        if self.avatar:
            payload["avatar"] = self.avatar

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(self.webhook_url, json=payload)

            if response.status_code == 200:
                logger.info("Rocket.Chat message sent")
                return {"status": "sent"}

            logger.warning(
                "Rocket.Chat webhook error %d: %s",
                response.status_code,
                response.text,
            )
            return {"status": "failed", "error": f"HTTP {response.status_code}"}

        except httpx.ConnectError as exc:
            logger.error("Rocket.Chat network error: %s", exc)
            return {"status": "failed", "error": str(exc)}
        except Exception as exc:
            logger.error("Unexpected error sending Rocket.Chat message: %s", exc)
            return {"status": "failed", "error": str(exc)}
