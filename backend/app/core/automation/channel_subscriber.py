"""ChannelSubscriber — routes inbound channel messages to ConversationEngine (P3-A01)."""

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.automation.ai.conversation_engine import ConversationEngine
from app.core.automation.ai.repository import AIRepository
from app.core.automation.ai.schemas import ERPContext
from app.core.config_file import get_settings
from app.core.notifications.service import NotificationService
from app.core.pubsub import EventConsumer
from app.core.pubsub.client import RedisStreamsClient
from app.core.pubsub.models import Event
from app.core.users.models import User

logger = logging.getLogger(__name__)

CHANNEL_SUBSCRIBER_GROUP = "channel-subscriber"
CHANNEL_SUBSCRIBER_CONSUMER = "channel-subscriber-1"

_ERROR_REPLY = (
    "Sorry, I encountered an error processing your message. Please try again."
)
_UNKNOWN_SENDER_MSG = (
    "I don't recognize your account. Please contact your administrator to link "
    "your Telegram to your ERP account."
)


class ChannelSubscriber:
    """Subscribes to message.received events and routes them to ConversationEngine."""

    def __init__(
        self,
        db: Session,
        notification_service: NotificationService | None = None,
        engine: ConversationEngine | None = None,
        redis: Any | None = None,
        event_consumer: EventConsumer | None = None,
    ) -> None:
        self._db = db
        self._notification_service = notification_service or NotificationService(db)
        self._engine = engine or ConversationEngine()
        self._redis = redis
        self._running = False

        if event_consumer is None:
            settings = get_settings()
            client = RedisStreamsClient(
                redis_url=settings.REDIS_URL, password=settings.REDIS_PASSWORD
            )
            event_consumer = EventConsumer(client=client)
        self._consumer = event_consumer

    async def start(self) -> None:
        if self._running:
            logger.warning("ChannelSubscriber is already running")
            return
        self._running = True
        settings = get_settings()
        await self._consumer.subscribe(
            group_name=CHANNEL_SUBSCRIBER_GROUP,
            consumer_name=CHANNEL_SUBSCRIBER_CONSUMER,
            event_types=["message.received"],
            callback=self._handle_event,
            stream_name=settings.REDIS_STREAM_DOMAIN,
        )
        logger.info("ChannelSubscriber started — listening for message.received events")

    async def stop(self) -> None:
        self._running = False
        logger.info("ChannelSubscriber stopped")

    async def _handle_event(self, event: Event) -> None:
        try:
            metadata: dict[str, Any] = (
                event.metadata.additional_data if event.metadata else {}
            )
            channel: str = metadata.get("channel", "telegram")
            channel_user_id: str | None = metadata.get("channel_user_id")
            text: str = metadata.get("text", "")

            if event.user_id is None:
                logger.warning(
                    "message.received from unknown sender (channel=%s, channel_user_id=%s) "
                    "— no ERP user linked. Skipping ConversationEngine. "
                    "TODO P3-I04: add send_to_channel_user() for unregistered senders.",
                    channel,
                    channel_user_id,
                )
                # Full onboarding message delivery requires a future provider-level
                # send_to_channel_user() primitive (not yet available before P3-I04 lands).
                return

            user: User | None = (
                self._db.query(User)
                .filter(User.id == event.user_id)
                .filter(User.tenant_id == event.tenant_id)
                .first()
            )
            if user is None:
                logger.warning(
                    "message.received: user_id=%s not found in tenant=%s, skipping",
                    event.user_id,
                    event.tenant_id,
                )
                return

            repo = AIRepository(self._db)
            conv = repo.get_conversation_by_channel(
                tenant_id=event.tenant_id,
                user_id=event.user_id,
                channel=channel,
            )
            if conv is None:
                conv = repo.create_conversation(
                    tenant_id=event.tenant_id,
                    user_id=event.user_id,
                    channel=channel,
                )
                self._db.commit()

            erp_context = ERPContext()

            try:
                reply_parts: list[str] = []
                async for chunk in self._engine.chat(
                    db=self._db,
                    current_user=user,
                    message=text,
                    conversation_id=UUID(str(conv.id)),
                    erp_context=erp_context,
                    redis=self._redis,
                    channel=channel,
                ):
                    if chunk.get("type") == "text_delta" and chunk.get("delta"):
                        reply_parts.append(chunk["delta"])

                reply = "".join(reply_parts).strip() or "..."
            except Exception as exc:
                logger.error(
                    "ConversationEngine error for user=%s channel=%s: %s",
                    event.user_id,
                    channel,
                    exc,
                    exc_info=True,
                )
                reply = _ERROR_REPLY

            await self._notification_service.send(
                event_type="ai.reply",
                recipient_id=UUID(str(user.id)),
                channels=[channel],
                data={
                    "text": reply,
                    "channel_user_id": channel_user_id,
                },
                tenant_id=event.tenant_id,
            )

        except Exception as exc:
            logger.error(
                "ChannelSubscriber._handle_event unhandled error: %s",
                exc,
                exc_info=True,
            )
