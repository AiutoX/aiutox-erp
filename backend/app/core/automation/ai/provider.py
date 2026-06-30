"""LLM provider abstraction — provider-agnostic interface for Anthropic and OpenAI."""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass
class LLMMessage:
    role: str  # "user" | "assistant" | "system" | "tool"
    content: str
    tool_call_id: str | None = None


@dataclass
class ToolDef:
    name: str
    description: str
    input_schema: dict


@dataclass
class LLMStreamChunk:
    type: str  # "text_delta" | "tool_call" | "tool_result" | "message_end" | "error"
    delta: str | None = None
    tool_name: str | None = None
    tool_args: dict | None = None
    usage: dict | None = None
    error: str | None = None


class LLMProvider(ABC):
    provider_type: str

    @abstractmethod
    def stream(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        tools: list[ToolDef],
        model: str,
        max_tokens: int,
        temperature: float = 0.0,
    ) -> AsyncIterator[LLMStreamChunk]: ...

    @abstractmethod
    async def complete(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        tools: list[ToolDef] | None,
        model: str,
        max_tokens: int,
    ) -> str: ...

    @abstractmethod
    async def embed(self, texts: list[str], *, model: str) -> list[list[float]]: ...

    @abstractmethod
    async def validate_key(self) -> bool: ...

    @abstractmethod
    def cost_for(
        self, *, model: str, input_tokens: int, output_tokens: int
    ) -> float: ...


# Per-million-token pricing (input, output) in USD
_ANTHROPIC_PRICING: dict[str, tuple[float, float]] = {
    "claude-haiku-4-5-20251001": (0.80, 4.00),
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-opus-4-8": (15.00, 75.00),
    # Legacy aliases
    "claude-3-haiku-20240307": (0.25, 1.25),
    "claude-3-5-sonnet-20241022": (3.00, 15.00),
    "claude-3-opus-20240229": (15.00, 75.00),
}

_OPENAI_PRICING: dict[str, tuple[float, float]] = {
    "gpt-4o": (2.50, 10.00),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4-turbo": (10.00, 30.00),
    "text-embedding-3-small": (0.02, 0.0),
    "text-embedding-3-large": (0.13, 0.0),
}


class AnthropicProvider(LLMProvider):
    provider_type = "anthropic"

    def __init__(self, api_key: str) -> None:
        import anthropic

        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    async def validate_key(self) -> bool:
        try:
            await self._client.models.list()
            return True
        except Exception:
            return False

    def cost_for(self, *, model: str, input_tokens: int, output_tokens: int) -> float:
        if model not in _ANTHROPIC_PRICING:
            return 0.0
        in_rate, out_rate = _ANTHROPIC_PRICING[model]
        return (input_tokens * in_rate + output_tokens * out_rate) / 1_000_000

    async def embed(self, texts: list[str], *, model: str) -> list[list[float]]:
        raise NotImplementedError(
            "Anthropic does not support embeddings — use OpenAIProvider for embed()"
        )

    def _format_messages(self, messages: list[LLMMessage]) -> list[dict]:
        return [
            {"role": m.role, "content": m.content}
            for m in messages
            if m.role != "system"
        ]

    def _format_tools(self, tools: list[ToolDef] | None) -> list[dict]:
        if not tools:
            return []
        return [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema,
            }
            for t in tools
        ]

    async def complete(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        tools: list[ToolDef] | None,
        model: str,
        max_tokens: int,
    ) -> str:
        anthropic_messages = self._format_messages(messages)
        anthropic_tools = self._format_tools(tools)

        kwargs: dict = {
            "model": model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": anthropic_messages,
        }
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        response = await self._client.messages.create(**kwargs)
        text_blocks = [b.text for b in response.content if hasattr(b, "text")]
        return "\n".join(text_blocks)

    async def _stream_impl(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        tools: list[ToolDef],
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> AsyncIterator[LLMStreamChunk]:
        anthropic_messages = self._format_messages(messages)
        anthropic_tools = self._format_tools(tools)

        async with self._client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=anthropic_messages,  # type: ignore[arg-type]
            tools=anthropic_tools or [],  # type: ignore[arg-type]
            temperature=temperature,
        ) as stream:
            async for event in stream:
                event_type = getattr(event, "type", None)
                if event_type == "content_block_delta":
                    text = getattr(getattr(event, "delta", None), "text", None)
                    if text:
                        yield LLMStreamChunk(type="text_delta", delta=text)
                elif event_type == "message_stop":
                    yield LLMStreamChunk(type="message_end")

    def stream(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        tools: list[ToolDef],
        model: str,
        max_tokens: int,
        temperature: float = 0.0,
    ) -> AsyncIterator[LLMStreamChunk]:
        return self._stream_impl(
            system=system,
            messages=messages,
            tools=tools,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )


class OpenAIProvider(LLMProvider):
    provider_type = "openai"

    def __init__(self, api_key: str, base_url: str | None = None) -> None:
        import openai

        kwargs: dict = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        self._client = openai.AsyncOpenAI(**kwargs)

    async def validate_key(self) -> bool:
        try:
            await self._client.models.list()
            return True
        except Exception:
            return False

    def cost_for(self, *, model: str, input_tokens: int, output_tokens: int) -> float:
        if model not in _OPENAI_PRICING:
            return 0.0
        in_rate, out_rate = _OPENAI_PRICING[model]
        return (input_tokens * in_rate + output_tokens * out_rate) / 1_000_000

    async def embed(self, texts: list[str], *, model: str) -> list[list[float]]:
        response = await self._client.embeddings.create(input=texts, model=model)
        return [item.embedding for item in response.data]

    def _format_messages(self, system: str, messages: list[LLMMessage]) -> list[dict]:
        result: list[dict] = [{"role": "system", "content": system}]
        for m in messages:
            result.append({"role": m.role, "content": m.content})
        return result

    @staticmethod
    def _sanitize_tool_name(name: str) -> str:
        return name.replace(".", "__")

    @staticmethod
    def _restore_tool_name(name: str) -> str:
        return name.replace("__", ".")

    def _format_tools(self, tools: list[ToolDef] | None) -> list[dict]:
        if not tools:
            return []
        return [
            {
                "type": "function",
                "function": {
                    "name": self._sanitize_tool_name(t.name),
                    "description": t.description,
                    "parameters": t.input_schema,
                },
            }
            for t in tools
        ]

    async def complete(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        tools: list[ToolDef] | None,
        model: str,
        max_tokens: int,
    ) -> str:
        openai_messages = self._format_messages(system, messages)
        openai_tools = self._format_tools(tools)

        kwargs: dict = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": openai_messages,
        }
        if openai_tools:
            kwargs["tools"] = openai_tools

        response = await self._client.chat.completions.create(**kwargs)
        msg = response.choices[0].message
        return msg.content or getattr(msg, "reasoning_content", "") or ""

    async def _stream_impl(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        tools: list[ToolDef],
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> AsyncIterator[LLMStreamChunk]:
        openai_messages = self._format_messages(system, messages)
        openai_tools = self._format_tools(tools)

        kwargs: dict = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": openai_messages,
            "temperature": temperature,
            "stream": True,
        }
        if openai_tools:
            kwargs["tools"] = openai_tools

        response = await self._client.chat.completions.create(**kwargs)
        async for chunk in response:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield LLMStreamChunk(type="text_delta", delta=delta.content)

    def stream(
        self,
        *,
        system: str,
        messages: list[LLMMessage],
        tools: list[ToolDef],
        model: str,
        max_tokens: int,
        temperature: float = 0.0,
    ) -> AsyncIterator[LLMStreamChunk]:
        return self._stream_impl(
            system=system,
            messages=messages,
            tools=tools,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
