"""LicenseService — sign, verify, and inspect License JWTs — P10-T02+T03.

JWT shape:
  {
    "iss": "aiutox-licensing@aiutox.io",
    "sub": "<tenant_id>",
    "aud": "aiutox-erp",
    "iat": <unix_timestamp>,
    "exp": <unix_timestamp>,
    "jti": "<uuid4>",
    "modules": {"products": "pro", "maintenance": "cmms"},
    "features": ["custom_reports"]
  }

Algorithm: RS256 (RSA 4096 in prod, RSA 2048 acceptable in tests).
"""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import jwt as pyjwt

from app.core.licensing.exceptions import LicenseExpiredError, LicenseInvalidError
from app.core.licensing.keys import LicenseKeyStore

_ALGORITHM = "RS256"
_AUDIENCE = "aiutox-erp"
_DEFAULT_ISSUER = "aiutox-licensing@aiutox.io"


class LicenseService:
    """Signs and verifies License JWTs using RSA keys."""

    def __init__(
        self,
        key_store: LicenseKeyStore | None = None,
        issuer: str | None = None,
    ) -> None:
        self._key_store = key_store or LicenseKeyStore.from_env()
        self._issuer = issuer or os.getenv("AIUTOX_LICENSE_ISSUER", _DEFAULT_ISSUER)

    def sign_token(
        self,
        tenant_id: str,
        modules: dict[str, str],
        features: list[str] | None = None,
        expires_in_days: int = 365,
    ) -> str:
        """Sign a License JWT using the RSA private key."""
        now = datetime.now(UTC)
        payload: dict[str, Any] = {
            "iss": self._issuer,
            "sub": tenant_id,
            "aud": _AUDIENCE,
            "iat": now,
            "exp": now + timedelta(days=expires_in_days),
            "jti": str(uuid4()),
            "modules": modules,
            "features": features or [],
        }
        return pyjwt.encode(
            payload,
            self._key_store.private_key,
            algorithm=_ALGORITHM,
        )

    def verify_token(self, token: str) -> dict[str, Any]:
        """Verify a License JWT and return its decoded claims.

        Raises:
            LicenseExpiredError: if the token has expired
            LicenseInvalidError: if the signature or structure is invalid
        """
        try:
            return pyjwt.decode(
                token,
                self._key_store.public_key,
                algorithms=[_ALGORITHM],
                audience=_AUDIENCE,
            )
        except pyjwt.ExpiredSignatureError as e:
            raise LicenseExpiredError("License token has expired") from e
        except pyjwt.PyJWTError as e:
            raise LicenseInvalidError(f"License token is invalid: {e}") from e

    def get_tier(self, claims: dict[str, Any], module_id: str) -> str:
        """Extract tier for a module from decoded JWT claims. Defaults to 'basic'."""
        return claims.get("modules", {}).get(module_id, "basic")

    def get_expires_at(self, claims: dict[str, Any]) -> datetime:
        """Convert the exp claim to a timezone-aware datetime."""
        return datetime.fromtimestamp(claims["exp"], tz=UTC)
