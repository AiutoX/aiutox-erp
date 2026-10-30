"""Task cache service for Redis caching of task operations."""

import json
from typing import Any
from uuid import UUID

import redis.asyncio as redis

from app.core.config_file import get_settings
from app.schemas.task import TaskResponse


class TaskCacheService:
    """Service for caching task operations using Redis."""

    def __init__(self):
        """Initialize cache service with Redis connection."""
        self.settings = get_settings()
        self.redis_client: redis.Redis | None = None
        self.default_ttl = 300  # 5 minutes

    async def connect(self) -> None:
        """Connect to Redis."""
        if not self.redis_client and self.settings.REDIS_URL:
            self.redis_client = redis.from_url(
                self.settings.REDIS_URL, encoding="utf-8", decode_responses=True
            )

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None

    async def get_task(self, task_id: UUID) -> TaskResponse | None:
        """Get cached task by ID."""
        if not self.redis_client:
            return None

        try:
            await self.connect()
            data = await self.redis_client.get(f"task:{task_id}")
            if data:
                return TaskResponse.model_validate_json(data)
        except Exception:
            pass
        return None

    async def set_task(
        self, task_id: UUID, task: TaskResponse, ttl: int | None = None
    ) -> None:
        """Set task cache."""
        if not self.redis_client:
            return

        try:
            await self.connect()
            await self.redis_client.setex(
                f"task:{task_id}", ttl or self.default_ttl, task.model_dump_json()
            )
        except Exception:
            pass

    async def invalidate_task(self, task_id: UUID) -> None:
        """Invalidate task cache."""
        if not self.redis_client:
            return

        try:
            await self.connect()
            await self.redis_client.delete(f"task:{task_id}")
        except Exception:
            pass

    async def get_user_tasks(
        self, user_id: UUID, filters: dict | None = None
    ) -> list[dict] | None:
        """Get cached user tasks."""
        if not self.redis_client:
            return None

        try:
            await self.connect()
            cache_key = f"user_tasks:{user_id}"
            if filters:
                cache_key += f":{hash(json.dumps(filters, sort_keys=True))}"
            data = await self.redis_client.get(cache_key)
            if data:
                return json.loads(data)
        except Exception:
            pass
        return None

    async def set_user_tasks(
        self,
        user_id: UUID,
        tasks: list[dict],
        filters: dict | None = None,
        ttl: int | None = None,
    ) -> None:
        """Set user tasks cache."""
        if not self.redis_client:
            return

        try:
            await self.connect()
            cache_key = f"user_tasks:{user_id}"
            if filters:
                cache_key += f":{hash(json.dumps(filters, sort_keys=True))}"
            await self.redis_client.setex(
                cache_key, ttl or self.default_ttl, json.dumps(tasks)
            )
        except Exception:
            pass

    async def invalidate_user_cache(self, user_id: UUID) -> None:
        """Invalidate all user-related task cache."""
        if not self.redis_client:
            return

        try:
            await self.connect()
            pattern = f"user_tasks:{user_id}:*"
            keys = await self.redis_client.keys(pattern)
            if keys:
                await self.redis_client.delete(*keys)
        except Exception:
            pass

    async def invalidate_task_cache(
        self, tenant_id: UUID, task_id: UUID | None = None
    ) -> None:
        """Invalidate task cache."""
        if not self.redis_client:
            return

        try:
            await self.connect()
            if task_id:
                await self.redis_client.delete(f"task:{task_id}")
            else:
                # Invalidate all tenant tasks
                pattern = "task:*"
                keys = await self.redis_client.keys(pattern)
                if keys:
                    await self.redis_client.delete(*keys)
        except Exception:
            pass

    async def get_cache_stats(self) -> dict[str, Any]:
        """Get cache statistics."""
        if not self.redis_client:
            return {"connected": False}

        try:
            await self.connect()
            info = await self.redis_client.info()
            return {
                "connected": True,
                "used_memory": info.get("used_memory_human", "unknown"),
                "connected_clients": info.get("connected_clients", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
            }
        except Exception:
            return {"connected": False}


# Global instance
task_cache_service = TaskCacheService()
