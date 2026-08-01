"""CapabilityRegistry — discovers, upserts, and caches AI capabilities from enabled modules."""

import importlib
import logging
import threading
import time
from typing import TYPE_CHECKING, Any

from sqlalchemy.orm import Session

from app.core.automation.ai.capability_decorator import CapabilityDescriptor
from app.core.automation.ai.models import AICapabilityRegistration
from app.core.module_registry import get_module_registry

if TYPE_CHECKING:
    from app.core.automation.ai.provider import LLMProvider

logger = logging.getLogger(__name__)


class CapabilityRegistry:
    def __init__(self, cache_ttl_seconds: float = 300.0) -> None:
        self._lock = threading.RLock()
        self._capabilities: dict[str, CapabilityDescriptor] = {}
        self._cache_ttl = cache_ttl_seconds
        self._cache: dict[str, tuple[float, Any]] = {}
        self._cache_hits: dict[str, int] = {
            "all_active": 0,
            "by_qualified_name": 0,
            "keyword_map": 0,
        }
        self._cache_misses: dict[str, int] = {
            "all_active": 0,
            "by_qualified_name": 0,
            "keyword_map": 0,
        }

    def _get_cached(self, key: str, stat_key: str | None = None) -> Any | None:
        """Get value from cache if valid, None otherwise."""
        if stat_key is None:
            stat_key = key
        if self._cache_ttl <= 0:
            return None
        if key in self._cache:
            timestamp, value = self._cache[key]
            if time.time() - timestamp < self._cache_ttl:
                self._cache_hits[stat_key] = self._cache_hits.get(stat_key, 0) + 1
                return value
            else:
                del self._cache[key]
        self._cache_misses[stat_key] = self._cache_misses.get(stat_key, 0) + 1
        return None

    def _set_cached(self, key: str, value: Any) -> None:
        """Set value in cache with current timestamp."""
        if self._cache_ttl > 0:
            self._cache[key] = (time.time(), value)

    def _invalidate_cache(self) -> None:
        """Invalidate all cached values."""
        self._cache.clear()
        self._cache_hits = {k: 0 for k in self._cache_hits}
        self._cache_misses = {k: 0 for k in self._cache_misses}

    def refresh(self) -> None:
        """Force cache invalidation."""
        with self._lock:
            self._invalidate_cache()

    def get_cache_stats(self) -> dict:
        """Get cache statistics for monitoring."""
        return {
            "all_active": {
                "hits": self._cache_hits.get("all_active", 0),
                "misses": self._cache_misses.get("all_active", 0),
            },
            "by_qualified_name": {
                "hits": self._cache_hits.get("by_qualified_name", 0),
                "misses": self._cache_misses.get("by_qualified_name", 0),
            },
            "keyword_map": {
                "hits": self._cache_hits.get("keyword_map", 0),
                "misses": self._cache_misses.get("keyword_map", 0),
            },
        }

    async def scan(self, db: Session, provider: "LLMProvider | None" = None) -> int:
        """Scan enabled modules for @agent_capability-decorated functions.

        Imports each module's ai/capabilities.py without coupling to module internals.
        Upserts discovered capabilities to ai_capability_registrations.
        Generates embeddings for new/changed capabilities when a provider is supplied.
        Marks capabilities absent from the scan as inactive.
        Raises ValueError if a Phase 1 guard violation is detected (non-conversational type).
        Returns the count of discovered capabilities.
        """
        registry = get_module_registry()
        all_modules = registry.get_all_modules()  # dict[str, ModuleInterface]
        enabled_slugs = [
            module_id
            for module_id in all_modules
            if registry.is_module_enabled(module_id)
        ]

        found: list[CapabilityDescriptor] = []
        for module_slug in enabled_slugs:
            try:
                mod = importlib.import_module(
                    f"app.modules.{module_slug}.ai.capabilities"
                )
                for attr in vars(mod).values():
                    if hasattr(attr, "__agent_capability__"):
                        descriptor: CapabilityDescriptor = attr.__agent_capability__
                        found.append(descriptor)
            except ModuleNotFoundError:
                logger.info(
                    "No ai/capabilities.py for module %s — skipping", module_slug
                )

        # Mark all existing DB registrations inactive; re-activate found ones
        db.query(AICapabilityRegistration).update({"is_active": False})
        db.flush()

        # Capabilities that need embeddings generated (new or description changed)
        needs_embedding: list[tuple[CapabilityDescriptor, AICapabilityRegistration]] = (
            []
        )

        for desc in found:
            self._capabilities[desc.qualified_name] = desc
            existing = (
                db.query(AICapabilityRegistration)
                .filter_by(qualified_name=desc.qualified_name)
                .first()
            )
            if existing:
                description_changed = existing.description != desc.description
                existing.description = desc.description
                existing.aliases = desc.aliases
                existing.examples = desc.examples
                existing.parameters_schema = desc.parameters_schema
                existing.is_active = True
                if description_changed or existing.embedding is None:
                    needs_embedding.append((desc, existing))
            else:
                row = AICapabilityRegistration(
                    module_name=desc.module_name,
                    capability_name=desc.capability_name,
                    qualified_name=desc.qualified_name,
                    description=desc.description,
                    permission_required=desc.permission_required,
                    capability_type=desc.capability_type,
                    parameters_schema=desc.parameters_schema,
                    aliases=desc.aliases,
                    examples=desc.examples,
                    is_active=True,
                )
                db.add(row)
                db.flush()
                needs_embedding.append((desc, row))

        # Generate embeddings in batch when provider supports it
        if needs_embedding and provider is not None:
            try:
                from app.core.automation.ai.models import AILLMProviderConfig

                config: AILLMProviderConfig | None = (
                    db.query(AILLMProviderConfig)
                    .filter(AILLMProviderConfig.is_active == True)  # noqa: E712
                    .first()
                )
                embedding_model = config.model_embeddings if config else None
                if embedding_model:
                    texts = [desc.description for desc, _ in needs_embedding]
                    vectors = await provider.embed(texts, model=embedding_model)
                    for (_, row), vec in zip(needs_embedding, vectors):
                        row.embedding = vec  # type: ignore[assignment]
                    logger.info(
                        "Generated embeddings for %d capabilities", len(needs_embedding)
                    )
            except Exception as exc:
                # E-06: embedding generation failure must not block startup
                logger.warning(
                    "Embedding generation failed (%s); capabilities registered without embeddings",
                    exc,
                )

        db.commit()
        self._invalidate_cache()
        return len(found)

    def _register(self, desc: CapabilityDescriptor) -> None:
        self._capabilities[desc.qualified_name] = desc
        self._invalidate_cache()

    def all_active(self) -> list[CapabilityDescriptor]:
        with self._lock:
            cached = self._get_cached("all_active")
            if cached is not None:
                return cached
            result = list(self._capabilities.values())
            self._set_cached("all_active", result)
            return result

    def get(self, name: str) -> CapabilityDescriptor | None:
        """Look up a capability by short name (e.g. 'get_overdue_tasks')."""
        with self._lock:
            for desc in self._capabilities.values():
                if desc.capability_name == name:
                    return desc
            return None

    def by_qualified_name(self, qn: str) -> CapabilityDescriptor | None:
        with self._lock:
            cache_key = f"by_qualified_name:{qn}"
            cached = self._get_cached(cache_key, stat_key="by_qualified_name")
            if cached is not None:
                return cached
            result = self._capabilities.get(qn)
            self._set_cached(cache_key, result)
            return result

    def keyword_map(self) -> dict[str, str]:
        with self._lock:
            cached = self._get_cached("keyword_map")
            if cached is not None:
                return cached
            result: dict[str, str] = {}
            for desc in self._capabilities.values():
                for alias in desc.aliases:
                    result[alias] = desc.qualified_name
            self._set_cached("keyword_map", result)
            return result

    def semantic_search(
        self,
        db: Session,
        query_embedding: list[float],
        *,
        top_n: int = 10,
    ) -> list[tuple[CapabilityDescriptor, float]]:
        """Cosine similarity search over ai_capability_registrations.embedding via pgvector.

        Falls back to returning all active capabilities (score=1.0) when pgvector is
        unavailable or no capabilities have embeddings yet (E-06 compliance).
        """
        try:
            from pgvector.sqlalchemy import Vector
            from sqlalchemy import cast, func

            vec_col = AICapabilityRegistration.embedding
            rows = (
                db.query(
                    AICapabilityRegistration,
                    (
                        1
                        - func.cosine_distance(
                            vec_col, cast(query_embedding, Vector(1536))
                        )
                    ).label("score"),
                )
                .filter(AICapabilityRegistration.is_active == True)  # noqa: E712
                .filter(vec_col != None)  # noqa: E711
                .order_by(
                    func.cosine_distance(vec_col, cast(query_embedding, Vector(1536)))
                )
                .limit(top_n)
                .all()
            )
            results: list[tuple[CapabilityDescriptor, float]] = []
            for row, score in rows:
                desc = self._capabilities.get(row.qualified_name)
                if desc is not None:
                    results.append((desc, float(score)))
            if results:
                return results
        except Exception as exc:
            logger.debug("pgvector semantic_search failed, using fallback: %s", exc)

        # Fallback: no embeddings or pgvector unavailable
        return [(d, 1.0) for d in self.all_active()][:top_n]


capability_registry = CapabilityRegistry()
