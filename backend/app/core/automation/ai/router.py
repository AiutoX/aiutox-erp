import json
import logging
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.auth.dependencies import (
    get_user_permissions,
    require_any_permission,
    require_permission,
)
from app.core.automation.ai.analytics_service import AIAnalyticsService
from app.core.automation.ai.capability_registry import capability_registry
from app.core.automation.ai.conversation_engine import ConversationEngine
from app.core.automation.ai.digest_service import DigestSubscriptionService
from app.core.automation.ai.permissions import AI_AUDIT, AI_CONFIG, AI_USE
from app.core.automation.ai.repository import AIRepository
from app.core.automation.ai.schemas import (
    AIConfigOut,
    AIConfigUpdate,
    CapabilityMetricEntry,
    CapabilityOut,
    ChatRequest,
    ConversationOut,
    ConversationUpdate,
    CostAnalyticsOut,
    DigestSubscriptionCreate,
    DigestSubscriptionResponse,
    MessageOut,
    ProviderConfigCreate,
    ProviderConfigOut,
)
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.security.encryption import encrypt_credentials
from app.core.users.models import User
from app.schemas.common import StandardListResponse, StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_publisher():
    try:
        from app.core.pubsub import get_event_publisher

        return get_event_publisher()
    except Exception as exc:
        logger.warning("Failed to initialize event publisher: %s", exc)
        return None


_engine = ConversationEngine(publisher=_get_publisher())


async def _get_redis():
    from app.core.redis import get_redis_client

    return await get_redis_client()


async def _sse_stream(gen: AsyncIterator[dict]) -> AsyncIterator[bytes]:
    async for event in gen:
        yield f"data: {json.dumps(event)}\n\n".encode()


@router.post("/chat", summary="Stream a conversation turn via SSE", tags=["AI"])
async def chat_endpoint(
    request: ChatRequest,
    current_user: Annotated[User, Depends(require_permission(AI_USE))],
    db: Annotated[Session, Depends(get_db)],
):
    redis = await _get_redis()
    gen = _engine.chat(
        db=db,
        current_user=current_user,
        message=request.message,
        conversation_id=request.conversation_id,
        erp_context=request.erp_context,
        redis=redis,
        channel=request.channel,
    )
    return StreamingResponse(
        _sse_stream(gen),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get(
    "/conversations",
    response_model=StandardListResponse[ConversationOut],
    summary="List user conversations",
    tags=["AI"],
)
async def list_conversations(
    current_user: Annotated[User, Depends(require_permission(AI_USE))],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Query(None),
    search: str | None = Query(None, max_length=100),
):
    repo = AIRepository(db)
    items = repo.list_conversations(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        limit=limit,
        cursor=cursor,
        search=search,
    )
    has_more = len(items) > limit
    page_items = items[:limit]
    return StandardListResponse(
        data=[ConversationOut.model_validate(c) for c in page_items],
        meta={
            "total": len(page_items),
            "page": 1,
            "page_size": limit,
            "total_pages": 1,
            "has_more": has_more,
        },
    )


@router.post(
    "/conversations",
    response_model=StandardResponse[ConversationOut],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation",
    tags=["AI"],
)
async def create_conversation(
    current_user: Annotated[User, Depends(require_permission(AI_USE))],
    db: Annotated[Session, Depends(get_db)],
):
    repo = AIRepository(db)
    conv = repo.create_conversation(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )
    db.commit()
    return StandardResponse(data=ConversationOut.model_validate(conv))


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=StandardListResponse[MessageOut],
    summary="Get messages for a conversation",
    tags=["AI"],
)
async def list_messages(
    conversation_id: UUID,
    current_user: Annotated[User, Depends(require_permission(AI_USE))],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(50, ge=1, le=200),
):
    repo = AIRepository(db)
    conv = repo.get_conversation(
        conversation_id=conversation_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )
    if conv is None:
        raise APIException(
            code="AI_CONVERSATION_NOT_FOUND",
            message="Conversation not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    messages = repo.list_messages(
        conversation_id=conversation_id,
        tenant_id=current_user.tenant_id,
        limit=limit,
    )
    return StandardListResponse(
        data=[
            MessageOut(
                id=m.id,  # type: ignore[arg-type]
                conversation_id=m.conversation_id,  # type: ignore[arg-type]
                role=m.role,
                content=m.content,
                metadata=m.message_metadata or {},  # type: ignore[arg-type]
                status=m.status,
                created_at=m.created_at,
            )
            for m in messages
        ],
        meta={"total": len(messages), "page": 1, "page_size": limit, "total_pages": 1},
    )


@router.patch(
    "/conversations/{conversation_id}",
    response_model=StandardResponse[ConversationOut],
    summary="Update conversation title or status",
    tags=["AI"],
)
async def update_conversation(
    conversation_id: UUID,
    body: ConversationUpdate,
    current_user: Annotated[User, Depends(require_permission(AI_USE))],
    db: Annotated[Session, Depends(get_db)],
):
    repo = AIRepository(db)
    conv = repo.get_conversation(
        conversation_id=conversation_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )
    if conv is None:
        raise APIException(
            code="AI_CONVERSATION_NOT_FOUND",
            message="Conversation not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    old_status = conv.status
    updated = repo.update_conversation(
        conversation=conv,
        **body.model_dump(exclude_none=True),
    )
    db.commit()

    if updated.status == "archived" and old_status != "archived":
        publisher = _get_publisher()
        if publisher:
            from app.core.automation.ai.events import publish_conversation_archived

            await publish_conversation_archived(
                publisher,
                conversation_id=conversation_id,
                tenant_id=current_user.tenant_id,
                user_id=current_user.id,
            )

    return StandardResponse(data=ConversationOut.model_validate(updated))


@router.delete(
    "/conversations/{conversation_id}",
    response_model=StandardResponse[ConversationOut],
    summary="Soft-delete a conversation",
    tags=["AI"],
)
async def delete_conversation(
    conversation_id: UUID,
    current_user: Annotated[User, Depends(require_permission(AI_USE))],
    db: Annotated[Session, Depends(get_db)],
):
    repo = AIRepository(db)
    conv = repo.get_conversation(
        conversation_id=conversation_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )
    if conv is None:
        raise APIException(
            code="AI_CONVERSATION_NOT_FOUND",
            message="Conversation not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    deleted = repo.soft_delete_conversation(conversation=conv)
    db.commit()
    return StandardResponse(data=ConversationOut.model_validate(deleted))


@router.get(
    "/capabilities",
    response_model=StandardListResponse[CapabilityOut],
    summary="List active AI capabilities",
    tags=["AI"],
)
async def list_capabilities(
    current_user: Annotated[User, Depends(require_permission(AI_CONFIG))],
    db: Annotated[Session, Depends(get_db)],
    include_metrics: bool = Query(False),
):
    caps = capability_registry.all_active()

    metrics_by_name: dict[str, CapabilityMetricEntry] = {}
    if include_metrics:
        redis = await _get_redis()
        svc = AIAnalyticsService(db=db, redis=redis)
        raw = await svc.capability_metrics(tenant_id=current_user.tenant_id)
        metrics_by_name = {r["capability"]: CapabilityMetricEntry(**r) for r in raw}

    return StandardListResponse(
        data=[
            CapabilityOut(
                qualified_name=c.qualified_name,
                module_name=c.module_name,
                description=c.description,
                capability_type=c.capability_type,
                permission_required=c.permission_required,
                metrics=metrics_by_name.get(c.qualified_name),
            )
            for c in caps
        ],
        meta={
            "total": len(caps),
            "page": 1,
            "page_size": max(len(caps), 1),
            "total_pages": 1,
        },
    )


@router.get(
    "/analytics/cost",
    response_model=StandardResponse[CostAnalyticsOut],
    summary="Get AI cost analytics for the tenant",
    tags=["AI"],
)
async def get_cost_analytics(
    current_user: Annotated[User, Depends(require_any_permission(AI_CONFIG, AI_AUDIT))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    db: Annotated[Session, Depends(get_db)],
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = Query(None),
    group_by: str = Query("day", pattern="^(day|week|month)$"),
):
    now = datetime.now(tz=UTC)
    from_dt = from_ or (now - timedelta(days=30))
    to_dt = to or now

    redis = await _get_redis()
    svc = AIAnalyticsService(db=db, redis=redis)

    by_day = await svc.cost_by_period(
        tenant_id=current_user.tenant_id,
        from_dt=from_dt,
        to_dt=to_dt,
        group_by=group_by,
    )
    by_capability = await svc.cost_by_capability(
        tenant_id=current_user.tenant_id,
        from_dt=from_dt,
        to_dt=to_dt,
    )

    by_user = None
    if AI_AUDIT in user_permissions:
        by_user = await svc.cost_by_user(
            tenant_id=current_user.tenant_id,
            from_dt=from_dt,
            to_dt=to_dt,
        )

    return StandardResponse(
        data=CostAnalyticsOut(
            period={
                "from": from_dt.isoformat(),
                "to": to_dt.isoformat(),
                "group_by": group_by,
            },
            by_day=by_day,  # type: ignore[arg-type]
            by_capability=by_capability,  # type: ignore[arg-type]
            by_user=by_user,  # type: ignore[arg-type]
        )
    )


@router.get(
    "/analytics/capabilities",
    response_model=StandardListResponse[CapabilityMetricEntry],
    summary="Get AI capability quality metrics",
    tags=["AI"],
)
async def get_capability_analytics(
    current_user: Annotated[User, Depends(require_permission(AI_AUDIT))],
    db: Annotated[Session, Depends(get_db)],
):
    redis = await _get_redis()
    svc = AIAnalyticsService(db=db, redis=redis)
    items = await svc.capability_metrics(tenant_id=current_user.tenant_id)
    return StandardListResponse(
        data=[CapabilityMetricEntry(**item) for item in items],
        meta={
            "total": len(items),
            "page": 1,
            "page_size": max(len(items), 1),
            "total_pages": 1,
        },
    )


@router.post(
    "/provider-config",
    response_model=StandardResponse[ProviderConfigOut],
    status_code=status.HTTP_201_CREATED,
    summary="Create or update LLM provider configuration",
    tags=["AI"],
)
async def upsert_provider_config(
    body: ProviderConfigCreate,
    current_user: Annotated[User, Depends(require_permission(AI_CONFIG))],
    db: Annotated[Session, Depends(get_db)],
):
    repo = AIRepository(db)
    encrypted_key = (
        encrypt_credentials(body.api_key, current_user.tenant_id)
        if body.api_key
        else None
    )
    config = repo.upsert_provider_config(
        tenant_id=current_user.tenant_id,
        provider_type=body.provider_type,
        api_key_encrypted=encrypted_key,
        base_url=body.base_url,
        model_conversation=body.model_conversation,
        model_classifier=body.model_classifier,
        model_embeddings=body.model_embeddings,
    )
    db.commit()
    return StandardResponse(data=ProviderConfigOut.model_validate(config))


@router.get(
    "/provider-config",
    response_model=StandardResponse[ProviderConfigOut],
    summary="Get active LLM provider configuration",
    tags=["AI"],
)
async def get_provider_config(
    current_user: Annotated[User, Depends(require_permission(AI_CONFIG))],
    db: Annotated[Session, Depends(get_db)],
):
    repo = AIRepository(db)
    config = repo.get_active_provider_config(tenant_id=current_user.tenant_id)
    if config is None:
        raise APIException(
            code="AI_PROVIDER_NOT_CONFIGURED",
            message="No LLM provider configured for this tenant",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return StandardResponse(data=ProviderConfigOut.model_validate(config))


@router.get(
    "/config",
    response_model=StandardResponse[AIConfigOut],
    summary="Get AI configuration for current tenant",
    tags=["AI"],
)
async def get_ai_config(
    current_user: Annotated[User, Depends(require_permission(AI_CONFIG))],
    db: Annotated[Session, Depends(get_db)],
):
    repo = AIRepository(db)
    config = repo.get_ai_config(tenant_id=current_user.tenant_id)
    if config is None:
        # Return default config if not set
        config = repo.upsert_ai_config(tenant_id=current_user.tenant_id)
        db.commit()
    return StandardResponse(data=AIConfigOut.model_validate(config))


@router.put(
    "/config",
    response_model=StandardResponse[AIConfigOut],
    summary="Update AI configuration for current tenant",
    tags=["AI"],
)
async def update_ai_config(
    body: AIConfigUpdate,
    current_user: Annotated[User, Depends(require_permission(AI_CONFIG))],
    db: Annotated[Session, Depends(get_db)],
):
    repo = AIRepository(db)
    config = repo.upsert_ai_config(
        tenant_id=current_user.tenant_id,
        cache_ttl_seconds=body.cache_ttl_seconds,
        rate_limit_max=body.rate_limit_max,
        rate_limit_window_seconds=body.rate_limit_window_seconds,
        classification_stages=body.classification_stages,
        token_budgets=body.token_budgets,
        supported_channels=body.supported_channels,
        pubsub_enabled=body.pubsub_enabled,
        max_capability_response_tokens=body.max_capability_response_tokens,
        compaction_threshold=body.compaction_threshold,
        auto_archive_after_days=body.auto_archive_after_days,
        hard_delete_after_days=body.hard_delete_after_days,
    )
    db.commit()
    # Invalidate cache after config update
    capability_registry.refresh()
    return StandardResponse(data=AIConfigOut.model_validate(config))


_digest_svc = DigestSubscriptionService()


@router.get(
    "/digests",
    response_model=StandardListResponse[CapabilityOut],
    summary="List available digest capabilities",
    tags=["AI"],
)
async def list_available_digests(
    current_user: Annotated[User, Depends(require_permission(AI_USE))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
):
    caps = _digest_svc.list_available(user_permissions=user_permissions)
    return StandardListResponse(
        data=[
            CapabilityOut(
                qualified_name=c.qualified_name,
                module_name=c.module_name,
                description=c.description,
                capability_type=c.capability_type,
                permission_required=c.permission_required,
            )
            for c in caps
        ],
        meta={
            "total": len(caps),
            "page": 1,
            "page_size": max(len(caps), 1),
            "total_pages": 1,
        },
    )


@router.get(
    "/digests/subscriptions",
    response_model=StandardListResponse[DigestSubscriptionResponse],
    summary="List user digest subscriptions",
    tags=["AI"],
)
async def list_digest_subscriptions(
    current_user: Annotated[User, Depends(require_permission(AI_USE))],
    db: Annotated[Session, Depends(get_db)],
):
    subs = _digest_svc.list_subscriptions(
        db=db, tenant_id=current_user.tenant_id, user_id=current_user.id
    )
    return StandardListResponse(
        data=[DigestSubscriptionResponse.model_validate(s) for s in subs],
        meta={
            "total": len(subs),
            "page": 1,
            "page_size": max(len(subs), 1),
            "total_pages": 1,
        },
    )


@router.post(
    "/digests/subscriptions",
    response_model=StandardResponse[DigestSubscriptionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Subscribe to a digest",
    tags=["AI"],
)
async def subscribe_to_digest(
    body: DigestSubscriptionCreate,
    current_user: Annotated[User, Depends(require_permission(AI_USE))],
    db: Annotated[Session, Depends(get_db)],
):
    sub = _digest_svc.subscribe(
        db=db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        digest_name=body.digest_name,
        schedule=body.schedule,
        channels=body.channels,
    )
    db.commit()
    return StandardResponse(data=DigestSubscriptionResponse.model_validate(sub))


@router.delete(
    "/digests/subscriptions/{subscription_id}",
    response_model=StandardResponse[DigestSubscriptionResponse],
    summary="Unsubscribe from a digest",
    tags=["AI"],
)
async def unsubscribe_from_digest(
    subscription_id: UUID,
    current_user: Annotated[User, Depends(require_permission(AI_USE))],
    db: Annotated[Session, Depends(get_db)],
):
    sub = _digest_svc.unsubscribe(
        db=db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        subscription_id=subscription_id,
    )
    db.commit()
    return StandardResponse(data=DigestSubscriptionResponse.model_validate(sub))
