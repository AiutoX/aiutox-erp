from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.automation.ai.channel_manager import SUPPORTED_CHANNELS


class ERPContext(BaseModel):
    module: str | None = None
    record_id: UUID | None = None
    record_type: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: UUID | None = None
    channel: str = Field(default="embedded_chat")
    erp_context: ERPContext = Field(default_factory=ERPContext)

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, v: str) -> str:
        if v not in SUPPORTED_CHANNELS:
            raise ValueError(
                f"Channel '{v}' is not supported. Supported: {sorted(SUPPORTED_CHANNELS)}"
            )
        return v


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    user_id: UUID
    channel: str
    status: str
    title: str | None
    created_at: datetime
    updated_at: datetime


class ConversationUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    status: str | None = Field(None, pattern="^(active|archived)$")


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    metadata: dict
    status: str
    created_at: datetime


class CapabilityMetricEntry(BaseModel):
    capability: str
    invocation_count: int
    avg_latency_ms: float
    error_rate_pct: float


class CapabilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    qualified_name: str
    module_name: str
    description: str
    capability_type: str
    permission_required: str
    metrics: CapabilityMetricEntry | None = None


class ProviderConfigCreate(BaseModel):
    provider_type: str = Field(..., pattern="^(anthropic|openai|openai-compatible)$")
    api_key: str | None = Field(None, min_length=10)
    base_url: str | None = None
    model_conversation: str
    model_classifier: str
    model_embeddings: str


class ProviderConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    provider_type: str
    base_url: str | None = None
    is_active: bool
    model_conversation: str
    model_classifier: str
    model_embeddings: str
    updated_at: datetime | None = None


class CursorPage(BaseModel):
    next_cursor: str | None = None
    has_more: bool = False
    total: int = 0


class AIConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    cache_ttl_seconds: int = 300
    rate_limit_max: int = 100
    rate_limit_window_seconds: int = 3600
    classification_stages: list[str] = Field(
        default=["context_router", "rules_engine", "small_llm"]
    )
    token_budgets: dict[str, int] = Field(
        default={
            "small_query": 2048,
            "standard": 4096,
            "complex": 8192,
            "advanced": 16384,
        }
    )
    supported_channels: list[str] = Field(default=["embedded_chat"])
    pubsub_enabled: bool = True
    max_capability_response_tokens: int = 8000
    compaction_threshold: int = 20
    auto_archive_after_days: int = 0
    hard_delete_after_days: int = 0


class AIConfigUpdate(BaseModel):
    cache_ttl_seconds: int | None = Field(None, ge=0, le=3600)
    rate_limit_max: int | None = Field(None, ge=1, le=10000)
    rate_limit_window_seconds: int | None = Field(None, ge=60, le=86400)
    classification_stages: list[str] | None = None
    token_budgets: dict[str, int] | None = None
    supported_channels: list[str] | None = None
    pubsub_enabled: bool | None = None
    max_capability_response_tokens: int | None = Field(None, ge=512, le=32768)
    compaction_threshold: int | None = Field(None, ge=5, le=500)
    auto_archive_after_days: int | None = Field(None, ge=0, le=3650)
    hard_delete_after_days: int | None = Field(None, ge=0, le=3650)


class CostPeriodEntry(BaseModel):
    date: str
    cost_usd: float
    token_count: int


class CostByCapabilityEntry(BaseModel):
    capability: str
    total_cost_usd: float
    invocation_count: int
    avg_latency_ms: float


class CostByUserEntry(BaseModel):
    user_id: str
    conversations: int
    token_count: int
    cost_usd: float


class CostAnalyticsOut(BaseModel):
    period: dict[str, str]
    by_day: list[CostPeriodEntry]
    by_capability: list[CostByCapabilityEntry]
    by_user: list[CostByUserEntry] | None = None


class DigestSubscriptionCreate(BaseModel):
    digest_name: str = Field(..., min_length=1, max_length=255)
    schedule: str = Field(..., pattern="^(daily|weekly|monthly)$")
    channels: list[str] = Field(default=["in-app"])

    @field_validator("channels")
    @classmethod
    def validate_channels(cls, v: list[str]) -> list[str]:
        for ch in v:
            if ch not in SUPPORTED_CHANNELS:
                raise ValueError(
                    f"Channel '{ch}' not supported. Supported: {sorted(SUPPORTED_CHANNELS)}"
                )
        return v


class DigestSubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    user_id: UUID
    digest_name: str
    schedule: str
    channels: list[str]
    params: dict
    is_active: bool
    next_fire_at: datetime
    last_fired_at: datetime | None
    created_at: datetime
