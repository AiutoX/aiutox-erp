"""Telegram employee self-linking: link-code generation and consumption.

Generates a short-lived, single-use alphanumeric code an employee sends to
the tenant's Telegram bot to link their own account, following this
codebase's Redis incr+expire idiom for rate limiting (see
app.core.automation.ai.conversation_engine._check_rate_limit).
"""

import json
import secrets
import string
from typing import Any
from uuid import UUID

from fastapi import status

from app.core.exceptions import APIException

LINK_CODE_TTL_SECONDS = 600
LINK_CODE_LENGTH = 8
RATE_LIMIT_MAX_PER_HOUR = 5
RATE_LIMIT_WINDOW_SECONDS = 3600

# Excludes ambiguous characters (0/O, 1/I) for a code an employee has to
# type into Telegram by hand.
_CODE_ALPHABET = "".join(
    c for c in (string.ascii_uppercase + string.digits) if c not in "01OI"
)


def _generate_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(LINK_CODE_LENGTH))


async def generate_link_code(redis: Any, user_id: UUID, tenant_id: UUID) -> str:
    """Generate and store a single-use Telegram linking code for a user.

    Raises APIException(429) if the user has exceeded
    RATE_LIMIT_MAX_PER_HOUR requests in the current rolling hour.
    """
    rate_key = f"telegram:link_request:{user_id}"
    count = await redis.incr(rate_key)
    await redis.expire(rate_key, RATE_LIMIT_WINDOW_SECONDS)
    if count > RATE_LIMIT_MAX_PER_HOUR:
        raise APIException(
            code="TELEGRAM_LINK_RATE_LIMITED",
            message="Too many link-code requests. Try again later.",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    code = _generate_code()
    key = f"telegram:link:{code}"
    payload = json.dumps({"user_id": str(user_id), "tenant_id": str(tenant_id)})
    await redis.setex(key, LINK_CODE_TTL_SECONDS, payload)
    return code


async def consume_link_code(redis: Any, code: str) -> dict[str, str] | None:
    """Look up and delete a pending link code (single-use).

    Returns the {"user_id", "tenant_id"} payload if the code exists and has
    not expired, otherwise None. The code is deleted as soon as it is read,
    regardless of what the caller does with the result afterward.
    """
    key = f"telegram:link:{code}"
    raw = await redis.get(key)
    if raw is None:
        return None
    await redis.delete(key)
    return json.loads(raw)
