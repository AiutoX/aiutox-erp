"""aiutox_sdk.pubsub — re-exports of app.core.pubsub public surface.

Provides event publishing/consuming primitives for business modules.
"""

from app.core.pubsub import get_event_publisher, publish_fire_and_forget
from app.core.pubsub.client import RedisStreamsClient
from app.core.pubsub.consumer import EventConsumer
from app.core.pubsub.errors import (
    ConsumeError,
    PublishError,
    PubSubError,
)
from app.core.pubsub.models import Event, EventMetadata
from app.core.pubsub.publisher import EventPublisher
from app.core.pubsub.redis_event_bus import RedisEventBus, get_redis_event_bus

__all__ = [
    "EventPublisher",
    "EventConsumer",
    "Event",
    "EventMetadata",
    "PubSubError",
    "PublishError",
    "ConsumeError",
    "RedisEventBus",
    "RedisStreamsClient",
    "get_redis_event_bus",
    "get_event_publisher",
    "publish_fire_and_forget",
]
