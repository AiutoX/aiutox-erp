import asyncio
import logging
import time
from collections.abc import AsyncIterator
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.audit.models import AuditLog
from app.core.automation.ai.capability_registry import capability_registry
from app.core.automation.ai.capability_resolver import capability_resolver
from app.core.automation.ai.intent_classifier import IntentClassifier
from app.core.automation.ai.memory_layer import (
    _TOKEN_BUDGETS,
    MemoryLayer,
    _count_tokens,
)
from app.core.automation.ai.models import AIConfig, AIConversation, AILLMProviderConfig
from app.core.automation.ai.provider import (
    AnthropicProvider,
    LLMMessage,
    LLMProvider,
    OpenAIProvider,
    ToolDef,
)
from app.core.automation.ai.repository import AIRepository
from app.core.automation.ai.schemas import ERPContext
from app.core.security.encryption import decrypt_credentials
from app.core.users.models import User
from app.services.permission_service import PermissionService

logger = logging.getLogger(__name__)

RATE_LIMIT_MAX = 100
RATE_LIMIT_WINDOW_SECONDS = 3600


def _build_provider(config):
    api_key = decrypt_credentials(config.api_key_encrypted, config.tenant_id)
    if config.provider_type == "anthropic":
        return AnthropicProvider(api_key=api_key)
    if config.provider_type in ("openai", "openai-compatible"):
        return OpenAIProvider(
            api_key=api_key, base_url=getattr(config, "base_url", None)
        )
    raise ValueError(f"Unknown provider_type: {config.provider_type}")


class ConversationEngine:
    def __init__(self, publisher=None) -> None:
        self._classifier = IntentClassifier()
        self._memory = MemoryLayer()
        self._publisher = publisher

    async def _check_rate_limit(self, redis, user_id: UUID) -> dict | None:
        rate_key = f"ai:rate:{user_id}"
        pipe = redis.pipeline()
        pipe.incr(rate_key)
        pipe.expire(rate_key, RATE_LIMIT_WINDOW_SECONDS)
        results = await pipe.execute()
        count = results[0]
        if count > RATE_LIMIT_MAX:
            return {
                "type": "error",
                "code": "AI_RATE_LIMIT_EXCEEDED",
                "message": "Rate limit exceeded: 100 requests per hour",
            }
        return None

    def _load_ai_config(self, db: Session, tenant_id: UUID) -> AIConfig:
        """Return tenant AIConfig, creating defaults if not yet set."""
        repo = AIRepository(db)
        config = repo.get_ai_config(tenant_id=tenant_id)
        if config is None:
            config = repo.upsert_ai_config(tenant_id=tenant_id)
            db.commit()
        return config

    def _validate_provider_config(
        self, db: Session, tenant_id: UUID
    ) -> tuple[dict | None, AILLMProviderConfig | None, LLMProvider | None]:
        repo = AIRepository(db)
        config = repo.get_active_provider_config(tenant_id=tenant_id)
        if config is None:
            return (
                {
                    "type": "error",
                    "code": "AI_PROVIDER_NOT_CONFIGURED",
                    "message": "No LLM provider configured for this tenant",
                    "http_status": 503,
                },
                None,
                None,
            )
        provider = _build_provider(config)
        return None, config, provider

    async def _load_or_create_conversation(
        self,
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
        conversation_id: UUID | None,
        channel: str = "embedded_chat",
    ) -> tuple[dict | None, AIConversation | None]:
        repo = AIRepository(db)
        if conversation_id:
            conv = repo.get_conversation(
                conversation_id=conversation_id, tenant_id=tenant_id
            )
            if conv is None:
                return (
                    {
                        "type": "error",
                        "code": "AI_CONVERSATION_NOT_FOUND",
                        "message": "Conversation not found",
                    },
                    None,
                )
            return None, conv
        else:
            conv = repo.create_conversation(
                tenant_id=tenant_id, user_id=user_id, channel=channel
            )
            db.commit()
            if self._publisher:
                try:
                    from app.core.automation.ai.events import (
                        publish_conversation_started,
                    )

                    await publish_conversation_started(
                        self._publisher,
                        conversation_id=conv.id,  # type: ignore[arg-type]
                        tenant_id=tenant_id,
                        user_id=user_id,
                        channel=channel,
                    )
                except Exception as exc:
                    logger.warning(
                        "Failed to publish conversation started event: %s", exc
                    )
            return None, conv

    async def _classify_and_resolve(
        self,
        db: Session,
        current_user: User,
        message: str,
        erp_context: ERPContext,
        provider: LLMProvider | None = None,
    ) -> tuple[list, int]:
        classification = await self._classifier.classify(
            query=message,
            erp_context=erp_context,
            registry=capability_registry,
            db=db,
            provider=provider,
        )
        user_perms = PermissionService(db).get_effective_permissions(current_user.id)
        resolved = capability_resolver.filter(classification.candidates, user_perms)
        token_budget = _TOKEN_BUDGETS.get(classification.token_budget, 4096)
        return resolved, token_budget

    async def _execute_capability(
        self,
        db: Session,
        current_user: User,
        conv_id: UUID,
        channel: str,
        cap_desc,
        tool_args: dict,
        total_tokens: int,
        total_cost: float,
    ) -> dict:
        cap_start = time.monotonic()
        try:
            tool_result = await cap_desc.fn(
                db=db,
                current_user=current_user,
                **tool_args,
            )
            cap_elapsed_ms = round((time.monotonic() - cap_start) * 1000, 2)
            db.add(
                AuditLog(
                    user_id=current_user.id,
                    tenant_id=current_user.tenant_id,
                    action="ai_capability_executed",
                    resource_type="ai_capability",
                    resource_id=conv_id,
                    details={
                        "capability_name": cap_desc.qualified_name,
                        "args": tool_args,
                        "execution_time_ms": cap_elapsed_ms,
                        "token_count": total_tokens,
                        "cost_usd": total_cost,
                        "channel": channel,
                        "conversation_id": str(conv_id),
                    },
                )
            )
            db.commit()
            if self._publisher:
                try:
                    from app.core.automation.ai.events import (
                        publish_capability_executed,
                    )

                    await publish_capability_executed(
                        self._publisher,
                        conversation_id=conv_id,
                        capability_name=cap_desc.qualified_name,
                        tenant_id=current_user.tenant_id,
                        user_id=current_user.id,
                        execution_time_ms=cap_elapsed_ms,
                        token_count=total_tokens,
                        cost_usd=total_cost,
                    )
                except Exception as exc:
                    logger.warning(
                        "Failed to publish capability executed event: %s", exc
                    )
            return {
                "type": "success",
                "capability": cap_desc.qualified_name,
                "result": tool_result,
                "execution_time_ms": cap_elapsed_ms,
            }
        except Exception as cap_exc:
            logger.warning(
                "Capability %s failed: %s",
                cap_desc.qualified_name,
                cap_exc,
            )
            db.add(
                AuditLog(
                    user_id=current_user.id,
                    tenant_id=current_user.tenant_id,
                    action="ai_capability_failed",
                    resource_type="ai_capability",
                    resource_id=conv_id,
                    details={
                        "capability_name": cap_desc.qualified_name,
                        "error": str(cap_exc),
                        "channel": channel,
                        "conversation_id": str(conv_id),
                    },
                )
            )
            db.commit()
            if self._publisher:
                try:
                    from app.core.automation.ai.events import publish_capability_failed

                    await publish_capability_failed(
                        self._publisher,
                        conversation_id=conv_id,
                        capability_name=cap_desc.qualified_name,
                        tenant_id=current_user.tenant_id,
                        user_id=current_user.id,
                        error=str(cap_exc),
                    )
                except Exception as exc:
                    logger.warning("Failed to publish capability failed event: %s", exc)
            return {
                "type": "error",
                "code": "CAPABILITY_FAILED",
                "message": str(cap_exc),
            }

    def _handle_stream_error(
        self,
        db: Session,
        user_id: UUID,
        tenant_id: UUID,
        conv_id: UUID,
        channel: str,
        assistant_msg,
        error_msg: str,
        partial_content: str,
    ) -> None:
        from app.core.automation.ai.repository import AIRepository

        repo = AIRepository(db)
        repo.update_message_status(
            message=assistant_msg, status="failed", content=partial_content
        )
        db.add(
            AuditLog(
                user_id=user_id,
                tenant_id=tenant_id,
                action="ai_stream_error",
                resource_type="ai_conversation",
                resource_id=conv_id,
                details={
                    "error": error_msg,
                    "channel": channel,
                    "conversation_id": str(conv_id),
                },
            )
        )
        db.commit()

    def _finalize_conversation(
        self,
        db: Session,
        user_id: UUID,
        tenant_id: UUID,
        conv_id: UUID,
        channel: str,
        message_id: str,
        content: str,
        tokens: int,
        cost: float,
    ) -> dict:
        from app.core.automation.ai.repository import AIRepository

        repo = AIRepository(db)
        repo.update_message_status(
            message_id=message_id,
            status="complete",
            content=content,
            metadata={"cost_usd": cost, "token_count": tokens},
        )
        db.add(
            AuditLog(
                user_id=user_id,
                tenant_id=tenant_id,
                action="ai_message_completed",
                resource_type="ai_conversation",
                resource_id=conv_id,
                details={
                    "tokens": tokens,
                    "cost_usd": cost,
                    "channel": channel,
                    "conversation_id": str(conv_id),
                },
            )
        )
        db.commit()
        return {
            "type": "message_end",
            "message_id": message_id,
            "usage": {"tokens": tokens, "cost_usd": cost},
        }

    async def chat(
        self,
        *,
        db: Session,
        current_user: User,
        message: str,
        conversation_id: UUID | None,
        erp_context: ERPContext,
        redis,
        channel: str = "embedded_chat",
    ) -> AsyncIterator[dict]:
        repo = AIRepository(db)
        tenant_id: UUID = current_user.tenant_id
        user_id: UUID = current_user.id
        request_channel = channel

        rate_error = await self._check_rate_limit(redis, user_id)
        if rate_error:
            yield rate_error
            return

        provider_error, config, provider = self._validate_provider_config(db, tenant_id)
        if provider_error:
            yield provider_error
            return
        assert config is not None
        assert provider is not None

        ai_config = self._load_ai_config(db, tenant_id)

        conv_error, conv = await self._load_or_create_conversation(
            db, tenant_id, user_id, conversation_id, channel=request_channel
        )
        if conv_error:
            yield conv_error
            return
        assert conv is not None

        repo.create_message(
            tenant_id=tenant_id,
            conversation_id=conv.id,  # type: ignore[arg-type]
            role="user",
            content=message,
        )
        db.commit()

        resolved, token_budget = await self._classify_and_resolve(
            db, current_user, message, erp_context, provider=provider
        )

        context_messages = await self._memory.build_context(
            db=db,
            conversation_id=conv.id,  # type: ignore[arg-type]
            tenant_id=tenant_id,
            token_budget=token_budget,
        )
        context_messages.append(LLMMessage(role="user", content=message))

        tools = [
            ToolDef(
                name=cap.qualified_name,
                description=cap.description,
                input_schema=cap.parameters_schema
                or {"type": "object", "properties": {}},
            )
            for cap in resolved
        ]

        assistant_msg = repo.create_message(
            tenant_id=tenant_id,
            conversation_id=conv.id,  # type: ignore[arg-type]
            role="assistant",
            content="",
            status="streaming",
        )
        db.commit()
        message_id = str(assistant_msg.id)

        full_content = ""
        total_tokens = 0
        total_cost = 0.0
        try:
            async for chunk in provider.stream(
                system=(
                    "You are a helpful ERP assistant. "
                    "Answer concisely and use tools when appropriate."
                ),
                messages=context_messages,
                tools=tools,
                model=config.model_conversation,
                max_tokens=token_budget,
            ):
                typed_chunk = chunk
                if typed_chunk.type == "text_delta" and typed_chunk.delta:
                    full_content += typed_chunk.delta
                    yield {
                        "type": "text_delta",
                        "delta": typed_chunk.delta,
                        "message_id": message_id,
                    }

                elif typed_chunk.type == "tool_call" and typed_chunk.tool_name:
                    yield {
                        "type": "tool_call",
                        "capability": typed_chunk.tool_name,
                        "args": typed_chunk.tool_args or {},
                    }
                    cap_desc = capability_registry.by_qualified_name(
                        typed_chunk.tool_name
                    )
                    if cap_desc:
                        # HITL gate: operational capabilities require confirmation
                        if cap_desc.capability_type == "operational":
                            yield {
                                "type": "hitl_confirmation_required",
                                "capability_name": cap_desc.qualified_name,
                                "proposed_action": typed_chunk.tool_args or {},
                                "message": (
                                    f"I will {cap_desc.description.split('.')[0].lower()}. "
                                    "Confirm?"
                                ),
                            }
                            continue
                        exec_result = await self._execute_capability(
                            db,
                            current_user,
                            conv.id,  # type: ignore[arg-type]
                            conv.channel,
                            cap_desc,
                            typed_chunk.tool_args or {},
                            total_tokens,
                            total_cost,
                        )
                        if exec_result["type"] == "success":
                            result_payload = exec_result["result"]
                            # SR-008: hard cap on capability response size
                            result_str = str(result_payload)
                            if (
                                _count_tokens(result_str)
                                > ai_config.max_capability_response_tokens
                            ):
                                result_payload = result_str[
                                    : ai_config.max_capability_response_tokens * 4
                                ]
                                logger.warning(
                                    "SR-008: capability response truncated to %d tokens "
                                    "for conversation %s",
                                    ai_config.max_capability_response_tokens,
                                    conv.id,
                                )
                            yield {
                                "type": "tool_result",
                                "capability": exec_result["capability"],
                                "result": result_payload,
                            }
                        else:
                            yield {
                                "type": "error",
                                "code": exec_result["code"],
                                "message": exec_result["message"],
                            }
                    else:
                        logger.warning(
                            "Tool call for unknown capability: %s",
                            typed_chunk.tool_name,
                        )
                        yield {
                            "type": "error",
                            "code": "CAPABILITY_NOT_FOUND",
                            "message": f"Capability '{typed_chunk.tool_name}' not found in registry",
                        }

                elif typed_chunk.type == "message_end":
                    if typed_chunk.usage:
                        total_tokens = typed_chunk.usage.get("tokens", 0)
                        total_cost = typed_chunk.usage.get("cost_usd", 0.0)

        except asyncio.CancelledError:
            error_code = "STREAM_CANCELLED"
            error_msg = "Request cancelled by user"
            logger.info("Stream cancelled for conversation %s", conv.id)
            self._handle_stream_error(
                db,
                user_id,
                tenant_id,
                conv.id,  # type: ignore[arg-type]
                conv.channel,  # type: ignore[arg-type]
                assistant_msg,
                error_msg,
                full_content,
            )
            yield {"type": "error", "code": error_code, "message": error_msg}
            return
        except (ConnectionError, TimeoutError, OSError) as stream_exc:
            error_code = "STREAM_NETWORK_ERROR"
            error_msg = f"Network error: {stream_exc}"
            logger.error(
                "Stream network error for conversation %s: %s", conv.id, stream_exc
            )
            self._handle_stream_error(
                db,
                user_id,
                tenant_id,
                conv.id,  # type: ignore[arg-type]
                conv.channel,  # type: ignore[arg-type]
                assistant_msg,
                error_msg,
                full_content,
            )
            yield {
                "type": "error",
                "code": error_code,
                "message": error_msg,
                "retryable": True,
            }
            return
        except Exception as stream_exc:
            error_code = "STREAM_INTERNAL_ERROR"
            error_msg = str(stream_exc)
            logger.error(
                "Stream error for conversation %s: %s",
                conv.id,
                stream_exc,
                exc_info=True,
            )
            self._handle_stream_error(
                db,
                user_id,
                tenant_id,
                conv.id,  # type: ignore[arg-type]
                conv.channel,  # type: ignore[arg-type]
                assistant_msg,
                error_msg,
                full_content,
            )
            yield {"type": "error", "code": error_code, "message": error_msg}
            return

        yield self._finalize_conversation(
            db,
            user_id,
            tenant_id,
            conv.id,  # type: ignore[arg-type]
            conv.channel,
            message_id,
            full_content,
            total_tokens,
            total_cost,
        )

        # Auto-title: generate a title from the first exchange
        if conv.title is None and full_content:
            try:
                title = await provider.complete(
                    system="You generate concise conversation titles.",
                    messages=[
                        LLMMessage(
                            role="user",
                            content=(
                                "Generate a concise 5-word title for this conversation. "
                                "Reply with ONLY the title, nothing else.\n\n"
                                f"User: {message}\n"
                                f"Assistant: {full_content[:200]}"
                            ),
                        )
                    ],
                    tools=None,
                    model=config.model_conversation,
                    max_tokens=30,
                )
                title = title.strip().strip('"').strip("'")[:255]
                if title:
                    repo.update_conversation(conversation=conv, title=title)
                    db.commit()
            except Exception as title_exc:
                logger.warning(
                    "Auto-title generation failed for conversation %s: %s",
                    conv.id,
                    title_exc,
                )

        # FR-010: trigger memory compaction when message count exceeds threshold
        message_count = AIRepository(db).count_messages(
            conversation_id=conv.id  # type: ignore[arg-type]
        )
        if message_count >= ai_config.compaction_threshold:
            try:
                await self._memory.compact(
                    db=db,
                    conversation_id=conv.id,  # type: ignore[arg-type]
                    tenant_id=tenant_id,
                    provider=provider,
                    model=config.model_conversation,
                )
            except Exception as compact_exc:
                logger.warning(
                    "FR-010: compaction failed for conversation %s: %s",
                    conv.id,
                    compact_exc,
                )
