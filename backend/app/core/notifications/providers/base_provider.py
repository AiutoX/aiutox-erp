"""Base notification provider protocol."""

from abc import ABC, abstractmethod
from typing import Any


class NotificationProvider(ABC):
    """Abstract base class for notification providers."""

    @property
    @abstractmethod
    def channel_name(self) -> str:
        """Return the channel name (e.g., 'email', 'sms', 'whatsapp')."""

    @abstractmethod
    async def send(
        self,
        recipient: str,
        subject: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send a notification.

        Args:
            recipient: Recipient identifier (email, phone number, etc.)
            subject: Notification subject
            body: Notification body content
            data: Additional data for the notification

        Returns:
            Dictionary with send result, including:
            - success: bool
            - message_id: str (optional, for tracking)
            - error: str (optional, error message if failed)
        """

    @abstractmethod
    async def validate_recipient(self, recipient: str) -> bool:
        """Validate if recipient is valid for this channel.

        Args:
            recipient: Recipient identifier to validate

        Returns:
            True if valid, False otherwise
        """

    async def send_batch(
        self,
        recipients: list[str],
        subject: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Send notifications to multiple recipients.

        Default implementation sends to each recipient sequentially.
        Subclasses can override for batch sending optimization.

        Args:
            recipients: List of recipient identifiers
            subject: Notification subject
            body: Notification body content
            data: Additional data for notifications

        Returns:
            List of send results
        """
        results = []
        for recipient in recipients:
            result = await self.send(recipient, subject, body, data)
            results.append(result)
        return results
