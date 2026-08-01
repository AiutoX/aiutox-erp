"""Add 'digest' to capability_type CHECK constraint.

Revision ID: 2026_06_17_add_digest_capability_type
Revises: 2026_06_16_add_channel_identities
Create Date: 2026-06-17 00:00:00.000000+00:00

"""

from collections.abc import Sequence

from alembic import op

revision: str = "2026_06_17_add_digest_capability_type"
down_revision: str | None = "2026_06_16_add_channel_identities"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_ai_capability_registrations_capability_type",
        "ai_capability_registrations",
        type_="check",
    )
    op.create_check_constraint(
        "ck_ai_capability_registrations_capability_type",
        "ai_capability_registrations",
        "capability_type IN ('conversational','operational','automation','digest')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_ai_capability_registrations_capability_type",
        "ai_capability_registrations",
        type_="check",
    )
    op.create_check_constraint(
        "ck_ai_capability_registrations_capability_type",
        "ai_capability_registrations",
        "capability_type IN ('conversational','operational','automation')",
    )
