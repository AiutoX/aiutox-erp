"""Evolution API notification provider for WhatsApp."""

import asyncio
import logging
import re
import time
from collections import defaultdict
from typing import Any

import aiohttp

from app.core.config_file import get_settings
from app.core.notifications.providers.base_provider import NotificationProvider

logger = logging.getLogger(__name__)

# In-memory rate limit buckets: {tenant_id: [timestamps]}
# Falls back to this when Redis is unavailable
_rate_buckets: dict[str, list[float]] = defaultdict(list)
_rate_lock = asyncio.Lock()


async def _check_rate_limit_redis(tenant_key: str, limit: int) -> bool:
    """Check rate limit using Redis sliding window. Returns True if allowed."""
    try:
        from app.core.redis import get_redis_client

        redis = await get_redis_client()
        now = time.time()
        window_start = now - 60  # 1-minute window

        pipe = redis.pipeline()
        # Remove old entries outside window
        pipe.zremrangebyscore(tenant_key, 0, window_start)
        # Count current entries
        pipe.zcard(tenant_key)
        # Add current timestamp
        pipe.zadd(tenant_key, {str(now): now})
        # Set TTL to 70s (window + buffer)
        pipe.expire(tenant_key, 70)
        results = await pipe.execute()

        current_count = results[1]
        return current_count < limit
    except Exception:
        return False  # Signal fallback to in-memory


async def _check_rate_limit_memory(tenant_key: str, limit: int) -> bool:
    """Fallback in-memory rate limit check."""
    async with _rate_lock:
        now = time.time()
        window_start = now - 60
        bucket = _rate_buckets[tenant_key]
        # Prune old entries
        _rate_buckets[tenant_key] = [t for t in bucket if t > window_start]
        if len(_rate_buckets[tenant_key]) >= limit:
            return False
        _rate_buckets[tenant_key].append(now)
        return True


async def _is_within_rate_limit(tenant_id: str | None, limit: int) -> bool:
    """Check if tenant is within rate limit. Returns True if allowed."""
    if not tenant_id:
        tenant_id = "global"
    tenant_key = f"rate_limit:whatsapp:{tenant_id}"

    result = await _check_rate_limit_redis(tenant_key, limit)
    if result is None:
        # Redis unavailable — fallback to memory
        return await _check_rate_limit_memory(tenant_key, limit)
    return result


class EvolutionApiProvider(NotificationProvider):
    """WhatsApp notification provider using Evolution API."""

    def __init__(self):
        """Initialize Evolution API provider with API credentials."""
        self.settings = get_settings()
        self.api_base_url = self.settings.EVOLUTION_API_URL
        self.instance_name = self.settings.EVOLUTION_INSTANCE_NAME
        # Rate limit: max messages per tenant per minute
        self._rate_limit = self.settings.EVOLUTION_RATE_LIMIT_PER_MINUTE

    @property
    def channel_name(self) -> str:
        """Return the channel name."""
        return "whatsapp"

    def _get_headers(self) -> dict[str, str]:
        """Build request headers. API key is never logged."""
        return {
            "apikey": self.settings.EVOLUTION_API_KEY,
            "Content-Type": "application/json",
        }

    async def validate_recipient(self, recipient: str) -> bool:
        """Validate WhatsApp phone number format.

        Args:
            recipient: Phone number to validate (format: 55XXXXXXXXXX)

        Returns:
            True if valid phone format, False otherwise
        """
        phone_pattern = r"^\d{10,15}$"
        return bool(re.match(phone_pattern, recipient.replace("+", "")))

    async def send(
        self,
        recipient: str,
        subject: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send WhatsApp message via Evolution API.

        Args:
            recipient: WhatsApp phone number (with country code, no +)
            subject: Message subject (used as bold header in WhatsApp)
            body: Message body
            data: Additional data. Supports 'tenant_id' key for per-tenant rate limiting.

        Returns:
            Dictionary with send result
        """
        if not self.settings.EVOLUTION_API_URL or not self.settings.EVOLUTION_API_KEY:
            logger.warning("Evolution API not configured — skipping WhatsApp send")
            return {
                "success": False,
                "error": "Evolution API not configured",
                "channel": "whatsapp",
            }

        # Validate recipient
        if not await self.validate_recipient(recipient):
            return {
                "success": False,
                "error": f"Invalid WhatsApp phone number: {recipient}",
                "channel": "whatsapp",
            }

        # Per-tenant rate limit check
        tenant_id = str((data or {}).get("tenant_id", "global"))
        if not await _is_within_rate_limit(tenant_id, self._rate_limit):
            logger.warning(
                "WhatsApp rate limit exceeded for tenant %s (limit: %d/min)",
                tenant_id,
                self._rate_limit,
            )
            return {
                "success": False,
                "error": "Rate limit exceeded",
                "channel": "whatsapp",
            }

        message_text = f"*{subject}*\n\n{body}" if subject else body

        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.api_base_url}/message/sendText/{self.instance_name}"
                payload = {
                    "number": recipient,
                    "text": message_text,
                }

                async with session.post(
                    url,
                    json=payload,
                    headers=self._get_headers(),
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    if response.status in (200, 201):
                        result = await response.json()
                        logger.info("WhatsApp message sent to %s", recipient)
                        return {
                            "success": True,
                            "message_id": result.get("key", {}).get("id", ""),
                            "channel": "whatsapp",
                        }

                    if response.status == 429:
                        logger.warning(
                            "Evolution API rate limit (429) for recipient %s", recipient
                        )
                        return {
                            "success": False,
                            "error": "Evolution API rate limit (429)",
                            "channel": "whatsapp",
                        }

                    if response.status == 400:
                        logger.warning(
                            "Evolution API invalid number (400) for recipient %s",
                            recipient,
                        )
                        return {
                            "success": False,
                            "error": "Invalid number (400)",
                            "channel": "whatsapp",
                        }

                    # 500 or other server errors
                    logger.error(
                        "Evolution API server error %d for recipient %s",
                        response.status,
                        recipient,
                    )
                    return {
                        "success": False,
                        "error": f"Evolution API error: {response.status}",
                        "channel": "whatsapp",
                    }

        except TimeoutError:
            logger.error("Timeout sending WhatsApp message to %s", recipient)
            return {"success": False, "error": "Request timeout", "channel": "whatsapp"}
        except Exception as e:
            logger.error("Failed to send WhatsApp message to %s: %s", recipient, e)
            return {"success": False, "error": str(e), "channel": "whatsapp"}

    async def send_batch(
        self,
        recipients: list[str],
        subject: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Send WhatsApp messages to multiple recipients concurrently."""
        tasks = [self.send(recipient, subject, body, data) for recipient in recipients]
        return await asyncio.gather(*tasks)
