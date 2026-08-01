import logging
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.automation.ai.models import AIConversationMessage
from app.core.automation.ai.provider import LLMMessage
from app.core.automation.ai.repository import AIRepository

if TYPE_CHECKING:
    from app.core.automation.ai.provider import LLMProvider

logger = logging.getLogger(__name__)

COMPACTION_THRESHOLD = 20

# Number of messages fetched from DB for context building and compaction respectively.
_CONTEXT_FETCH_LIMIT = 100
_COMPACT_FETCH_LIMIT = 200

_TOKEN_BUDGETS = {
    "small_query": 2048,
    "standard": 4096,
    "complex": 8192,
    "advanced": 16384,
}


def _count_tokens(text: str) -> int:
    try:
        import tiktoken

        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        return len(text) // 4


class MemoryLayer:
    def _repo_factory(self, db: Session) -> AIRepository:
        return AIRepository(db)

    def needs_compaction(
        self,
        *,
        message_count: int,
        last_compacted_at: (
            datetime | None
        ),  # Time-based compaction gating is planned for Phase 2
    ) -> bool:
        return message_count >= COMPACTION_THRESHOLD

    async def build_context(
        self,
        *,
        db: Session,
        conversation_id: UUID,
        tenant_id: UUID,
        token_budget: int,
    ) -> list[LLMMessage]:
        repo = self._repo_factory(db)
        messages: list[LLMMessage] = []
        used_tokens = 0

        memory = repo.get_memory(conversation_id=conversation_id)
        if memory and memory.summary:
            system_content = f"Conversation summary: {memory.summary}"
            messages.append(LLMMessage(role="system", content=system_content))
            used_tokens += _count_tokens(system_content)

        recent_msgs = repo.list_messages(
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            limit=_CONTEXT_FETCH_LIMIT,
        )

        # list_messages returns messages in ascending created_at order.
        # We iterate newest-to-oldest (reversed) to fill the token budget from
        # the most recent messages first, then reverse the selected subset back
        # to ascending order before appending to the context.
        to_include: list[AIConversationMessage] = []
        for msg in reversed(recent_msgs):
            cost = _count_tokens(msg.content)
            if used_tokens + cost > token_budget:
                break
            to_include.append(msg)
            used_tokens += cost

        for msg in reversed(to_include):
            messages.append(LLMMessage(role=msg.role, content=msg.content))

        return messages

    async def persist_message(
        self,
        *,
        db: Session,
        conversation_id: UUID,
        tenant_id: UUID,
        role: str,
        content: str,
        metadata: dict | None = None,
        status: str = "complete",
    ) -> AIConversationMessage:
        repo = self._repo_factory(db)
        return repo.create_message(
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            role=role,
            content=content,
            metadata=metadata,
            status=status,
        )

    async def compact(
        self,
        *,
        db: Session,
        conversation_id: UUID,
        tenant_id: UUID,
        provider: "LLMProvider",
        model: str,
    ) -> None:
        repo = self._repo_factory(db)
        messages = repo.list_messages(
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            limit=_COMPACT_FETCH_LIMIT,
        )
        if not messages:
            return

        content_for_summary = "\n".join(f"{m.role}: {m.content}" for m in messages)
        prompt = (
            "Summarize the following conversation for future context. "
            "Preserve key facts, decisions, and user intent.\n\n" + content_for_summary
        )

        summary = await provider.complete(
            system="You are a concise conversation summarizer.",
            messages=[LLMMessage(role="user", content=prompt)],
            tools=None,
            model=model,
            max_tokens=512,
        )

        repo.upsert_memory(
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            summary=summary,
            message_count=len(messages),
        )
        db.commit()
        logger.info(
            "Compacted conversation %s (%d messages)", conversation_id, len(messages)
        )
