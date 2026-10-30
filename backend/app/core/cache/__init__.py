"""Cache module for Redis-based caching."""

from app.core.cache.cache_service import cache_service
from app.core.cache.calendar_cache import CalendarCache, get_calendar_cache


# task_cache_service is lazily imported to avoid circular dependency with tasks module
def __getattr__(name):
    """Lazy load task_cache_service."""
    if name == "task_cache_service":
        from app.core.cache.task_cache_service import task_cache_service

        return task_cache_service
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = ["cache_service", "CalendarCache", "get_calendar_cache", "task_cache_service"]
