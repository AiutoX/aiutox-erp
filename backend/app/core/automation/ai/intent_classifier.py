import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.core.automation.ai.capability_decorator import CapabilityDescriptor
from app.core.automation.ai.schemas import ERPContext

if TYPE_CHECKING:
    from app.core.automation.ai.capability_registry import CapabilityRegistry
    from app.core.automation.ai.provider import LLMProvider

logger = logging.getLogger(__name__)

HIGH_CONFIDENCE = 0.85


@dataclass
class ClassificationResult:
    candidates: list[CapabilityDescriptor]
    confidence: float
    stage_used: str  # "context_router"|"rules_engine"|"embedding"|"small_llm"
    token_budget: str  # "small_query"|"standard"|"complex"|"advanced"


def _select_token_budget(
    candidates: list[CapabilityDescriptor],
    query: str,
    confidence: float = 0.0,
) -> str:
    word_count = len(query.split())
    if not candidates or word_count <= 6:
        return "small_query"
    if len(candidates) == 1 and confidence >= 0.8:
        return "small_query"
    if len(candidates) == 1:
        return "standard"
    if len(candidates) <= 3:
        return "complex"
    return "advanced"


class ClassificationStage(ABC):
    """Base class for intent classification stages."""

    @abstractmethod
    async def classify(
        self,
        *,
        query: str,
        erp_context: ERPContext,
        registry: "CapabilityRegistry",
        db: Session | None = None,
        provider: "LLMProvider | None" = None,
    ) -> ClassificationResult | None:
        """Classify intent. Returns None if this stage cannot handle the query."""
        pass


class ContextRouterStage(ClassificationStage):
    """Stage 1: Filter by erp_context.module if set."""

    async def classify(
        self,
        *,
        query: str,
        erp_context: ERPContext,
        registry: "CapabilityRegistry",
        db: Session | None = None,
        provider: "LLMProvider | None" = None,
    ) -> ClassificationResult | None:
        if not erp_context.module:
            return None

        all_capabilities = registry.all_active()
        module_filtered = [
            c for c in all_capabilities if c.module_name == erp_context.module
        ]
        if module_filtered:
            return ClassificationResult(
                candidates=module_filtered,
                confidence=0.90,
                stage_used="context_router",
                token_budget=_select_token_budget(module_filtered, query),
            )
        return None


class RulesEngineStage(ClassificationStage):
    """Stage 2: Keyword/alias matching."""

    async def classify(
        self,
        *,
        query: str,
        erp_context: ERPContext,
        registry: "CapabilityRegistry",
        db: Session | None = None,
        provider: "LLMProvider | None" = None,
    ) -> ClassificationResult | None:
        all_capabilities = registry.all_active()
        keyword_map: dict[str, str] = registry.keyword_map()
        query_lower = query.lower()
        matched_qnames: set[str] = set()
        for alias, qname in keyword_map.items():
            if alias.lower() in query_lower:
                matched_qnames.add(qname)

        if matched_qnames:
            candidates = [
                c for c in all_capabilities if c.qualified_name in matched_qnames
            ]
            if candidates:
                return ClassificationResult(
                    candidates=candidates,
                    confidence=HIGH_CONFIDENCE,
                    stage_used="rules_engine",
                    token_budget=_select_token_budget(candidates, query),
                )
        return None


class EmbeddingMatcherStage(ClassificationStage):
    """Stage 3: Cosine similarity search over capability embeddings via pgvector."""

    async def classify(
        self,
        *,
        query: str,
        erp_context: ERPContext,
        registry: "CapabilityRegistry",
        db: Session | None = None,
        provider: "LLMProvider | None" = None,
    ) -> ClassificationResult | None:
        if db is None or provider is None:
            return None
        try:
            query_vectors = await provider.embed(
                [query], model=_embedding_model(provider)
            )
        except Exception as exc:
            logger.debug("EmbeddingMatcherStage: embed failed (%s), skipping", exc)
            return None

        query_vec = query_vectors[0]
        hits = registry.semantic_search(db, query_vec, top_n=10)
        # Only use embedding results if at least one exceeds confidence threshold
        confident = [(d, s) for d, s in hits if s >= HIGH_CONFIDENCE]
        if not confident:
            return None

        candidates = [d for d, _ in confident]
        avg_score = sum(s for _, s in confident) / len(confident)
        return ClassificationResult(
            candidates=candidates,
            confidence=avg_score,
            stage_used="embedding",
            token_budget=_select_token_budget(candidates, query),
        )


def _embedding_model(provider: "LLMProvider") -> str:
    """Return a sensible embedding model name based on the provider type."""
    from app.core.automation.ai.provider import OpenAIProvider

    if isinstance(provider, OpenAIProvider):
        return "text-embedding-3-small"
    return "text-embedding-3-small"  # default for openai-compatible


class SmallLLMStage(ClassificationStage):
    """Stage 4: Small LLM fallback — return all active, low confidence."""

    async def classify(
        self,
        *,
        query: str,
        erp_context: ERPContext,
        registry: "CapabilityRegistry",
        db: Session | None = None,
        provider: "LLMProvider | None" = None,
    ) -> ClassificationResult | None:
        all_capabilities = registry.all_active()
        candidates = all_capabilities[:5]
        return ClassificationResult(
            candidates=candidates,
            confidence=0.50,
            stage_used="small_llm",
            token_budget=_select_token_budget(candidates, query),
        )


class ConfigurableIntentClassifier:
    """Intent classifier with configurable pipeline stages."""

    def __init__(self, stages: list[ClassificationStage] | None = None):
        if stages is None:
            stages = [
                ContextRouterStage(),
                RulesEngineStage(),
                EmbeddingMatcherStage(),
                SmallLLMStage(),
            ]
        self._stages = stages

    async def classify(
        self,
        *,
        query: str,
        erp_context: ERPContext,
        registry: "CapabilityRegistry",
        db: Session | None = None,
        provider: "LLMProvider | None" = None,
    ) -> ClassificationResult:
        for stage in self._stages:
            result = await stage.classify(
                query=query,
                erp_context=erp_context,
                registry=registry,
                db=db,
                provider=provider,
            )
            if result is not None:
                return result

        # Fallback: should not reach here if SmallLLMStage is in stages
        all_capabilities = registry.all_active()
        return ClassificationResult(
            candidates=all_capabilities[:5],
            confidence=0.50,
            stage_used="fallback",
            token_budget=_select_token_budget(all_capabilities[:5], query),
        )


class IntentClassifier(ConfigurableIntentClassifier):
    """Default intent classifier with standard pipeline."""

    def __init__(self) -> None:
        super().__init__(
            stages=[
                ContextRouterStage(),
                RulesEngineStage(),
                EmbeddingMatcherStage(),
                SmallLLMStage(),
            ]
        )
