"""Redis cache implementation for the catalogs module.

This module provides an optional, fail-open caching layer for resolved
tenant catalog item lists, to reduce database queries on high-traffic
catalog reads (e.g. form dropdowns).

Cache Strategy:
- Cache key pattern: "catalogs:{tenant_id}:{list_key}"
- TTL: 300 seconds (5 minutes) by default
- Two generation counters qualify each entry: the list's
  ("catalogs:gen:{list_key}") and the tenant's copy of it
  ("catalogs:gen:{list_key}:{tenant_id}"). An entry stores both as they were
  read BEFORE its data was read; if either has moved since, it is a miss
- Invalidation: a single tenant's list is one INCR of that tenant's
  generation (plus a DELETE to free the entry); every tenant's list is one
  INCR of the list's generation (no SCAN of the keyspace)

Every public method is fail-open: any Redis connection or data error is
logged and swallowed, never raised. Callers can always treat a failure the
same as a cache miss / no-op invalidation.
"""

import json
import logging
from typing import Any, cast
from uuid import UUID

import redis
from redis.exceptions import ConnectionError, RedisError

from app.core.config_file import Settings

logger = logging.getLogger(__name__)


class CatalogCache:
    """Redis cache for resolved tenant catalog item lists."""

    def __init__(self, enabled: bool = True, ttl: int = 300):
        """Initialize catalog cache.

        Args:
            enabled: Whether caching is enabled (default: True)
            ttl: Time-to-live for cached values in seconds (default: 300 = 5 minutes)
        """
        self.enabled = enabled
        self.ttl = ttl
        self._redis_client: redis.Redis | None = None
        self._connection_attempted = False

        if self.enabled:
            self._initialize_redis()

    def _initialize_redis(self) -> None:
        """Initialize Redis connection."""
        if self._connection_attempted:
            return

        self._connection_attempted = True
        try:
            settings = Settings()
            self._redis_client = redis.from_url(
                settings.REDIS_URL,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            # Test connection
            self._redis_client.ping()
            logger.info("Catalog cache: Redis connected successfully")
        except (ConnectionError, RedisError) as e:
            logger.warning(
                f"Catalog cache: Failed to connect to Redis: {e}. "
                "Caching is disabled. Catalogs will work without cache."
            )
            self._redis_client = None
            self.enabled = False

    def _make_key(self, tenant_id: UUID, list_key: str) -> str:
        """Generate cache key for a tenant's resolved list.

        Args:
            tenant_id: Tenant ID
            list_key: Catalog list key

        Returns:
            Cache key string
        """
        return f"catalogs:{tenant_id}:{list_key}"

    def _make_generation_key(self, list_key: str) -> str:
        """Generate the key of a list's generation counter.

        Bumping it invalidates every tenant's cached copy of the list at once.

        Args:
            list_key: Catalog list key

        Returns:
            Generation counter key string
        """
        return f"catalogs:gen:{list_key}"

    def _make_tenant_generation_key(self, tenant_id: UUID, list_key: str) -> str:
        """Generate the key of one tenant's generation counter for a list.

        Bumping it invalidates only that tenant's cached copy of the list.

        Args:
            tenant_id: Tenant ID
            list_key: Catalog list key

        Returns:
            Tenant generation counter key string
        """
        return f"catalogs:gen:{list_key}:{tenant_id}"

    def get(self, tenant_id: UUID, list_key: str) -> list[dict[str, Any]] | None:
        """Get a tenant's cached resolved catalog items.

        Args:
            tenant_id: Tenant ID
            list_key: Catalog list key

        Returns:
            Cached items or None if not found/cache disabled/on error
        """
        if not self.enabled or not self._redis_client:
            return None

        try:
            cached_value, generation, tenant_generation = (
                self._redis_client.mget(  # type: ignore[misc]
                    [
                        self._make_key(tenant_id, list_key),
                        self._make_generation_key(list_key),
                        self._make_tenant_generation_key(tenant_id, list_key),
                    ]
                )
            )

            if cached_value is None:
                return None

            payload = json.loads(cached_value)
            if (
                not isinstance(payload, dict)
                or payload.get("generation") != int(generation or 0)
                or payload.get("tenant_generation") != int(tenant_generation or 0)
            ):
                # Written before the last all-tenant or per-tenant
                # invalidation (or in an older shape): a miss.
                return None
            return cast(list[dict[str, Any]], payload.get("items"))
        except (RedisError, ValueError) as e:
            logger.warning(f"Catalog cache: Failed to get value: {e}")
            return None

    def get_generations(self, tenant_id: UUID, list_key: str) -> tuple[int, int] | None:
        """Read ``(list generation, tenant generation)`` in one round trip.

        Both are 0 until first invalidated. A writer reads them BEFORE reading
        the data it will cache and passes them to ``set``: an all-tenant or
        per-tenant invalidation that lands in between then leaves the new
        entry already stale, instead of storing pre-change data under the
        post-change generations (reviews N-4, R2-4).

        Args:
            tenant_id: Tenant ID
            list_key: Catalog list key

        Returns:
            The two generations, or None if the cache is disabled or on error
        """
        if not self.enabled or not self._redis_client:
            return None

        try:
            generation, tenant_generation = self._redis_client.mget(  # type: ignore[misc]
                [
                    self._make_generation_key(list_key),
                    self._make_tenant_generation_key(tenant_id, list_key),
                ]
            )
            return int(generation or 0), int(tenant_generation or 0)
        except (RedisError, ValueError) as e:
            logger.warning(f"Catalog cache: Failed to get generations: {e}")
            return None

    def set(
        self,
        tenant_id: UUID,
        list_key: str,
        items: list[dict[str, Any]],
        ttl: int = 300,
        generation: tuple[int, int] | None = None,
    ) -> None:
        """Cache a tenant's resolved catalog items.

        Args:
            tenant_id: Tenant ID
            list_key: Catalog list key
            items: Resolved items to cache
            ttl: TTL in seconds (default: 300 = 5 minutes)
            generation: The ``(list, tenant)`` generations read
                (``get_generations``) before ``items`` were read from the
                database. When None, the current ones are read now, which can
                mislabel data read before a concurrent invalidation.
        """
        if not self.enabled or not self._redis_client:
            return

        try:
            cache_key = self._make_key(tenant_id, list_key)
            if generation is None:
                generation = self.get_generations(tenant_id, list_key)
                if generation is None:
                    return
            list_generation, tenant_generation = generation
            serialized_value = json.dumps(
                {
                    "generation": list_generation,
                    "tenant_generation": tenant_generation,
                    "items": items,
                }
            )
            self._redis_client.setex(cache_key, ttl, serialized_value)
        except (RedisError, TypeError, ValueError) as e:
            logger.warning(f"Catalog cache: Failed to set value: {e}")

    def invalidate(self, list_key: str, tenant_id: UUID | None = None) -> None:
        """Invalidate cached catalog items for a list.

        Args:
            list_key: Catalog list key
            tenant_id: If given, invalidate only that tenant's cached copy.
                If None, invalidate every tenant's cached copy of this list
                (e.g. after a governance change or a sync).
        """
        if not self.enabled or not self._redis_client:
            return

        if tenant_id is not None:
            try:
                # The INCR is what makes a racing writer's entry stale (R2-4);
                # the DELETE only frees the current entry early.
                self._redis_client.incr(
                    self._make_tenant_generation_key(tenant_id, list_key)
                )
                self._redis_client.delete(self._make_key(tenant_id, list_key))
            except RedisError as e:
                logger.warning(f"Catalog cache: Failed to invalidate key: {e}")
            return

        try:
            self._redis_client.incr(self._make_generation_key(list_key))
        except RedisError as e:
            logger.warning(f"Catalog cache: Failed to invalidate list: {e}")


# Singleton instance
_cache_instance: CatalogCache | None = None


def get_catalog_cache(enabled: bool = True, ttl: int = 300) -> CatalogCache:
    """Get or create CatalogCache singleton instance.

    Args:
        enabled: Whether caching is enabled
        ttl: Time-to-live for cached values in seconds

    Returns:
        CatalogCache instance
    """
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CatalogCache(enabled=enabled, ttl=ttl)
    return _cache_instance
