"""Email notification provider."""

import logging
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import aiosmtplib

from app.core.config_file import get_settings
from app.core.notifications.providers.base_provider import NotificationProvider

logger = logging.getLogger(__name__)


class EmailProvider(NotificationProvider):
    """Email notification provider using SMTP."""

    def __init__(self):
        """Initialize email provider with SMTP settings."""
        self.settings = get_settings()
        self.smtp_host = self.settings.SMTP_HOST
        self.smtp_port = self.settings.SMTP_PORT
        self.smtp_user = self.settings.SMTP_USER
        self.smtp_password = self.settings.SMTP_PASSWORD
        self.from_email = self.settings.SMTP_FROM

    @property
    def channel_name(self) -> str:
        """Return the channel name."""
        return "email"

    async def validate_recipient(self, recipient: str) -> bool:
        """Validate email address format.

        Args:
            recipient: Email address to validate

        Returns:
            True if valid email format, False otherwise
        """
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(email_pattern, recipient))

    async def send(
        self,
        recipient: str,
        subject: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send email notification.

        Args:
            recipient: Email address
            subject: Email subject
            body: Email body (HTML or plain text)
            data: Additional data (optional)

        Returns:
            Dictionary with send result
        """
        # Validate recipient
        if not await self.validate_recipient(recipient):
            return {
                "success": False,
                "error": f"Invalid email address: {recipient}",
            }

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.from_email
            message["To"] = recipient

            # Attach body as HTML (preferred) and plain text fallback
            part1 = MIMEText(self._html_to_plain(body), "plain")
            part2 = MIMEText(body, "html")
            message.attach(part1)
            message.attach(part2)

            # Send via SMTP
            async with aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=self.smtp_port,
                use_tls=True,
            ) as smtp:
                await smtp.login(self.smtp_user, self.smtp_password)
                await smtp.send_message(message)

            logger.info(
                f"Email sent successfully to {recipient} with subject '{subject}'"
            )
            return {
                "success": True,
                "message_id": f"{recipient}_{subject}",
                "channel": "email",
            }

        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {e}")
            return {
                "success": False,
                "error": str(e),
                "channel": "email",
            }

    async def send_batch(
        self,
        recipients: list[str],
        subject: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Send emails to multiple recipients.

        Sends concurrently for better performance.

        Args:
            recipients: List of email addresses
            subject: Email subject
            body: Email body
            data: Additional data

        Returns:
            List of send results
        """
        import asyncio

        tasks = [self.send(recipient, subject, body, data) for recipient in recipients]
        return await asyncio.gather(*tasks)

    @staticmethod
    def _html_to_plain(html: str) -> str:
        """Convert HTML to plain text (basic implementation).

        Args:
            html: HTML content

        Returns:
            Plain text version
        """
        import re

        # Remove HTML tags
        plain = re.sub(r"<[^>]+>", "\n", html)
        # Remove extra whitespace
        plain = re.sub(r"\s+", " ", plain).strip()
        return plain
