"""Add leases module: owners, tenants, lease_agreements, legal_notifications, payment_agreements

Revision ID: 2026_03_15_leases
Revises: 2026_03_15_properties
Create Date: 2026-03-15 12:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "2026_03_15_leases"
down_revision = "2026_03_15_properties"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── lease_owners ───────────────────────────────────────────────────────────
    op.create_table(
        "lease_owners",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("nombre", sa.String(300), nullable=False),
        sa.Column("tipo_doc", sa.String(10), nullable=False, server_default="CC"),
        sa.Column("num_doc", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefono", sa.String(50), nullable=True),
        sa.Column("tipo", sa.String(20), nullable=False, server_default="natural"),
        sa.Column("banco", sa.String(100), nullable=True),
        sa.Column("tipo_cuenta", sa.String(30), nullable=True),
        sa.Column("numero_cuenta", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_lease_owners_tenant_doc", "lease_owners", ["tenant_id", "num_doc"]
    )
    op.create_index(
        "idx_lease_owners_tenant_active", "lease_owners", ["tenant_id", "is_active"]
    )

    # ── lease_tenants ──────────────────────────────────────────────────────────
    op.create_table(
        "lease_tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("nombre", sa.String(300), nullable=False),
        sa.Column("tipo_doc", sa.String(10), nullable=False, server_default="CC"),
        sa.Column("num_doc", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefono", sa.String(50), nullable=True),
        sa.Column("tipo", sa.String(20), nullable=False, server_default="natural"),
        sa.Column("referencias", postgresql.JSONB, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_lease_tenants_tenant_doc", "lease_tenants", ["tenant_id", "num_doc"]
    )
    op.create_index(
        "idx_lease_tenants_tenant_active", "lease_tenants", ["tenant_id", "is_active"]
    )

    # ── lease_agreements ───────────────────────────────────────────────────────
    op.create_table(
        "lease_agreements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "property_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("properties.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lease_owners.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "tenant_person_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lease_tenants.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("tipo", sa.String(20), nullable=False, server_default="residencial"),
        sa.Column("canon_inicial", sa.Numeric(15, 2), nullable=False),
        sa.Column("canon_actual", sa.Numeric(15, 2), nullable=False),
        sa.Column("deposito", sa.Numeric(15, 2), nullable=False),
        sa.Column("fecha_inicio", sa.Date, nullable=False),
        sa.Column("fecha_fin", sa.Date, nullable=False),
        sa.Column(
            "indice_reajuste", sa.String(20), nullable=False, server_default="ipc_dane"
        ),
        sa.Column("ultimo_reajuste_fecha", sa.Date, nullable=True),
        sa.Column("estado", sa.String(20), nullable=False, server_default="borrador"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_lease_agreements_tenant_estado",
        "lease_agreements",
        ["tenant_id", "estado"],
    )
    op.create_index(
        "idx_lease_agreements_property",
        "lease_agreements",
        ["tenant_id", "property_id"],
    )
    op.create_index(
        "idx_lease_agreements_tenant_person",
        "lease_agreements",
        ["tenant_id", "tenant_person_id"],
    )
    op.create_index(
        "idx_lease_agreements_owner", "lease_agreements", ["tenant_id", "owner_id"]
    )

    # ── lease_legal_notifications ──────────────────────────────────────────────
    op.create_table(
        "lease_legal_notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "lease_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lease_agreements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tipo", sa.String(30), nullable=False),
        sa.Column(
            "metodo", sa.String(30), nullable=False, server_default="correo_certificado"
        ),
        sa.Column("fecha_envio", sa.Date, nullable=False),
        sa.Column("numero_guia", sa.String(100), nullable=True),
        sa.Column(
            "resultado", sa.String(30), nullable=False, server_default="pendiente"
        ),
        sa.Column("fecha_resultado", sa.Date, nullable=True),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_legal_notifications_lease",
        "lease_legal_notifications",
        ["tenant_id", "lease_id"],
    )
    op.create_index(
        "idx_legal_notifications_resultado",
        "lease_legal_notifications",
        ["tenant_id", "resultado"],
    )

    # ── lease_payment_agreements ───────────────────────────────────────────────
    op.create_table(
        "lease_payment_agreements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "lease_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lease_agreements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("cuotas", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("tasa_mora_acordada", sa.Numeric(10, 6), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="vigente"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("authorized_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_payment_agreements_lease",
        "lease_payment_agreements",
        ["tenant_id", "lease_id"],
    )
    op.create_index(
        "idx_payment_agreements_estado",
        "lease_payment_agreements",
        ["tenant_id", "estado"],
    )


def downgrade() -> None:
    op.drop_table("lease_payment_agreements")
    op.drop_table("lease_legal_notifications")
    op.drop_table("lease_agreements")
    op.drop_table("lease_tenants")
    op.drop_table("lease_owners")
