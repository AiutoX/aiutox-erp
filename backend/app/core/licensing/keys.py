"""RSA key store for License JWT signing and verification — P10-T01 + P10-T07."""

from __future__ import annotations

import os
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey


class LicenseKeyStore:
    """Loads and caches RSA keys used for License JWT operations.

    Public key: required for verify_token() at runtime.
    Private key: required only for aiutox license issue CLI (signing).
    """

    def __init__(
        self,
        public_key_path: str | None = None,
        private_key_path: str | None = None,
    ) -> None:
        self._public_key_path = public_key_path
        self._private_key_path = private_key_path
        self._public_key: RSAPublicKey | None = None
        self._private_key: RSAPrivateKey | None = None

    @classmethod
    def from_env(cls) -> LicenseKeyStore:
        """Build from environment variables."""
        return cls(
            public_key_path=os.getenv("AIUTOX_LICENSE_PUBLIC_KEY_PATH"),
            private_key_path=os.getenv("AIUTOX_LICENSE_PRIVATE_KEY_PATH"),
        )

    @property
    def public_key(self) -> RSAPublicKey:
        if self._public_key is None:
            if not self._public_key_path:
                raise ValueError("AIUTOX_LICENSE_PUBLIC_KEY_PATH not set")
            path = Path(self._public_key_path)
            if not path.exists():
                raise FileNotFoundError(f"License public key not found: {path}")
            pem = path.read_bytes()
            self._public_key = serialization.load_pem_public_key(pem)  # type: ignore[assignment]
        assert self._public_key is not None
        return self._public_key

    @property
    def private_key(self) -> RSAPrivateKey:
        if self._private_key is None:
            if not self._private_key_path:
                raise ValueError("AIUTOX_LICENSE_PRIVATE_KEY_PATH not set")
            path = Path(self._private_key_path)
            if not path.exists():
                raise FileNotFoundError(f"License private key not found: {path}")
            pem = path.read_bytes()
            self._private_key = serialization.load_pem_private_key(pem, password=None)  # type: ignore[assignment]
        assert self._private_key is not None
        return self._private_key


# Module-level singleton — populated at app startup by load_license_keys()
_key_store: LicenseKeyStore | None = None


def get_key_store() -> LicenseKeyStore:
    """Return the module-level key store (must be initialized at startup)."""
    global _key_store
    if _key_store is None:
        _key_store = LicenseKeyStore.from_env()
    return _key_store


def load_license_keys() -> None:
    """Called at app startup — eagerly loads public key to fail fast."""
    global _key_store
    _key_store = LicenseKeyStore.from_env()
    enforcement = os.getenv("AIUTOX_LICENSE_ENFORCEMENT", "on").lower()
    if enforcement == "on":
        _ = _key_store.public_key
