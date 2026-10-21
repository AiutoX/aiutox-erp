"""Webhook handler for processing webhooks."""

import hashlib
import hmac
import json
import logging
from datetime import UTC
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.core.integrations.models import Webhook, WebhookDelivery, WebhookStatus
from app.core.pubsub import EventPublisher, get_event_publisher
from app.repositories.integration_repository import IntegrationRepository

logger = logging.getLogger(__name__)


class WebhookHandler:
    """Handler for processing and delivering webhooks."""

    def __init__(self, db: Session, event_publisher: EventPublisher | None = None):
        """Initialize webhook handler.

        Args:
            db: Database session
            event_publisher: EventPublisher instance (created if not provided)
        """
        self.db = db
        self.repository = IntegrationRepository(db)
        self.event_publisher = event_publisher or get_event_publisher()

    def _generate_signature(self, payload: str, secret: str) -> str:
        """Generate HMAC signature for webhook payload.

        Args:
            payload: Webhook payload as string
            secret: Secret key

        Returns:
            HMAC signature
        """
        return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

    def _matches_metadata_filters(
        self,
        webhook: "Webhook",
        metadata_filters: dict[str, Any] | None,
    ) -> bool:
        """Check if a webhook matches the given metadata filters.

        A webhook matches if:
        - No metadata_filters are specified (global match), OR
        - The webhook has no extra_data (no filter configured), OR
        - All keys in metadata_filters match the webhook's extra_data values.

        Args:
            webhook: Webhook to check
            metadata_filters: Filters to apply (e.g., {"form_id": "uuid"})

        Returns:
            True if the webhook should receive this event
        """
        if not metadata_filters:
            return True
        webhook_meta: dict[str, Any] = (
            webhook.extra_data if isinstance(webhook.extra_data, dict) else {}
        ) or {}
        for key, value in metadata_filters.items():
            webhook_value = webhook_meta.get(key)
            if webhook_value is not None and str(webhook_value) != str(value):
                return False
        return True

    async def trigger_webhook(
        self,
        tenant_id: UUID,
        event_type: str,
        payload: dict[str, Any],
        user_id: UUID | None = None,
        metadata_filters: dict[str, Any] | None = None,
    ) -> list[WebhookDelivery]:
        """Trigger webhooks for an event type.

        Args:
            tenant_id: Tenant ID
            event_type: Event type (e.g., 'product.created')
            payload: Webhook payload
            user_id: User ID who triggered the event (optional)
            metadata_filters: Optional filters to match against webhook.extra_data
                              (e.g., {"form_id": "uuid"} to target form-specific webhooks)

        Returns:
            List of WebhookDelivery objects
        """
        # Get all enabled webhooks for this event type
        webhooks = self.repository.get_webhooks_by_event(
            tenant_id, event_type, enabled_only=True
        )

        deliveries = []
        for webhook in webhooks:
            if not self._matches_metadata_filters(webhook, metadata_filters):
                continue
            delivery = await self._deliver_webhook(webhook, payload)
            deliveries.append(delivery)

        return deliveries

    async def _deliver_webhook(
        self, webhook: Webhook, payload: dict[str, Any]
    ) -> WebhookDelivery:
        """Deliver a webhook.

        Args:
            webhook: Webhook configuration
            payload: Webhook payload

        Returns:
            WebhookDelivery object
        """
        # Create delivery record
        delivery = self.repository.create_delivery(
            {
                "webhook_id": webhook.id,
                "tenant_id": webhook.tenant_id,
                "status": WebhookStatus.PENDING,
                "event_type": webhook.event_type,
                "payload": payload,
            }
        )

        try:
            # Prepare headers
            headers: dict[str, Any] = (
                webhook.headers if isinstance(webhook.headers, dict) else {}
            ) or {}
            headers.setdefault("Content-Type", "application/json")

            # Generate signature if secret is provided
            payload_json = json.dumps(payload)
            if webhook.secret:
                signature = self._generate_signature(payload_json, webhook.secret)
                headers["X-Webhook-Signature"] = f"sha256={signature}"

            # Send webhook
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(
                    method=webhook.method,
                    url=webhook.url,
                    headers=headers,
                    content=payload_json,
                )

            # Update delivery status
            delivery.status = (
                WebhookStatus.SENT if response.is_success else WebhookStatus.FAILED
            )
            delivery.response_status = response.status_code
            delivery.response_body = response.text[:1000]  # Limit response body size

            if not response.is_success:
                delivery.error_message = (
                    f"HTTP {response.status_code}: {response.text[:500]}"
                )

            from datetime import datetime

            delivery.sent_at = datetime.now(UTC)

        except Exception as e:
            logger.error(f"Failed to deliver webhook {webhook.id}: {e}")
            delivery.status = WebhookStatus.FAILED
            delivery.error_message = str(e)[:500]

        # Update delivery
        self.repository.update_delivery(
            UUID(str(delivery.id)),
            UUID(str(webhook.tenant_id)),
            {"status": delivery.status},
        )

        return delivery

    async def retry_failed_deliveries(self, tenant_id: UUID) -> int:
        """Retry failed webhook deliveries.

        Args:
            tenant_id: Tenant ID

        Returns:
            Number of deliveries retried
        """
        # Get failed deliveries that haven't exceeded max retries
        # This would require additional repository methods
        # For now, return 0 as placeholder
        logger.info(f"Retrying failed webhook deliveries for tenant {tenant_id}")
        return 0
