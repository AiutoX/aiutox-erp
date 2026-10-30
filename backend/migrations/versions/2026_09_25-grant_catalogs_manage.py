"""grant catalogs.manage to admin system role

Revision ID: 2026_09_25_grant_catalogs_manage
Revises: 2026_09_24_add_catalog_tables
Create Date: 2026-09-25

"""
from alembic import op

revision = "2026_09_25_grant_catalogs_manage"
down_revision = "2026_09_24_add_catalog_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Grant the tenant admin catalog-management permission to the global
    # admin system role, so tenant admins can relabel/reorder/hide/add/reset
    # catalog items (ISSUE-013 through ISSUE-022) via
    # CatalogPolicy.tenant_can_manage. owner already qualifies through its
    # "*" wildcard and needs no stored grant (has_permission() rule 4,
    # permissions.py:583 region).
    op.execute(
        """
        UPDATE roles
        SET permissions = permissions || '["catalogs.manage"]'::jsonb
        WHERE is_system = true
          AND name = 'admin'
          AND NOT permissions ? 'catalogs.manage'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE roles
        SET permissions = permissions - 'catalogs.manage'
        WHERE is_system = true
          AND name = 'admin'
        """
    )
