import logging
from uuid import UUID

from app.core.pubsub.models import EventMetadata
from app.core.pubsub.publisher import EventPublisher

logger = logging.getLogger(__name__)

_SOURCE = "automation2.ai"
_VERSION = "1.0"


async def publish_conversation_started(
    publisher: EventPublisher,
    *,
    conversation_id: UUID,
    tenant_id: UUID,
    user_id: UUID,
    channel: str,
) -> None:
    try:
        meta = EventMetadata(
            source=_SOURCE,
            version=_VERSION,
            additional_data={"channel": channel},
        )
        await publisher.publish(
            "ai.conversation.started",
            entity_type="ai_conversation",
            entity_id=conversation_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata=meta,
        )
    except Exception as exc:
        logger.warning("Failed to publish ai.conversation.started: %s", exc)


async def publish_capability_executed(
    publisher: EventPublisher,
    *,
    conversation_id: UUID,
    capability_name: str,
    tenant_id: UUID,
    user_id: UUID,
    execution_time_ms: float,
    token_count: int,
    cost_usd: float,
) -> None:
    try:
        meta = EventMetadata(
            source=_SOURCE,
            version=_VERSION,
            additional_data={
                "capability_name": capability_name,
                "execution_time_ms": execution_time_ms,
                "token_count": token_count,
                "cost_usd": cost_usd,
            },
        )
        await publisher.publish(
            "ai.capability.executed",
            entity_type="ai_capability",
            entity_id=conversation_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata=meta,
        )
    except Exception as exc:
        logger.warning("Failed to publish ai.capability.executed: %s", exc)


async def publish_capability_failed(
    publisher: EventPublisher,
    *,
    conversation_id: UUID,
    capability_name: str,
    tenant_id: UUID,
    user_id: UUID,
    error: str,
) -> None:
    try:
        meta = EventMetadata(
            source=_SOURCE,
            version=_VERSION,
            additional_data={"capability_name": capability_name, "error": error},
        )
        await publisher.publish(
            "ai.capability.failed",
            entity_type="ai_capability",
            entity_id=conversation_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata=meta,
        )
    except Exception as exc:
        logger.warning("Failed to publish ai.capability.failed: %s", exc)


async def publish_conversation_archived(
    publisher: EventPublisher,
    *,
    conversation_id: UUID,
    tenant_id: UUID,
    user_id: UUID,
) -> None:
    try:
        meta = EventMetadata(source=_SOURCE, version=_VERSION)
        await publisher.publish(
            "ai.conversation.archived",
            entity_type="ai_conversation",
            entity_id=conversation_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata=meta,
        )
    except Exception as exc:
        logger.warning("Failed to publish ai.conversation.archived: %s", exc)
