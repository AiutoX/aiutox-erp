import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.core.automation.ai.models import (
    AIConfig,
    AIConversation,
    AIConversationMemory,
    AIConversationMessage,
    AILLMProviderConfig,
)

logger = logging.getLogger(__name__)


class AIRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Provider config ───────────────────────────────────────────────────────

    def get_active_provider_config(
        self, *, tenant_id: UUID
    ) -> AILLMProviderConfig | None:
        return (
            self.db.query(AILLMProviderConfig)
            .filter(AILLMProviderConfig.tenant_id == tenant_id)
            .filter(AILLMProviderConfig.is_active == True)  # noqa: E712
            .first()
        )

    def upsert_provider_config(
        self,
        *,
        tenant_id: UUID,
        provider_type: str,
        api_key_encrypted: str | None,
        base_url: str | None = None,
        model_conversation: str,
        model_classifier: str,
        model_embeddings: str,
    ) -> AILLMProviderConfig:
        existing = (
            self.db.query(AILLMProviderConfig)
            .filter(AILLMProviderConfig.tenant_id == tenant_id)
            .filter(AILLMProviderConfig.provider_type == provider_type)
            .first()
        )
        if existing:
            if api_key_encrypted is not None:
                existing.api_key_encrypted = api_key_encrypted
            existing.base_url = base_url
            existing.model_conversation = model_conversation
            existing.model_classifier = model_classifier
            existing.model_embeddings = model_embeddings
            existing.is_active = True
            existing.updated_at = datetime.now(UTC)
            self.db.flush()
            return existing

        config = AILLMProviderConfig(
            tenant_id=tenant_id,
            provider_type=provider_type,
            api_key_encrypted=api_key_encrypted or "",
            base_url=base_url,
            model_conversation=model_conversation,
            model_classifier=model_classifier,
            model_embeddings=model_embeddings,
        )
        self.db.add(config)
        self.db.flush()
        return config

    # ── Conversations ─────────────────────────────────────────────────────────

    def get_conversation(
        self,
        *,
        conversation_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
    ) -> AIConversation | None:
        q = (
            self.db.query(AIConversation)
            .filter(AIConversation.id == conversation_id)
            .filter(AIConversation.tenant_id == tenant_id)
            .filter(AIConversation.deleted_at == None)  # noqa: E711
        )
        if user_id is not None:
            q = q.filter(AIConversation.user_id == user_id)
        else:
            logger.warning(
                "get_conversation called without user_id scoping (conversation=%s)",
                conversation_id,
            )
        return q.first()

    def create_conversation(
        self, *, tenant_id: UUID, user_id: UUID, channel: str = "embedded_chat"
    ) -> AIConversation:
        conv = AIConversation(
            id=uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            channel=channel,
        )
        self.db.add(conv)
        self.db.flush()
        return conv

    def list_conversations(
        self,
        *,
        tenant_id: UUID,
        user_id: UUID,
        limit: int = 20,
        cursor: str | None = None,
        search: str | None = None,
    ) -> list[AIConversation]:
        q = (
            self.db.query(AIConversation)
            .filter(AIConversation.tenant_id == tenant_id)
            .filter(AIConversation.user_id == user_id)
            .filter(AIConversation.deleted_at == None)  # noqa: E711
            .order_by(AIConversation.updated_at.desc())
        )
        if search:
            q = q.filter(AIConversation.title.ilike(f"%{search}%"))
        if cursor:
            try:
                cursor_dt = datetime.fromisoformat(cursor)
            except ValueError as exc:
                from app.core.exceptions import APIException

                raise APIException(
                    code="AI_INVALID_CURSOR",
                    message=f"Invalid cursor value: {cursor}",
                    status_code=400,
                ) from exc
            q = q.filter(AIConversation.updated_at < cursor_dt)
        return q.limit(limit).all()

    def get_conversation_by_channel(
        self,
        *,
        tenant_id: UUID,
        user_id: UUID,
        channel: str,
    ) -> AIConversation | None:
        """Return the most recent active conversation for a user+channel pair."""
        return (
            self.db.query(AIConversation)
            .filter(AIConversation.tenant_id == tenant_id)
            .filter(AIConversation.user_id == user_id)
            .filter(AIConversation.channel == channel)
            .filter(AIConversation.status == "active")
            .filter(AIConversation.deleted_at == None)  # noqa: E711
            .order_by(AIConversation.updated_at.desc())
            .first()
        )

    def update_conversation(
        self,
        *,
        conversation: AIConversation,
        title: str | None = None,
        status: str | None = None,
    ) -> AIConversation:
        if title is not None:
            conversation.title = title
        if status is not None:
            conversation.status = status
        conversation.updated_at = datetime.now(UTC)
        self.db.flush()
        return conversation

    def soft_delete_conversation(
        self, *, conversation: AIConversation
    ) -> AIConversation:
        conversation.deleted_at = datetime.now(UTC)
        conversation.status = "deleted"
        self.db.flush()
        return conversation

    # ── Messages ──────────────────────────────────────────────────────────────

    def create_message(
        self,
        *,
        tenant_id: UUID,
        conversation_id: UUID,
        role: str,
        content: str,
        metadata: dict | None = None,
        status: str = "complete",
    ) -> AIConversationMessage:
        msg = AIConversationMessage(
            id=uuid4(),
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            role=role,
            content=content,
            message_metadata=metadata or {},
            status=status,
        )
        self.db.add(msg)
        self.db.flush()
        return msg

    def update_message_status(
        self,
        *,
        message: AIConversationMessage | None = None,
        message_id: str | UUID | None = None,
        status: str,
        content: str | None = None,
        metadata: dict | None = None,
    ) -> AIConversationMessage | None:
        if message is None and message_id is not None:
            message = (
                self.db.query(AIConversationMessage)
                .filter(AIConversationMessage.id == message_id)
                .first()
            )
        if message is None:
            return None
        message.status = status
        if content is not None:
            message.content = content
        if metadata is not None:
            existing = dict(message.message_metadata or {})
            message.message_metadata = {**existing, **metadata}
        self.db.flush()
        return message

    def list_messages(
        self, *, conversation_id: UUID, tenant_id: UUID, limit: int = 50
    ) -> list[AIConversationMessage]:
        return (
            self.db.query(AIConversationMessage)
            .filter(AIConversationMessage.conversation_id == conversation_id)
            .filter(AIConversationMessage.tenant_id == tenant_id)
            .order_by(AIConversationMessage.created_at.asc())
            .limit(limit)
            .all()
        )

    def count_messages(self, *, conversation_id: UUID) -> int:
        return (
            self.db.query(AIConversationMessage)
            .filter(AIConversationMessage.conversation_id == conversation_id)
            .count()
        )

    # ── Memory ────────────────────────────────────────────────────────────────

    def get_memory(self, *, conversation_id: UUID) -> AIConversationMemory | None:
        return (
            self.db.query(AIConversationMemory)
            .filter(AIConversationMemory.conversation_id == conversation_id)
            .first()
        )

    def upsert_memory(
        self,
        *,
        tenant_id: UUID,
        conversation_id: UUID,
        summary: str,
        message_count: int,
    ) -> AIConversationMemory:
        memory = self.get_memory(conversation_id=conversation_id)
        if memory:
            memory.summary = summary
            memory.message_count_at_compaction = message_count
            memory.last_compacted_at = datetime.now(UTC)
            memory.updated_at = datetime.now(UTC)
            self.db.flush()
            return memory

        memory = AIConversationMemory(
            id=uuid4(),
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            summary=summary,
            message_count_at_compaction=message_count,
            last_compacted_at=datetime.now(UTC),
        )
        self.db.add(memory)
        self.db.flush()
        return memory

    # ── AI Config ─────────────────────────────────────────────────────────────

    def get_ai_config(self, *, tenant_id: UUID) -> AIConfig | None:
        return self.db.query(AIConfig).filter(AIConfig.tenant_id == tenant_id).first()

    def upsert_ai_config(
        self,
        *,
        tenant_id: UUID,
        cache_ttl_seconds: int | None = None,
        rate_limit_max: int | None = None,
        rate_limit_window_seconds: int | None = None,
        classification_stages: list[str] | None = None,
        token_budgets: dict[str, int] | None = None,
        supported_channels: list[str] | None = None,
        pubsub_enabled: bool | None = None,
        max_capability_response_tokens: int | None = None,
        compaction_threshold: int | None = None,
        auto_archive_after_days: int | None = None,
        hard_delete_after_days: int | None = None,
    ) -> AIConfig:
        config = self.get_ai_config(tenant_id=tenant_id)
        if config:
            if cache_ttl_seconds is not None:
                config.cache_ttl_seconds = cache_ttl_seconds
            if rate_limit_max is not None:
                config.rate_limit_max = rate_limit_max
            if rate_limit_window_seconds is not None:
                config.rate_limit_window_seconds = rate_limit_window_seconds
            if classification_stages is not None:
                config.classification_stages = classification_stages
            if token_budgets is not None:
                config.token_budgets = token_budgets
            if supported_channels is not None:
                config.supported_channels = supported_channels
            if pubsub_enabled is not None:
                config.pubsub_enabled = pubsub_enabled
            if max_capability_response_tokens is not None:
                config.max_capability_response_tokens = max_capability_response_tokens
            if compaction_threshold is not None:
                config.compaction_threshold = compaction_threshold
            if auto_archive_after_days is not None:
                config.auto_archive_after_days = auto_archive_after_days
            if hard_delete_after_days is not None:
                config.hard_delete_after_days = hard_delete_after_days
            config.updated_at = datetime.now(UTC)
            self.db.flush()
            return config

        config = AIConfig(
            id=uuid4(),
            tenant_id=tenant_id,
            cache_ttl_seconds=cache_ttl_seconds or 300,
            rate_limit_max=rate_limit_max or 100,
            rate_limit_window_seconds=rate_limit_window_seconds or 3600,
            classification_stages=classification_stages
            or ["context_router", "rules_engine", "small_llm"],
            token_budgets=token_budgets
            or {
                "small_query": 2048,
                "standard": 4096,
                "complex": 8192,
                "advanced": 16384,
            },
            supported_channels=supported_channels or ["embedded_chat"],
            pubsub_enabled=pubsub_enabled if pubsub_enabled is not None else True,
            max_capability_response_tokens=max_capability_response_tokens or 8000,
            compaction_threshold=compaction_threshold or 20,
            auto_archive_after_days=auto_archive_after_days or 0,
            hard_delete_after_days=hard_delete_after_days or 0,
        )
        self.db.add(config)
        self.db.flush()
        return config
