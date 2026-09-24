"""Notification service for sending notifications."""

import logging
from dataclasses import dataclass
from datetime import UTC
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.notifications.models import (
    NotificationQueue,
    NotificationStatus,
    NotificationTemplate,
)
from app.core.notifications.providers.base_provider import NotificationProvider
from app.core.preferences.service import PreferencesService
from app.core.pubsub import EventMetadata, EventPublisher
from app.core.sse.manager import get_sse_manager
from app.repositories.notification_repository import NotificationRepository

logger = logging.getLogger(__name__)


@dataclass
class _SMTPConfig:
    """Resolved SMTP configuration for a single send, tenant or fallback."""

    host: str
    port: int
    user: str | None
    password: str | None
    use_tls: bool
    from_email: str
    from_name: str | None = None


class NotificationService:
    """Service for managing notifications."""

    def __init__(self, db: Session, event_publisher: EventPublisher | None = None):
        """Initialize service with database session."""
        self.db = db
        self.repository = NotificationRepository(db)
        self.preferences_service = PreferencesService(db)
        self.event_publisher = event_publisher  # None = no event publishing

    async def send(
        self,
        event_type: str,
        recipient_id: UUID,
        channels: list[str],
        data: dict[str, Any] | None = None,
        tenant_id: UUID | None = None,
    ) -> list[dict[str, Any]]:
        """Send a notification.

        Args:
            event_type: Event type that triggered the notification
            recipient_id: User ID to send notification to
            channels: List of channels ('email', 'sms', 'webhook', 'in-app')
            data: Event data for template rendering
            tenant_id: Tenant ID (optional, will be fetched from user if not provided)

        Returns:
            List of notification queue records
        """
        # TODO: Get tenant_id from user if not provided
        if not tenant_id:
            # For now, we'll require tenant_id
            raise ValueError("tenant_id is required")

        # Check user preferences
        notification_prefs = self.preferences_service.get_preference(
            user_id=recipient_id,
            tenant_id=tenant_id,
            preference_type="notification",
            key=event_type,
            default={"enabled": True, "channels": ["in-app"]},
        )

        if not notification_prefs.get("enabled", True):
            logger.info(
                f"Notifications disabled for user {recipient_id} and event {event_type}"
            )
            return []

        # Filter channels based on preferences
        preferred_channels = notification_prefs.get("channels", ["in-app"])
        channels_to_use = [ch for ch in channels if ch in preferred_channels]
        logger.debug(
            f"send() {event_type} for {recipient_id}: offered={channels} "
            f"preferred={preferred_channels} using={channels_to_use}"
        )

        if not channels_to_use:
            logger.info(
                f"No matching channels for user {recipient_id} and event {event_type}"
            )
            return []

        # Get template for each channel
        notifications = []
        for channel in channels_to_use:
            template = self.repository.get_template(event_type, channel, tenant_id)
            if not template:
                logger.warning(
                    f"No template found for event_type={event_type}, channel={channel}"
                )
                continue

            # Create notification queue entry
            queue_entry = self.repository.create_queue_entry(
                {
                    "event_type": event_type,
                    "recipient_id": recipient_id,
                    "tenant_id": tenant_id,
                    "channel": channel,
                    "template_id": template.id,
                    "data": data,
                    "status": NotificationStatus.PENDING,
                }
            )
            notifications.append(queue_entry)

            # Send notification (async processing)
            try:
                await self._send_notification(queue_entry, template, data or {})
                queue_entry.status = NotificationStatus.SENT
                from datetime import datetime

                queue_entry.sent_at = datetime.now(UTC)
                self.db.commit()

                # Push to any connected SSE client for this user (non-fatal).
                # Each worker process consumes the domain event stream independently
                # and only needs to reach its own locally-connected clients, so no
                # cross-worker fan-out is required here.
                try:
                    await get_sse_manager().send_to_user(
                        user_id=recipient_id,
                        event_type="notification.created",
                        data={
                            "id": str(queue_entry.id),
                            "event_type": queue_entry.event_type,
                            "recipient_id": str(queue_entry.recipient_id),
                            "tenant_id": str(queue_entry.tenant_id),
                            "channel": queue_entry.channel,
                            "status": queue_entry.status,
                            "created_at": queue_entry.created_at.isoformat(),
                        },
                    )
                except Exception as sse_error:
                    logger.error(
                        f"Failed to push SSE notification for {queue_entry.id}: {sse_error}"
                    )

                # Publish notification.sent event (non-fatal)
                if self.event_publisher is not None:
                    await self.event_publisher.publish(
                        event_type="notification.sent",
                        entity_type="notification",
                        entity_id=UUID(str(queue_entry.id)),
                        tenant_id=tenant_id,
                        user_id=recipient_id,
                        metadata=EventMetadata(
                            source="notification_service",
                            version="1.0",
                            additional_data={
                                "channel": channel,
                                "event_type": event_type,
                                "template_id": str(template.id),
                            },
                        ),
                    )
            except Exception as e:
                logger.error(
                    f"Failed to send notification {queue_entry.id}: {e}", exc_info=True
                )
                queue_entry.status = NotificationStatus.FAILED
                queue_entry.error_message = str(e)
                self.db.commit()

                # Publish notification.failed event (non-fatal)
                if self.event_publisher is not None:
                    await self.event_publisher.publish(
                        event_type="notification.failed",
                        entity_type="notification",
                        entity_id=UUID(str(queue_entry.id)),
                        tenant_id=tenant_id,
                        user_id=recipient_id,
                        metadata=EventMetadata(
                            source="notification_service",
                            version="1.0",
                            additional_data={
                                "channel": channel,
                                "event_type": event_type,
                                "error": str(e),
                            },
                        ),
                    )

        return [
            {
                "id": str(n.id),
                "event_type": n.event_type,
                "channel": n.channel,
                "status": n.status,
            }
            for n in notifications
        ]

    async def send_to_contact(
        self,
        name: str,
        email: str | None,
        phone: str | None,
        event_type: str,
        channels: list[str],
        data: dict[str, Any] | None = None,
        tenant_id: UUID | None = None,
    ) -> list[dict[str, Any]]:
        """Send a notification directly to an external contact (email/phone string).

        Used for arrendadores and arrendatarios who are Organization contacts,
        not necessarily system Users. Bypasses user lookup and preference checks.

        Args:
            name: Recipient display name (for logging).
            email: Raw email address (None to skip email channel).
            phone: Raw phone number (None to skip whatsapp/sms channels).
            event_type: Used to look up the notification template.
            channels: Desired channels ('email', 'whatsapp').
            data: Template rendering context.
            tenant_id: Required for template lookup.

        Returns:
            List of dicts with channel and status for each attempted send.
        """
        if not tenant_id:
            raise ValueError("tenant_id is required for send_to_contact")

        results: list[dict[str, Any]] = []
        render_data = data or {}

        for channel in channels:
            template = self.repository.get_template(event_type, channel, tenant_id)
            if not template:
                logger.warning(
                    "send_to_contact: no template for event_type=%s channel=%s",
                    event_type,
                    channel,
                )
                results.append(
                    {"channel": channel, "status": "skipped", "reason": "no_template"}
                )
                continue

            rendered_body = self._render_template(template.body, render_data)
            rendered_subject = (
                self._render_template(template.subject, render_data)
                if template.subject
                else None
            )

            try:
                if channel == "email":
                    if not email:
                        results.append(
                            {
                                "channel": channel,
                                "status": "skipped",
                                "reason": "no_email",
                            }
                        )
                        continue
                    await self._send_email_to_address(
                        email, rendered_subject, rendered_body, tenant_id
                    )
                    results.append(
                        {"channel": channel, "status": "sent", "recipient": email}
                    )

                elif channel in ("whatsapp", "sms"):
                    if not phone:
                        results.append(
                            {
                                "channel": channel,
                                "status": "skipped",
                                "reason": "no_phone",
                            }
                        )
                        continue
                    if channel == "whatsapp":
                        from app.core.config_file import get_settings
                        from app.core.integrations.service import IntegrationService
                        from app.core.notifications.providers.evolution_api_provider import (
                            EvolutionApiProvider,
                        )

                        whatsapp_creds = IntegrationService(
                            self.db
                        ).get_whatsapp_credentials(tenant_id)
                        if not whatsapp_creds or not whatsapp_creds.get("api_key"):
                            logger.warning(
                                "WhatsApp not configured for tenant %s, skipping send",
                                tenant_id,
                            )
                            results.append(
                                {
                                    "channel": channel,
                                    "status": "skipped",
                                    "reason": "not_configured",
                                }
                            )
                            continue

                        provider: NotificationProvider = EvolutionApiProvider(
                            api_url=whatsapp_creds["api_url"],
                            api_key=whatsapp_creds["api_key"],
                            instance_name=whatsapp_creds["instance_name"],
                            rate_limit_per_minute=get_settings().EVOLUTION_RATE_LIMIT_PER_MINUTE,
                        )
                        result = await provider.send(
                            phone,
                            rendered_subject or "",
                            rendered_body,
                            {"tenant_id": str(tenant_id)},
                        )
                        if not result.get("success"):
                            raise Exception(result.get("error", "WhatsApp send failed"))
                    results.append(
                        {"channel": channel, "status": "sent", "recipient": phone}
                    )

                elif channel == "telegram":
                    if not phone:
                        results.append(
                            {
                                "channel": channel,
                                "status": "skipped",
                                "reason": "no_phone",
                            }
                        )
                        continue

                    from app.core.integrations.service import IntegrationService
                    from app.core.notifications.providers.telegram_provider import (
                        TelegramProvider,
                    )

                    telegram_creds = IntegrationService(
                        self.db
                    ).get_telegram_credentials(tenant_id)
                    bot_token = (telegram_creds or {}).get("bot_token")
                    if not bot_token:
                        logger.warning(
                            "Telegram not configured for tenant %s, skipping send",
                            tenant_id,
                        )
                        results.append(
                            {
                                "channel": channel,
                                "status": "skipped",
                                "reason": "not_configured",
                            }
                        )
                        continue

                    provider = TelegramProvider(bot_token=bot_token)
                    result = await provider.send(
                        recipient=phone,
                        subject=rendered_subject,
                        body=rendered_body,
                    )
                    if result.get("status") != "sent":
                        raise Exception(result.get("error", "Telegram send failed"))
                    results.append(
                        {"channel": channel, "status": "sent", "recipient": phone}
                    )

                elif channel in ("mattermost", "rocketchat"):
                    # No per-contact recipient concept for these channels —
                    # the tenant's configured webhook is the only
                    # destination, mirroring _send_mattermost/_send_rocketchat.
                    from app.core.integrations.service import IntegrationService

                    integration_service = IntegrationService(self.db)
                    if channel == "mattermost":
                        from app.core.notifications.providers.mattermost_provider import (
                            MattermostProvider,
                        )

                        creds = integration_service.get_mattermost_credentials(
                            tenant_id
                        )
                        webhook_url = (creds or {}).get("webhook_url")
                        if not webhook_url:
                            results.append(
                                {
                                    "channel": channel,
                                    "status": "skipped",
                                    "reason": "not_configured",
                                }
                            )
                            continue
                        provider = MattermostProvider(
                            webhook_url=webhook_url,
                            channel=(creds or {}).get("channel"),
                            username=(creds or {}).get("username"),
                            icon_url=(creds or {}).get("icon_url"),
                        )
                    else:
                        from app.core.notifications.providers.rocketchat_provider import (
                            RocketChatProvider,
                        )

                        creds = integration_service.get_rocketchat_credentials(
                            tenant_id
                        )
                        webhook_url = (creds or {}).get("webhook_url")
                        if not webhook_url:
                            results.append(
                                {
                                    "channel": channel,
                                    "status": "skipped",
                                    "reason": "not_configured",
                                }
                            )
                            continue
                        provider = RocketChatProvider(
                            webhook_url=webhook_url,
                            channel=(creds or {}).get("channel"),
                            alias=(creds or {}).get("alias"),
                            avatar=(creds or {}).get("avatar"),
                        )

                    result = await provider.send(
                        recipient="",
                        subject=rendered_subject,
                        body=rendered_body,
                    )
                    if result.get("status") != "sent":
                        raise Exception(result.get("error", f"{channel} send failed"))
                    results.append({"channel": channel, "status": "sent"})

                else:
                    results.append(
                        {
                            "channel": channel,
                            "status": "skipped",
                            "reason": "unsupported_channel",
                        }
                    )

            except Exception as exc:
                logger.error(
                    "send_to_contact: failed channel=%s recipient=%s: %s",
                    channel,
                    name,
                    exc,
                    exc_info=True,
                )
                results.append(
                    {"channel": channel, "status": "failed", "error": str(exc)}
                )

        return results

    async def send_test_email(self, tenant_id: UUID, recipient_email: str) -> None:
        """Send a test email using the tenant's configured SMTP channel.

        The email subject uses the sender name configured in
        Config > Notifications (``channels.smtp.from_name``), falling back to
        the sender address if no name was configured.

        Raises:
            ValueError: If the tenant has no usable SMTP configuration.
        """
        smtp_config = self._get_tenant_smtp_config(tenant_id)
        if smtp_config is None:
            raise ValueError("SMTP is not configured or enabled for this tenant")

        sender_name = smtp_config.from_name or smtp_config.from_email
        subject = f"{sender_name} - correo de prueba de AiutoX ERP"
        body = (
            "<p>Este es un correo de prueba enviado desde la configuracion de "
            "notificaciones de AiutoX ERP.</p>"
            "<p>Si recibiste este mensaje, la configuracion SMTP es correcta.</p>"
        )
        await self._send_via_smtp(smtp_config, recipient_email, subject, body)

    async def _send_email_to_address(
        self, email: str, subject: str | None, body: str, tenant_id: UUID
    ) -> None:
        """Send email directly to a raw email address (no User lookup)."""
        smtp_config = self._get_tenant_smtp_config(tenant_id)
        if smtp_config is None:
            logger.warning(
                "send_to_contact: SMTP not configured for tenant %s, skipping email to %s",
                tenant_id,
                email,
            )
            return

        await self._send_via_smtp(smtp_config, email, subject, body)
        logger.info("send_to_contact: email sent to %s", email)

    async def send_email_with_attachment(
        self,
        tenant_id: UUID,
        recipient_email: str,
        subject: str | None,
        body: str,
        attachment_filename: str,
        attachment_content: bytes,
        attachment_mimetype: str,
    ) -> None:
        """Send an email with a single attachment to a raw email address.

        Raises:
            ValueError: If the tenant has no usable SMTP configuration.
        """
        smtp_config = self._get_tenant_smtp_config(tenant_id)
        if smtp_config is None:
            raise ValueError("SMTP is not configured or enabled for this tenant")

        await self._send_via_smtp(
            smtp_config,
            recipient_email,
            subject,
            body,
            attachment_filename=attachment_filename,
            attachment_content=attachment_content,
            attachment_mimetype=attachment_mimetype,
        )

    def _get_tenant_smtp_config(self, tenant_id: UUID) -> "_SMTPConfig | None":
        """Resolve the SMTP configuration to use for a tenant.

        Reads the per-tenant configuration saved from Config > Notifications
        (``channels.smtp.*``) first. Falls back to the instance-wide
        ``SMTP_*`` environment settings only if the tenant has not configured
        or enabled its own SMTP channel.

        Returns:
            ``_SMTPConfig`` ready to use, or ``None`` if no usable SMTP
            configuration is available for this tenant.
        """
        from app.core.config.service import ConfigService
        from app.core.config_file import get_settings

        config_service = ConfigService(self.db, use_cache=True)

        smtp_enabled = config_service.get(
            tenant_id=tenant_id,
            module="notifications",
            key="channels.smtp.enabled",
            default=False,
        )
        if smtp_enabled:
            host = config_service.get(
                tenant_id=tenant_id, module="notifications", key="channels.smtp.host"
            )
            if host:
                return _SMTPConfig(
                    host=host,
                    port=config_service.get(
                        tenant_id=tenant_id,
                        module="notifications",
                        key="channels.smtp.port",
                        default=587,
                    ),
                    user=config_service.get(
                        tenant_id=tenant_id,
                        module="notifications",
                        key="channels.smtp.user",
                    ),
                    password=config_service.get(
                        tenant_id=tenant_id,
                        module="notifications",
                        key="channels.smtp.password",
                    ),
                    use_tls=config_service.get(
                        tenant_id=tenant_id,
                        module="notifications",
                        key="channels.smtp.use_tls",
                        default=True,
                    ),
                    from_email=config_service.get(
                        tenant_id=tenant_id,
                        module="notifications",
                        key="channels.smtp.from_email",
                        default="",
                    ),
                    from_name=config_service.get(
                        tenant_id=tenant_id,
                        module="notifications",
                        key="channels.smtp.from_name",
                    ),
                )

        # Fallback to instance-wide SMTP settings (env vars)
        settings = get_settings()
        if settings.SMTP_HOST and settings.SMTP_HOST != "localhost":
            return _SMTPConfig(
                host=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                user=settings.SMTP_USER or None,
                password=settings.SMTP_PASSWORD or None,
                use_tls=settings.SMTP_USE_TLS,
                from_email=settings.SMTP_FROM,
            )

        return None

    async def _send_via_smtp(
        self,
        smtp_config: "_SMTPConfig",
        recipient_email: str,
        subject: str | None,
        body: str,
        attachment_filename: str | None = None,
        attachment_content: bytes | None = None,
        attachment_mimetype: str | None = None,
    ) -> None:
        """Send a single email via SMTP using a resolved configuration.

        If ``attachment_content`` is provided, the alternative text/html part
        is wrapped in a ``multipart/mixed`` envelope alongside the attachment.
        """
        from email.mime.base import MIMEBase
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        import aiosmtplib

        alternative = MIMEMultipart("alternative")
        alternative.attach(
            MIMEText(body, "html" if "<html>" in body.lower() else "plain")
        )

        if attachment_content is not None:
            message: MIMEMultipart = MIMEMultipart("mixed")
            message.attach(alternative)

            maintype, _, subtype = (
                attachment_mimetype or "application/octet-stream"
            ).partition("/")
            part = MIMEBase(maintype or "application", subtype or "octet-stream")
            part.set_payload(attachment_content)
            from email import encoders

            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{attachment_filename}"',
            )
            message.attach(part)
        else:
            message = alternative

        message["From"] = smtp_config.from_email
        message["To"] = recipient_email
        if subject:
            message["Subject"] = subject

        await aiosmtplib.send(
            message,
            hostname=smtp_config.host,
            port=smtp_config.port,
            username=smtp_config.user,
            password=smtp_config.password,
            use_tls=smtp_config.use_tls,
        )

    async def _send_notification(
        self,
        queue_entry: NotificationQueue,
        template: NotificationTemplate,
        data: dict[str, Any],
    ) -> None:
        """Send a notification using the template.

        Args:
            queue_entry: Queue entry
            template: Notification template
            data: Event data for rendering
        """
        # Render template
        rendered_body = self._render_template(template.body, data)
        rendered_subject = (
            self._render_template(template.subject, data) if template.subject else None
        )

        # Send based on channel
        if template.channel == "email":
            await self._send_email(
                UUID(str(queue_entry.recipient_id)),
                rendered_subject,
                rendered_body,
                tenant_id=UUID(str(queue_entry.tenant_id)),
            )
        elif template.channel == "sms":
            await self._send_sms(UUID(str(queue_entry.recipient_id)), rendered_body)
        elif template.channel == "in-app":
            # In-app notifications are stored in the queue
            pass
        elif template.channel == "whatsapp":
            await self._send_whatsapp(
                UUID(str(queue_entry.recipient_id)),
                rendered_subject or "",
                rendered_body,
                {"tenant_id": str(queue_entry.tenant_id)},
            )
        elif template.channel == "telegram":
            await self._send_telegram(
                UUID(str(queue_entry.recipient_id)),
                rendered_body,
                {"tenant_id": str(queue_entry.tenant_id)},
            )
        elif template.channel == "mattermost":
            await self._send_mattermost(
                UUID(str(queue_entry.recipient_id)),
                rendered_body,
                {"tenant_id": str(queue_entry.tenant_id)},
            )
        elif template.channel == "rocketchat":
            await self._send_rocketchat(
                UUID(str(queue_entry.recipient_id)),
                rendered_body,
                {"tenant_id": str(queue_entry.tenant_id)},
            )
        elif template.channel == "webhook":
            webhook_url = data.get("webhook_url") or self._get_tenant_webhook_url(
                UUID(str(queue_entry.tenant_id))
            )
            if not webhook_url:
                logger.warning(
                    "Webhook URL not configured for tenant %s and none provided in "
                    "data, skipping send",
                    queue_entry.tenant_id,
                )
                return
            await self._send_webhook(webhook_url, {"body": rendered_body})
        else:
            raise ValueError(f"Unsupported channel: {template.channel}")

    def _get_tenant_webhook_url(self, tenant_id: UUID) -> str | None:
        """Resolve the tenant's configured webhook URL, if enabled.

        Config -> Notifications -> Webhook lets a tenant configure and enable
        a default webhook URL, but nothing in the send path read it back
        until this method existed — every webhook-channel send required the
        caller to pass a URL explicitly via data["webhook_url"].
        """
        from app.core.config.service import ConfigService

        config_service = ConfigService(self.db, use_cache=True)
        enabled = config_service.get(
            tenant_id=tenant_id,
            module="notifications",
            key="channels.webhook.enabled",
            default=False,
        )
        if not enabled:
            return None
        url = config_service.get(
            tenant_id=tenant_id,
            module="notifications",
            key="channels.webhook.url",
            default=None,
        )
        return url if isinstance(url, str) and url else None

    def _render_template(self, template: str, data: dict[str, Any]) -> str:
        """Render template with variables.

        Args:
            template: Template string with {{variables}}
            data: Data dictionary

        Returns:
            Rendered template
        """
        result = template
        for key, value in data.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result

    async def _send_email(
        self,
        recipient_id: UUID,
        subject: str | None,
        body: str,
        tenant_id: UUID | None = None,
    ) -> None:
        """Send email notification.

        Args:
            recipient_id: User ID
            subject: Email subject
            body: Email body
            tenant_id: Tenant ID — if provided, avoids an extra DB lookup
        """
        from app.repositories.user_repository import UserRepository

        # Get user email
        user_repo = UserRepository(self.db)
        user = user_repo.get_by_id(recipient_id)
        if not user or not user.email:
            raise ValueError(f"User {recipient_id} not found or has no email")

        resolved_tenant_id = (
            tenant_id if tenant_id is not None else UUID(str(user.tenant_id))
        )
        smtp_config = self._get_tenant_smtp_config(resolved_tenant_id)
        if smtp_config is None:
            logger.warning(
                f"SMTP not configured for tenant {resolved_tenant_id}, "
                f"skipping email to {user.email}. "
                "Configure it at Config > Notifications, or set "
                "SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD as a fallback."
            )
            return

        try:
            await self._send_via_smtp(smtp_config, user.email, subject, body)
            logger.info(f"Email sent successfully to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send email to {user.email}: {e}", exc_info=True)
            raise

    async def _send_sms(self, recipient_id: UUID, message: str) -> None:
        """Send SMS notification.

        Args:
            recipient_id: User ID
            message: SMS message

        Raises:
            ValueError: If user not found, has no phone, or SMS not configured
        """
        from app.core.config.service import ConfigService
        from app.repositories.user_repository import UserRepository

        # Get user
        user_repo = UserRepository(self.db)
        user = user_repo.get_by_id(recipient_id)
        if not user:
            raise ValueError(f"User {recipient_id} not found")

        # Get user phone number from contact methods
        from app.core.contacts.models import ContactMethodType, EntityType
        from app.repositories.contact_method_repository import ContactMethodRepository

        contact_repo = ContactMethodRepository(self.db)
        contact_methods = contact_repo.get_by_entity(
            entity_type=EntityType.USER, entity_id=recipient_id
        )

        # Find phone or mobile contact method
        phone = None
        for contact in contact_methods:
            method_type = (
                contact.method_type.value
                if hasattr(contact.method_type, "value")
                else contact.method_type
            )
            if method_type == ContactMethodType.MOBILE.value:  # type: ignore[comparison-overlap]
                phone = contact.value
                break
            elif method_type == ContactMethodType.PHONE.value and not phone:  # type: ignore[comparison-overlap]
                phone = contact.value

        if not phone:
            raise ValueError(f"User {recipient_id} has no phone number")

        # Get SMS configuration
        config_service = ConfigService(self.db, use_cache=True)
        tenant_id = user.tenant_id

        sms_enabled = config_service.get(
            tenant_id=tenant_id,
            module="notifications",
            key="channels.sms.enabled",
            default=False,
        )
        if not sms_enabled:
            logger.warning(
                f"SMS not enabled for tenant {tenant_id}, skipping SMS to {phone}"
            )
            return

        provider = config_service.get(
            tenant_id=tenant_id,
            module="notifications",
            key="channels.sms.provider",
            default="twilio",
        )
        account_sid = config_service.get(
            tenant_id=tenant_id,
            module="notifications",
            key="channels.sms.account_sid",
        )
        auth_token = config_service.get(
            tenant_id=tenant_id,
            module="notifications",
            key="channels.sms.auth_token",
        )
        from_number = config_service.get(
            tenant_id=tenant_id,
            module="notifications",
            key="channels.sms.from_number",
        )

        if not account_sid or not auth_token or not from_number:
            logger.warning(
                f"SMS not configured for tenant {tenant_id}, skipping SMS to {phone}"
            )
            return

        # Send SMS based on provider
        if provider.lower() == "twilio":
            await self._send_sms_twilio(
                account_sid, auth_token, from_number, phone, message
            )
        else:
            raise ValueError(f"Unsupported SMS provider: {provider}")

    async def _send_sms_twilio(
        self,
        account_sid: str,
        auth_token: str,
        from_number: str,
        to_number: str,
        message: str,
    ) -> None:
        """Send SMS using Twilio API.

        Args:
            account_sid: Twilio Account SID
            auth_token: Twilio Auth Token
            from_number: Twilio phone number to send from
            to_number: Recipient phone number
            message: SMS message body

        Raises:
            Exception: If SMS sending fails
        """
        import base64

        import httpx

        # Twilio API endpoint
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"

        # Basic auth with account_sid:auth_token
        auth_header = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()

        # Request payload
        payload = {
            "From": from_number,
            "To": to_number,
            "Body": message,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    data=payload,
                    headers={"Authorization": f"Basic {auth_header}"},
                )
                response.raise_for_status()
                logger.info(f"SMS sent successfully to {to_number} via Twilio")
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Twilio API error: {e.response.status_code} - {e.response.text}"
            )
            raise Exception(f"Failed to send SMS: {e.response.status_code}") from e
        except httpx.TimeoutException as e:
            logger.error(f"SMS sending timeout: {e}")
            raise Exception("SMS sending timeout") from e
        except Exception as e:
            logger.error(f"Failed to send SMS to {to_number}: {e}", exc_info=True)
            raise

    async def _send_whatsapp(
        self,
        recipient_id: UUID,
        subject: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        """Send WhatsApp notification via Evolution API.

        Args:
            recipient_id: User ID
            subject: Message subject (bold header)
            body: Message body
            data: Extra data including tenant_id for rate limiting

        Raises:
            ValueError: If user not found or has no phone number
            Exception: If WhatsApp sending fails
        """
        from app.core.config_file import get_settings
        from app.core.contacts.models import EntityType
        from app.core.integrations.service import IntegrationService
        from app.core.notifications.providers.evolution_api_provider import (
            EvolutionApiProvider,
        )
        from app.repositories.contact_method_repository import (
            ContactMethodRepository,
            resolve_channel_recipient,
        )
        from app.repositories.user_repository import UserRepository

        # Get user's WhatsApp recipient: prefer a dedicated WhatsApp
        # ContactMethod, fall back to Mobile/Phone since a dedicated WhatsApp
        # number is optional for internal users (many only ever set a plain
        # phone number). Previously this always used Mobile/Phone even when a
        # separate, real WhatsApp number was on file — found 2026-07-18
        # alongside the same bug in the CRM contact-message path.
        user_repo = UserRepository(self.db)
        user = user_repo.get_by_id(recipient_id)
        if not user:
            raise ValueError(f"User {recipient_id} not found")

        contact_repo = ContactMethodRepository(self.db)
        contact_methods = contact_repo.get_by_entity(
            entity_type=EntityType.USER, entity_id=recipient_id
        )
        phone = resolve_channel_recipient(
            contact_methods, "whatsapp", fallback_to_phone=True
        )

        if not phone:
            raise ValueError(f"User {recipient_id} has no phone number for WhatsApp")

        # Resolve WhatsApp credentials from the tenant's Evolution API
        # Integration (encrypted, per-tenant), never from global settings.
        whatsapp_creds = IntegrationService(self.db).get_whatsapp_credentials(
            user.tenant_id
        )
        if not whatsapp_creds or not whatsapp_creds.get("api_key"):
            logger.warning(
                "WhatsApp not configured for tenant %s, skipping send", user.tenant_id
            )
            return

        provider = EvolutionApiProvider(
            api_url=whatsapp_creds["api_url"],
            api_key=whatsapp_creds["api_key"],
            instance_name=whatsapp_creds["instance_name"],
            rate_limit_per_minute=get_settings().EVOLUTION_RATE_LIMIT_PER_MINUTE,
        )
        result = await provider.send(phone, subject, body, data)
        if not result.get("success"):
            raise Exception(f"WhatsApp send failed: {result.get('error')}")

    async def _send_telegram(
        self,
        recipient_id: UUID,
        message: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        """Send Telegram notification.

        Resolves the user's Telegram chat_id from channel_identities and the
        tenant's bot token from IntegrationService (encrypted per-tenant
        credentials, not ConfigService), then delegates to TelegramProvider.

        Args:
            recipient_id: Internal user UUID.
            message: Text to send.
            data: Extra data, must include ``tenant_id``.

        Raises:
            ValueError: If user not found or has no Telegram identity.
            Exception: If the Telegram send fails.
        """
        from app.core.integrations.models import ChannelIdentity
        from app.core.integrations.service import IntegrationService
        from app.core.notifications.providers.telegram_provider import TelegramProvider
        from app.repositories.user_repository import UserRepository

        user_repo = UserRepository(self.db)
        user = user_repo.get_by_id(recipient_id)
        if not user:
            raise ValueError(f"User {recipient_id} not found")

        # Resolve telegram chat_id from channel_identities
        identity = (
            self.db.query(ChannelIdentity)
            .filter(
                ChannelIdentity.tenant_id == user.tenant_id,
                ChannelIdentity.channel == "telegram",
                ChannelIdentity.user_id == user.id,
                ChannelIdentity.is_active.is_(True),
            )
            .first()
        )
        if not identity:
            raise ValueError(f"User {recipient_id} has no Telegram identity")

        chat_id: str = identity.channel_user_id

        # Resolve bot token from the tenant's Telegram Integration credentials
        integration_service = IntegrationService(self.db)
        credentials = integration_service.get_telegram_credentials(user.tenant_id)
        bot_token = (credentials or {}).get("bot_token")
        if not bot_token:
            logger.warning(
                "Telegram bot_token not configured for tenant %s, skipping send",
                user.tenant_id,
            )
            return

        provider = TelegramProvider(bot_token=bot_token)
        result = await provider.send(recipient=chat_id, subject=None, body=message)
        if result.get("status") != "sent":
            raise Exception(f"Telegram send failed: {result.get('error')}")

    async def _send_mattermost(
        self,
        recipient_id: UUID,
        message: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        """Send a Mattermost notification via the tenant's incoming webhook.

        Unlike Telegram/WhatsApp, this channel has no per-employee
        recipient concept — the webhook's configured target channel is the
        recipient, so no ChannelIdentity lookup applies.

        Args:
            recipient_id: Internal user UUID (used only to resolve tenant_id).
            message: Text to send.
            data: Unused.

        Raises:
            ValueError: If user not found.
            Exception: If the Mattermost send fails.
        """
        from app.core.integrations.service import IntegrationService
        from app.core.notifications.providers.mattermost_provider import (
            MattermostProvider,
        )
        from app.repositories.user_repository import UserRepository

        user_repo = UserRepository(self.db)
        user = user_repo.get_by_id(recipient_id)
        if not user:
            raise ValueError(f"User {recipient_id} not found")

        integration_service = IntegrationService(self.db)
        credentials = integration_service.get_mattermost_credentials(user.tenant_id)
        webhook_url = (credentials or {}).get("webhook_url")
        if not webhook_url:
            logger.warning(
                "Mattermost webhook_url not configured for tenant %s, skipping send",
                user.tenant_id,
            )
            return

        provider = MattermostProvider(
            webhook_url=webhook_url,
            channel=(credentials or {}).get("channel"),
            username=(credentials or {}).get("username"),
            icon_url=(credentials or {}).get("icon_url"),
        )
        result = await provider.send(recipient="", subject=None, body=message)
        if result.get("status") != "sent":
            raise Exception(f"Mattermost send failed: {result.get('error')}")

    async def _send_rocketchat(
        self,
        recipient_id: UUID,
        message: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        """Send a Rocket.Chat notification via the tenant's incoming webhook.

        Unlike Telegram/WhatsApp, this channel has no per-employee
        recipient concept — the webhook's configured target channel is the
        recipient, so no ChannelIdentity lookup applies.

        Args:
            recipient_id: Internal user UUID (used only to resolve tenant_id).
            message: Text to send.
            data: Unused.

        Raises:
            ValueError: If user not found.
            Exception: If the Rocket.Chat send fails.
        """
        from app.core.integrations.service import IntegrationService
        from app.core.notifications.providers.rocketchat_provider import (
            RocketChatProvider,
        )
        from app.repositories.user_repository import UserRepository

        user_repo = UserRepository(self.db)
        user = user_repo.get_by_id(recipient_id)
        if not user:
            raise ValueError(f"User {recipient_id} not found")

        integration_service = IntegrationService(self.db)
        credentials = integration_service.get_rocketchat_credentials(user.tenant_id)
        webhook_url = (credentials or {}).get("webhook_url")
        if not webhook_url:
            logger.warning(
                "Rocket.Chat webhook_url not configured for tenant %s, skipping send",
                user.tenant_id,
            )
            return

        provider = RocketChatProvider(
            webhook_url=webhook_url,
            channel=(credentials or {}).get("channel"),
            alias=(credentials or {}).get("alias"),
            avatar=(credentials or {}).get("avatar"),
        )
        result = await provider.send(recipient="", subject=None, body=message)
        if result.get("status") != "sent":
            raise Exception(f"Rocket.Chat send failed: {result.get('error')}")

    async def _send_webhook(self, url: str | None, payload: dict[str, Any]) -> None:
        """Send webhook notification.

        Args:
            url: Webhook URL
            payload: Payload to send

        Raises:
            ValueError: If URL is not provided
            Exception: If webhook sending fails
        """
        import httpx

        if not url:
            raise ValueError("Webhook URL is required")

        # Get webhook configuration for timeout
        from app.core.config.service import ConfigService

        # Try to get timeout from config (default: 30 seconds)
        timeout = 30.0
        try:
            # Get tenant_id from payload if available, otherwise use default
            tenant_id = payload.get("tenant_id")
            if tenant_id:
                config_service = ConfigService(self.db, use_cache=True)
                timeout = config_service.get(
                    tenant_id=tenant_id,
                    module="notifications",
                    key="channels.webhook.timeout",
                    default=30,
                )
                if (
                    not isinstance(timeout, (int, float))
                    or timeout <= 0
                    or timeout > 300
                ):
                    timeout = 30.0  # Safety: max 5 minutes
        except Exception:
            # If config lookup fails, use default
            pass

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                logger.info(f"Webhook sent successfully to {url}")
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Webhook HTTP error: {e.response.status_code} - {e.response.text}"
            )
            raise Exception(f"Failed to send webhook: {e.response.status_code}") from e
        except httpx.TimeoutException as e:
            logger.error(f"Webhook timeout: {e}")
            raise Exception("Webhook sending timeout") from e
        except httpx.ConnectError as e:
            logger.error(f"Webhook connection error: {e}")
            raise Exception("Failed to connect to webhook URL") from e
        except Exception as e:
            logger.error(f"Failed to send webhook to {url}: {e}", exc_info=True)
            raise
