"""MSG-006: add crm_contact_message_log table.

Revision ID: 2026_07_11_msg_006_add_crm_contact_message_log
Revises: 2026_07_11_msg_001_encrypt_config_secrets
Create Date: 2026-07-11 00:00:00.000000+00:00

Tracks outbound messages sent to CRM Contacts over Telegram/WhatsApp/
Mattermost/Rocket.Chat, so the send-message endpoint can report status
immediately (202 + job_id) while a background retry job
(app.modules.crm.services.message_retry_job, registered via
AsyncTaskScheduler) processes pending/retryable rows asynchronously.

Mirrors WebhookDelivery's retry_count/status shape — the closest existing
precedent in this codebase for tracking a retryable outbound send,
even though WebhookDelivery's own retry path was never wired to a worker.

STOP: this migration must be reviewed and explicitly approved by the user
before being applied against any shared or production database, per
CLAUDE.md's migration risk policy. It is safe to apply against a
disposable local/dev/test database as part of normal implementation and
verification.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "2026_07_11_msg_006_add_crm_contact_message_log"
down_revision: str | None = "2026_07_11_msg_001_encrypt_config_secrets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "crm_contact_message_log",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "tenant_id",
            UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "contact_id",
            UUID(as_uuid=True),
            sa.ForeignKey("contacts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "sent_by_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("channel", sa.String(30), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "retry_count", sa.Integer, nullable=False, server_default=sa.text("0")
        ),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("extra_data", JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("sent_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending','sent','failed')",
            name="ck_crm_contact_message_log_status",
        ),
    )

    op.create_index(
        "ix_crm_contact_message_log_tenant_contact",
        "crm_contact_message_log",
        ["tenant_id", "contact_id"],
    )
    op.create_index(
        "ix_crm_contact_message_log_status",
        "crm_contact_message_log",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("ix_crm_contact_message_log_status", "crm_contact_message_log")
    op.drop_index(
        "ix_crm_contact_message_log_tenant_contact", "crm_contact_message_log"
    )
    op.drop_table("crm_contact_message_log")
