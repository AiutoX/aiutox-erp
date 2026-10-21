"""Redis cache implementation for the reference_data module.

This module provides an optional, fail-open caching layer for resolved
reference data lookups (countries, currencies, languages, admin divisions),
to reduce database queries on high-traffic reads (e.g. form dropdowns).

Cache Strategy:
- Cache key pattern: "reference:{dataset}:{params_hash}"
- TTL: 86400 seconds (24 hours) by default -- reference data changes rarely
- Invalidation: the whole ``reference:*`` namespace at once, after any
  dataset sync (ISSUE-025 does not need narrower per-dataset invalidation)

Every public method is fail-open: any Redis connection or data error is
logged and swallowed, never raised. Callers can always treat a failure the
same as a cache miss / no-op invalidation.

Modeled on ``app.core.config.cache.ConfigCache`` and mirrors
``app.core.catalogs.cache.CatalogCache``'s fail-open pattern, but does not
import from ``app.core.catalogs`` -- the two packages stay siblings.
"""

import json
import logging
from typing import Any

import redis
from redis.exceptions import ConnectionError, RedisError

from app.core.config_file import Settings

logger = logging.getLogger(__name__)


class ReferenceCache:
    """Redis cache for resolved reference data lookups."""

    def __init__(self, enabled: bool = True, ttl: int = 86400):
        """Initialize reference cache.

        Args:
            enabled: Whether caching is enabled (default: True)
            ttl: Default time-to-live for cached values in seconds
                (default: 86400 = 24 hours)
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
            logger.info("Reference cache: Redis connected successfully")
        except (ConnectionError, RedisError) as e:
            logger.warning(
                f"Reference cache: Failed to connect to Redis: {e}. "
                "Caching is disabled. Reference data will work without cache."
            )
            self._redis_client = None
            self.enabled = False

    def _make_key(self, dataset: str, params_hash: str) -> str:
        """Generate cache key for a dataset lookup.

        Args:
            dataset: Reference dataset name (e.g. "countries").
            params_hash: Hash of the lookup parameters.

        Returns:
            Cache key string.
        """
        return f"reference:{dataset}:{params_hash}"

    def get(self, dataset: str, params_hash: str) -> Any | None:
        """Get a cached reference data value.

        Args:
            dataset: Reference dataset name.
            params_hash: Hash of the lookup parameters.

        Returns:
            Cached value or None if not found/cache disabled/on error.
        """
        if not self.enabled or not self._redis_client:
            return None

        try:
            cache_key = self._make_key(dataset, params_hash)
            cached_value = self._redis_client.get(cache_key)

            if cached_value is not None:
                return json.loads(cached_value)  # type: ignore[arg-type]

            return None
        except (RedisError, json.JSONDecodeError) as e:
            logger.warning(f"Reference cache: Failed to get value: {e}")
            return None

    def set(self, dataset: str, params_hash: str, value: Any, ttl: int = 86400) -> None:
        """Cache a reference data value.

        Args:
            dataset: Reference dataset name.
            params_hash: Hash of the lookup parameters.
            value: Value to cache (must be JSON-serializable).
            ttl: TTL in seconds (default: 86400 = 24 hours).
        """
        if not self.enabled or not self._redis_client:
            return

        try:
            cache_key = self._make_key(dataset, params_hash)
            serialized_value = json.dumps(value)
            self._redis_client.setex(cache_key, ttl, serialized_value)
        except (RedisError, TypeError, ValueError) as e:
            logger.warning(f"Reference cache: Failed to set value: {e}")

    def invalidate_all(self) -> None:
        """Invalidate every cached reference data entry (pattern ``reference:*``).

        Called after any dataset sync that wrote changes: a single dataset
        change invalidates the whole namespace, since narrower per-dataset
        invalidation is not required here.
        """
        if not self.enabled or not self._redis_client:
            return

        try:
            keys_to_delete = []
            cursor = 0
            while True:
                cursor, keys = self._redis_client.scan(  # type: ignore[misc]
                    cursor=cursor, match="reference:*", count=100
                )
                keys_to_delete.extend(keys)
                if cursor == 0:
                    break

            if keys_to_delete:
                self._redis_client.delete(*keys_to_delete)
        except RedisError as e:
            logger.warning(f"Reference cache: Failed to invalidate all: {e}")


# Singleton instance
_cache_instance: ReferenceCache | None = None


def get_reference_cache(enabled: bool = True, ttl: int = 86400) -> ReferenceCache:
    """Get or create ReferenceCache singleton instance.

    Args:
        enabled: Whether caching is enabled
        ttl: Default time-to-live for cached values in seconds

    Returns:
        ReferenceCache instance
    """
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = ReferenceCache(enabled=enabled, ttl=ttl)
    return _cache_instance
