"""Canonical File models — files, versions, permissions, and folders."""

from datetime import UTC, datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.db.session import Base

if TYPE_CHECKING:
    from app.core.users.models import User  # noqa: F401


class StorageBackend(StrEnum):
    LOCAL = "local"
    S3 = "s3"
    HYBRID = "hybrid"


class FileEntityType(StrEnum):
    PRODUCT = "product"
    ORGANIZATION = "organization"
    CONTACT = "contact"
    USER = "user"
    ORDER = "order"
    INVOICE = "invoice"
    ACTIVITY = "activity"
    TASK = "task"
    PROPERTY = "property"


class File(Base):
    __tablename__ = "files"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)
    extension = Column(String(10), nullable=True)
    storage_backend = Column(String(20), nullable=False, default=StorageBackend.LOCAL)
    storage_path = Column(String(500), nullable=False)
    storage_url = Column(String(1000), nullable=True)
    folder_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    entity_type = Column(String(50), nullable=True, index=True)
    entity_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    description = Column(Text, nullable=True)
    file_metadata = Column("metadata", JSONB, nullable=True)
    version_number = Column(Integer, default=1, nullable=False)
    is_current = Column(Boolean, default=True, nullable=False, index=True)
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True, index=True)
    uploaded_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    uploaded_by_user = relationship("User", foreign_keys=[uploaded_by], lazy="select")
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_files_entity", "entity_type", "entity_id"),
        Index("idx_files_tenant_entity", "tenant_id", "entity_type", "entity_id"),
        Index("idx_files_current", "tenant_id", "is_current"),
    )

    def __init__(self, **kwargs: object) -> None:
        kwargs.setdefault("is_current", True)
        kwargs.setdefault("version_number", 1)
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"<File(id={self.id}, name={self.name}, tenant_id={self.tenant_id})>"


class FileVersion(Base):
    __tablename__ = "file_versions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    file_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number = Column(Integer, nullable=False)
    storage_path = Column(String(500), nullable=False)
    storage_backend = Column(String(20), nullable=False)
    size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    change_description = Column(Text, nullable=True)
    created_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    __table_args__ = (Index("idx_file_versions_file", "file_id", "version_number"),)

    def __repr__(self) -> str:
        return f"<FileVersion(id={self.id}, file_id={self.file_id}, version={self.version_number})>"


class FilePermission(Base):
    __tablename__ = "file_permissions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    file_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_type = Column(String(50), nullable=False)
    target_id = Column(PG_UUID(as_uuid=True), nullable=False)
    can_view = Column(Boolean, default=True, nullable=False)
    can_download = Column(Boolean, default=True, nullable=False)
    can_edit = Column(Boolean, default=False, nullable=False)
    can_delete = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_file_permissions_file", "file_id"),
        Index("idx_file_permissions_target", "target_type", "target_id"),
        Index("idx_file_permissions_tenant", "tenant_id", "target_type", "target_id"),
    )

    def __repr__(self) -> str:
        return f"<FilePermission(id={self.id}, file_id={self.file_id}, target={self.target_type}:{self.target_id})>"


class Folder(Base):
    """Folder model for organizing files in a hierarchical structure."""

    __tablename__ = "folders"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)
    icon = Column(String(50), nullable=True)
    parent_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    entity_type = Column(String(50), nullable=True, index=True)
    entity_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    folder_metadata = Column("metadata", JSONB, nullable=True)
    created_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    parent = relationship("Folder", remote_side=[id], backref="children")
    files = relationship("File", backref="folder", lazy="dynamic")

    __table_args__ = (
        Index("idx_folders_tenant_parent", "tenant_id", "parent_id"),
        Index("idx_folders_entity", "entity_type", "entity_id"),
        Index("idx_folders_tenant_entity", "tenant_id", "entity_type", "entity_id"),
        Index("idx_folders_name", "tenant_id", "parent_id", "name"),
    )

    def __repr__(self) -> str:
        return f"<Folder(id={self.id}, name={self.name}, tenant_id={self.tenant_id}, parent_id={self.parent_id})>"


class FolderPermission(Base):
    """Folder permission model for access control."""

    __tablename__ = "folder_permissions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    folder_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_type = Column(String(50), nullable=False)
    target_id = Column(PG_UUID(as_uuid=True), nullable=False)
    can_view = Column(Boolean, default=True, nullable=False)
    can_create_files = Column(Boolean, default=False, nullable=False)
    can_create_folders = Column(Boolean, default=False, nullable=False)
    can_edit = Column(Boolean, default=False, nullable=False)
    can_delete = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_folder_permissions_folder", "folder_id"),
        Index("idx_folder_permissions_target", "target_type", "target_id"),
        Index("idx_folder_permissions_tenant", "tenant_id", "target_type", "target_id"),
    )

    def __repr__(self) -> str:
        return f"<FolderPermission(id={self.id}, folder_id={self.folder_id}, target={self.target_type}:{self.target_id})>"


__all__ = [
    "File",
    "FileEntityType",
    "FilePermission",
    "FileVersion",
    "Folder",
    "FolderPermission",
    "StorageBackend",
]
