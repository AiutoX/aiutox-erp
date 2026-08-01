"""Add entity_id, entity_type, document_type, issued_at to financial_documents

Revision ID: 2026_03_14_fin_doc_fields
Revises: 2026_03_14_index_rates
Create Date: 2026-03-14 18:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "2026_03_14_fin_doc_fields"
down_revision = "2026_03_14_index_rates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add entity reference columns for polymorphic P&L queries
    op.add_column(
        "financial_documents",
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "financial_documents",
        sa.Column("entity_type", sa.String(50), nullable=True),
    )
    # Semantic document type (invoice / receipt / expense / cost)
    op.add_column(
        "financial_documents",
        sa.Column("document_type", sa.String(50), nullable=True),
    )
    # Issue date for period-based filtering (separate from created_at)
    op.add_column(
        "financial_documents",
        sa.Column(
            "issued_at",
            sa.TIMESTAMP(timezone=True),
            nullable=True,
        ),
    )

    # Indexes for common query patterns
    op.create_index(
        "idx_fin_docs_entity",
        "financial_documents",
        ["entity_type", "entity_id"],
    )
    op.create_index(
        "idx_fin_docs_issued_at",
        "financial_documents",
        ["tenant_id", "issued_at"],
    )
    op.create_index(
        "idx_fin_docs_doc_type",
        "financial_documents",
        ["tenant_id", "document_type"],
    )


def downgrade() -> None:
    op.drop_index("idx_fin_docs_doc_type", table_name="financial_documents")
    op.drop_index("idx_fin_docs_issued_at", table_name="financial_documents")
    op.drop_index("idx_fin_docs_entity", table_name="financial_documents")
    op.drop_column("financial_documents", "issued_at")
    op.drop_column("financial_documents", "document_type")
    op.drop_column("financial_documents", "entity_type")
    op.drop_column("financial_documents", "entity_id")
