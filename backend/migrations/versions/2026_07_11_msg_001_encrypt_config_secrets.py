"""MSG-001 / SEC-001: encrypt existing plaintext SMTP password, SMS
auth_token, and webhook secret in system_configs and config_versions.

Revision ID: 2026_07_11_msg_001_encrypt_config_secrets
Revises: 2026_07_02_add_gamification_tables
Create Date: 2026-07-11 00:00:00.000000+00:00

Data-only migration (no schema change). Encrypts the current plaintext
values of three ConfigService-managed keys under module "notifications"
using the existing per-tenant Fernet mechanism
(app.core.security.encryption.encrypt_credentials), matching the
transparent encrypt/decrypt hooks added to ConfigService in the same
change (SENSITIVE_KEYS registry).

Idempotency: since Fernet ciphertext is opaque and there is no app-level
"already encrypted" marker, upgrade() uses a decrypt-attempt heuristic —
if a stored value decrypts successfully under the row's tenant key, it is
assumed already encrypted and skipped. This is safe to re-run but is not
a cryptographic guarantee (see decrypt_credentials's InvalidToken
handling for why this is robust in practice: Fernet includes an HMAC
check, so a false positive on genuine plaintext is vanishingly unlikely).

downgrade() is a best-effort decrypt back to plaintext, provided for
local/dev rollback convenience only — see its docstring for caveats.

STOP: this migration must be reviewed and explicitly approved by the user
before being applied against any shared or production database, per
CLAUDE.md's migration risk policy and issue MSG-001's Definition of Done.
It is safe to apply against a disposable local/dev/test database as part
of normal implementation and verification.
"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.core.security.encryption import decrypt_credentials, encrypt_credentials

# revision identifiers, used by Alembic.
revision: str = "2026_07_11_msg_001_encrypt_config_secrets"
down_revision: str | None = "2026_07_02_add_gamification_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MODULE = "notifications"
SENSITIVE_KEYS = (
    "channels.smtp.password",
    "channels.sms.auth_token",
    "channels.webhook.secret",
)

TABLES = ("system_configs", "config_versions")


def _already_encrypted(value: str, tenant_id) -> bool:
    """Heuristic: if it decrypts cleanly under the tenant's key, assume
    it is already ciphertext from a prior run of this migration."""
    try:
        decrypt_credentials(value, tenant_id)
        return True
    except ValueError:
        return False


def upgrade() -> None:
    conn = op.get_bind()

    for table in TABLES:
        rows = conn.execute(
            sa.text(
                f"""
                SELECT id, tenant_id, value
                FROM {table}
                WHERE module = :module AND key = ANY(:keys)
                """
            ),
            {"module": MODULE, "keys": list(SENSITIVE_KEYS)},
        ).fetchall()

        for row in rows:
            value = row.value
            if not value:
                continue
            if _already_encrypted(value, row.tenant_id):
                continue

            encrypted = encrypt_credentials(str(value), row.tenant_id)
            conn.execute(
                sa.text(f"UPDATE {table} SET value = :v WHERE id = :id"),
                {"v": json.dumps(encrypted), "id": row.id},
            )


def downgrade() -> None:
    """Best-effort downgrade: decrypts values back to plaintext.

    WARNING: not a guaranteed clean inverse. If upgrade() was somehow run
    in a way that bypassed the idempotency heuristic, or rows were
    manually re-encrypted, this will not perfectly undo those edge cases.
    Rows that fail to decrypt (already plaintext, or genuinely corrupt)
    are left untouched rather than raising. Provided for local/dev
    rollback convenience only — do not rely on this for a production
    rollback without manually verifying row-by-row state first.
    """
    conn = op.get_bind()

    for table in TABLES:
        rows = conn.execute(
            sa.text(
                f"""
                SELECT id, tenant_id, value
                FROM {table}
                WHERE module = :module AND key = ANY(:keys)
                """
            ),
            {"module": MODULE, "keys": list(SENSITIVE_KEYS)},
        ).fetchall()

        for row in rows:
            value = row.value
            if not value:
                continue
            try:
                plaintext = decrypt_credentials(value, row.tenant_id)
            except ValueError:
                continue

            conn.execute(
                sa.text(f"UPDATE {table} SET value = :v WHERE id = :id"),
                {"v": json.dumps(plaintext), "id": row.id},
            )
