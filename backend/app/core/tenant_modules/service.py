"""Service for tenant module lifecycle management."""

import asyncio
import concurrent.futures
import io
import json
import zipfile
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.auth.models import RolePermission
from app.core.db.session import engine
from app.core.modules.snapshot_marker import mark_snapshots_source_removed
from app.core.pubsub import EventMetadata, get_event_publisher
from app.core.tenant_modules.models import TenantModule, TenantModuleState
from app.core.tenant_modules.resolver import DependencyResolver, InstallPlan
from app.core.tenant_modules.state_machine import TenantModuleStateMachine


def _run_async(coro: object) -> None:
    """Schedule a coroutine fire-and-forget. Skips if no running loop."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)  # type: ignore[arg-type]
    except RuntimeError:
        pass


def _run_async_blocking(coro: object) -> object:
    """Run a coroutine and block until it completes, even inside an async context."""

    def _run_in_thread() -> object:
        return asyncio.run(coro)  # type: ignore[arg-type]

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(_run_in_thread).result(timeout=30)


class ModuleNotFoundError(Exception):
    """Raised when a module is not found."""

    pass


class ModuleHasDependentsError(Exception):
    """Raised when trying to disable a module that other modules depend on."""

    pass


class InvalidModuleStateError(Exception):
    """Raised when an operation cannot be performed in current state."""

    pass


class TenantModuleService:
    """Service for managing module installation lifecycle per tenant."""

    # Grace period duration (90 days)
    GRACE_PERIOD_DAYS = 90

    def __init__(self, db: Session | None = None):
        """Initialize service.

        Args:
            db: Optional database session. If not provided, uses engine.connect()
        """
        self.db = db
        self.resolver = DependencyResolver()
        self.publisher = get_event_publisher()

    def _get_or_create_session(self) -> Session:
        """Get database session, creating one if needed."""
        if self.db:
            return self.db
        from sqlalchemy.orm import Session

        return Session(engine)

    def install(
        self,
        tenant_id: UUID,
        module_id: str,
        version: str = "1.0.0",
        tier: str = "basic",
    ) -> InstallPlan:
        """Install module with transitive dependency resolution.

        Args:
            tenant_id: Tenant ID
            module_id: Module to install
            version: Version string
            tier: Tier level (basic|pro|enterprise)

        Returns:
            InstallPlan with install order

        Raises:
            ModuleNotFoundError: If module not found in registry
        """
        db = self._get_or_create_session()

        # Verify module exists
        if not self.resolver.registry.get_module(module_id):
            raise ModuleNotFoundError(f"Module {module_id} not found")

        # Resolve dependencies
        plan = self.resolver.resolve_install_plan(module_id, version, tier)

        # Install each module in order
        for dep_module_id in plan.install_order:
            self._install_single(db, tenant_id, dep_module_id, version, tier)

        return plan

    def _install_single(
        self, db: Session, tenant_id: UUID, module_id: str, version: str, tier: str
    ) -> None:
        """Install a single module (internal).

        Args:
            db: Database session
            tenant_id: Tenant ID
            module_id: Module ID
            version: Version
            tier: Tier
        """
        # Check if already installed
        existing = (
            db.query(TenantModule)
            .filter_by(tenant_id=tenant_id, module=module_id)
            .first()
        )
        if existing:
            if existing.state == TenantModuleState.ACTIVE:
                return  # Already installed
            # Update if in different state
            existing.state = TenantModuleState.INSTALLING
        else:
            # Create new record
            existing = TenantModule(
                id=__import__("uuid").uuid4(),
                tenant_id=tenant_id,
                module=module_id,
                version=version,
                tier=tier,
                state=TenantModuleState.INSTALLING,
            )
            db.add(existing)

        db.flush()

        # Call on_install hook
        module = self.resolver.registry.get_module(module_id)
        if module:
            module.on_install(tenant_id, db)
            self._seed_role_permissions(db, tenant_id, module)

        # Transition to active
        existing.state = TenantModuleState.ACTIVE
        existing.installed_at = datetime.now(UTC)
        db.flush()

        # Publish event
        _run_async(
            self.publisher.publish(
                event_type="core.module.installed",
                entity_type="module",
                entity_id=existing.id,
                tenant_id=tenant_id,
                metadata=EventMetadata(
                    source="tenant_module_service",
                    additional_data={
                        "module": module_id,
                        "version": version,
                        "tier": tier,
                    },
                ),
            )
        )

    def _seed_role_permissions(
        self, db: Session, tenant_id: UUID, module: object
    ) -> None:
        """Seed the module's suggested (role, permission) defaults into RolePermission.

        These rows form an editable, per-tenant baseline — decoupled from the
        hardcoded MODULE_ROLES catalog — that tenants can later customize via
        the role-permissions management UI without losing the suggested
        defaults to a future catalog change. Idempotent: only inserts pairs
        that don't already exist for this tenant/role (the unique constraint
        on tenant_id/role/permission guards against duplicates on reinstall).
        """
        get_seeds = getattr(module, "get_role_permission_seeds", None)
        if get_seeds is None:
            return
        seeds = get_seeds()
        if not seeds:
            return

        existing = {
            (rp.role, rp.permission)
            for rp in db.query(RolePermission)
            .filter(RolePermission.tenant_id == tenant_id)
            .all()
        }

        for seed in seeds:
            if (seed.role, seed.permission) in existing:
                continue
            db.add(
                RolePermission(
                    tenant_id=tenant_id,
                    role=seed.role,
                    permission=seed.permission,
                )
            )
            existing.add((seed.role, seed.permission))

        db.flush()

    def disable(self, tenant_id: UUID, module_id: str) -> None:
        """Disable a module (reversible, disables dependents check).

        Args:
            tenant_id: Tenant ID
            module_id: Module to disable

        Raises:
            ModuleNotFoundError: If module not installed
            ModuleHasDependentsError: If other active modules depend on this
        """
        db = self._get_or_create_session()

        tm = (
            db.query(TenantModule)
            .filter_by(tenant_id=tenant_id, module=module_id)
            .first()
        )
        if not tm:
            raise ModuleNotFoundError(
                f"Module {module_id} not installed for tenant {tenant_id}"
            )

        if tm.state not in [TenantModuleState.ACTIVE, TenantModuleState.DISABLED]:
            raise InvalidModuleStateError(f"Cannot disable module in state {tm.state}")

        # Check for dependents
        if self._has_active_dependents(db, tenant_id, module_id):
            raise ModuleHasDependentsError(f"Module {module_id} has active dependents")

        # Validate state transition
        TenantModuleStateMachine.validate_transition(
            tm.state, TenantModuleState.DISABLED
        )

        tm.state = TenantModuleState.DISABLED
        tm.disabled_at = datetime.now(UTC)
        db.flush()

        # Publish event
        _run_async(
            self.publisher.publish(
                event_type="core.module.disabled",
                entity_type="module",
                entity_id=tm.id,
                tenant_id=tenant_id,
                metadata=EventMetadata(
                    source="tenant_module_service",
                    additional_data={"module": module_id},
                ),
            )
        )

    def enable(self, tenant_id: UUID, module_id: str) -> None:
        """Enable a disabled module.

        Args:
            tenant_id: Tenant ID
            module_id: Module to enable

        Raises:
            ModuleNotFoundError: If module not installed
            InvalidModuleStateError: If module not in disabled state
        """
        db = self._get_or_create_session()

        tm = (
            db.query(TenantModule)
            .filter_by(tenant_id=tenant_id, module=module_id)
            .first()
        )
        if not tm:
            raise ModuleNotFoundError(
                f"Module {module_id} not installed for tenant {tenant_id}"
            )

        # Validate state transition
        TenantModuleStateMachine.validate_transition(tm.state, TenantModuleState.ACTIVE)

        # Verify dependencies are active
        if not self._are_dependencies_active(db, tenant_id, module_id):
            raise InvalidModuleStateError(f"Dependencies of {module_id} are not active")

        tm.state = TenantModuleState.ACTIVE
        tm.disabled_at = None
        db.flush()

        # Publish event
        _run_async(
            self.publisher.publish(
                event_type="core.module.enabled",
                entity_type="module",
                entity_id=tm.id,
                tenant_id=tenant_id,
                metadata=EventMetadata(
                    source="tenant_module_service",
                    additional_data={"module": module_id},
                ),
            )
        )

    def uninstall_request(self, tenant_id: UUID, module_id: str) -> None:
        """Request uninstall of a module (starts 90-day grace period).

        Args:
            tenant_id: Tenant ID
            module_id: Module to uninstall

        Raises:
            ModuleNotFoundError: If module not installed
        """
        db = self._get_or_create_session()

        tm = (
            db.query(TenantModule)
            .filter_by(tenant_id=tenant_id, module=module_id)
            .first()
        )
        if not tm:
            raise ModuleNotFoundError(
                f"Module {module_id} not installed for tenant {tenant_id}"
            )

        # Validate transition
        TenantModuleStateMachine.validate_transition(
            tm.state, TenantModuleState.GRACE_PERIOD
        )

        tm.state = TenantModuleState.GRACE_PERIOD
        tm.grace_deadline = datetime.now(UTC) + timedelta(days=self.GRACE_PERIOD_DAYS)
        db.flush()

        # Publish event
        _run_async(
            self.publisher.publish(
                event_type="core.module.uninstall_requested",
                entity_type="module",
                entity_id=tm.id,
                tenant_id=tenant_id,
                metadata=EventMetadata(
                    source="tenant_module_service",
                    additional_data={
                        "module": module_id,
                        "deadline": tm.grace_deadline.isoformat(),
                    },
                ),
            )
        )

    def reactivate(self, tenant_id: UUID, module_id: str) -> None:
        """Cancel uninstall request and return to active state.

        Args:
            tenant_id: Tenant ID
            module_id: Module to reactivate

        Raises:
            ModuleNotFoundError: If module not in grace period
        """
        db = self._get_or_create_session()

        tm = (
            db.query(TenantModule)
            .filter_by(tenant_id=tenant_id, module=module_id)
            .first()
        )
        if not tm or tm.state != TenantModuleState.GRACE_PERIOD:
            raise ModuleNotFoundError(
                f"Module {module_id} not in grace period for tenant {tenant_id}"
            )

        # Validate transition
        TenantModuleStateMachine.validate_transition(tm.state, TenantModuleState.ACTIVE)

        tm.state = TenantModuleState.ACTIVE
        tm.grace_deadline = None
        db.flush()

        # Publish event
        _run_async(
            self.publisher.publish(
                event_type="core.module.reactivated",
                entity_type="module",
                entity_id=tm.id,
                tenant_id=tenant_id,
                metadata=EventMetadata(
                    source="tenant_module_service",
                    additional_data={"module": module_id},
                ),
            )
        )

    def export(self, tenant_id: UUID, module_id: str, user_id: UUID) -> dict:
        """Export module data as a ZIP file stored via core/files.

        Builds a ZIP containing:
        - manifest.json  (module metadata + record counts)
        - {table_name}.jsonl  (one JSON object per line per table)

        Transitions state: grace_period → exported.

        Args:
            tenant_id: Tenant ID
            module_id: Module to export
            user_id: User triggering the export (for file ownership)

        Returns:
            Dict with file_id, filename, and record_count

        Raises:
            ModuleNotFoundError: If module not installed
            InvalidModuleStateError: If not in grace_period state
        """
        db = self._get_or_create_session()

        tm = (
            db.query(TenantModule)
            .filter_by(tenant_id=tenant_id, module=module_id)
            .first()
        )
        if not tm:
            raise ModuleNotFoundError(
                f"Module {module_id} not installed for tenant {tenant_id}"
            )

        TenantModuleStateMachine.validate_transition(
            tm.state, TenantModuleState.EXPORTED
        )

        # Get module models
        module = self.resolver.registry.get_module(module_id)
        models = module.get_models() if module else []

        # Build export data
        from app.core.modules.export_service import ModuleExportService

        export_svc = ModuleExportService(db)
        export_data = export_svc.export_module_json(tenant_id, module_id, models)

        # Build ZIP in memory
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            # manifest.json
            manifest = {
                "module_id": module_id,
                "tenant_id": str(tenant_id),
                "exported_at": export_data["metadata"]["exported_at"],
                "record_count": export_data["metadata"]["record_count"],
                "tables": list(export_data["tables"].keys()),
            }
            zf.writestr("manifest.json", json.dumps(manifest, indent=2))

            # one JSONL per table
            for table_name, rows in export_data["tables"].items():
                lines = "\n".join(json.dumps(row) for row in rows)
                zf.writestr(f"{table_name}.jsonl", lines)

        zip_bytes = buf.getvalue()
        now_str = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        filename = f"export_{module_id}_{now_str}.zip"

        # Persist via core/files
        from typing import cast

        from app.core.files.models import File
        from app.core.files.service import FileService

        file_svc = FileService(db, tenant_id=tenant_id)
        file_obj = cast(
            File,
            _run_async_blocking(
                file_svc.upload_file(
                    file_content=zip_bytes,
                    filename=filename,
                    entity_type="module_export",
                    entity_id=tm.id,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    description=f"Data export for module {module_id}",
                    metadata={
                        "module_id": module_id,
                        "record_count": manifest["record_count"],
                    },
                )
            ),
        )

        # Transition state
        tm.state = TenantModuleState.EXPORTED
        tm.exported_at = datetime.now(UTC)
        if tm.metadata_json is None:
            tm.metadata_json = {}
        tm.metadata_json = {**tm.metadata_json, "export_file_id": str(file_obj.id)}
        db.flush()

        _run_async(
            self.publisher.publish(
                event_type="core.module.exported",
                entity_type="module",
                entity_id=tm.id,
                tenant_id=tenant_id,
                metadata=EventMetadata(
                    source="tenant_module_service",
                    additional_data={
                        "module": module_id,
                        "file_id": str(file_obj.id),
                        "record_count": manifest["record_count"],
                    },
                ),
            )
        )

        return {
            "file_id": str(file_obj.id),
            "filename": filename,
            "record_count": manifest["record_count"],
        }

    def hard_uninstall(self, tenant_id: UUID, module_id: str) -> dict:
        """Irreversibly delete all module data and run alembic downgrade.

        Must be called AFTER export() — requires exported state.
        Transitions state: exported → uninstalled.

        Args:
            tenant_id: Tenant ID
            module_id: Module to uninstall

        Returns:
            Dict with deleted_records summary

        Raises:
            ModuleNotFoundError: If module not installed
            InvalidModuleStateError: If not in exported state
        """
        import subprocess
        import sys

        db = self._get_or_create_session()

        tm = (
            db.query(TenantModule)
            .filter_by(tenant_id=tenant_id, module=module_id)
            .first()
        )
        if not tm:
            raise ModuleNotFoundError(
                f"Module {module_id} not installed for tenant {tenant_id}"
            )

        TenantModuleStateMachine.validate_transition(
            tm.state, TenantModuleState.UNINSTALLED
        )

        # Delete all tenant data for this module
        module = self.resolver.registry.get_module(module_id)
        models = module.get_models() if module else []

        from app.core.modules.uninstall_service import ModuleUninstallService

        uninstall_svc = ModuleUninstallService(db)
        result = uninstall_svc.execute_uninstall(tenant_id, module_id, models)

        # Downgrade the module's alembic branch to base
        backend_dir = __import__("pathlib").Path(__file__).parent.parent.parent.parent
        alembic_cfg = backend_dir / "alembic.ini"
        if alembic_cfg.exists():
            try:
                subprocess.run(
                    [
                        sys.executable,
                        "-m",
                        "alembic",
                        "-c",
                        str(alembic_cfg),
                        "downgrade",
                        f"{module_id}@base",
                    ],
                    cwd=str(backend_dir),
                    capture_output=True,
                    text=True,
                    check=False,
                )
            except Exception:
                pass  # downgrade failure is non-blocking; data is already deleted

        # Mark JSONB snapshots so consumers know source data is gone
        mark_snapshots_source_removed(db, tenant_id, module_id)

        # Transition state
        tm.state = TenantModuleState.UNINSTALLED
        tm.uninstalled_at = datetime.now(UTC)
        db.flush()

        _run_async(
            self.publisher.publish(
                event_type="core.module.uninstalled",
                entity_type="module",
                entity_id=tm.id,
                tenant_id=tenant_id,
                metadata=EventMetadata(
                    source="tenant_module_service",
                    additional_data={
                        "module": module_id,
                        "deleted_records": result.get("deleted_records", {}),
                    },
                ),
            )
        )

        return result

    def _has_active_dependents(
        self, db: Session, tenant_id: UUID, module_id: str
    ) -> bool:
        """Check if any active modules depend on this module.

        Args:
            db: Database session
            tenant_id: Tenant ID
            module_id: Module to check

        Returns:
            True if dependent modules exist, False otherwise
        """
        # Get all active modules
        active_modules = (
            db.query(TenantModule.module)
            .filter_by(tenant_id=tenant_id, state=TenantModuleState.ACTIVE)
            .all()
        )

        for active_mod_row in active_modules:
            active_mod = active_mod_row[0]
            mod = self.resolver.registry.get_module(active_mod)
            if mod and module_id in mod.get_dependencies():
                return True

        return False

    def _are_dependencies_active(
        self, db: Session, tenant_id: UUID, module_id: str
    ) -> bool:
        """Check if all dependencies of a module are active.

        Args:
            db: Database session
            tenant_id: Tenant ID
            module_id: Module to check

        Returns:
            True if all deps active, False otherwise
        """
        module = self.resolver.registry.get_module(module_id)
        if not module:
            return True

        for dep_id in module.get_dependencies():
            tm = (
                db.query(TenantModule)
                .filter_by(tenant_id=tenant_id, module=dep_id)
                .first()
            )
            if not tm or tm.state != TenantModuleState.ACTIVE:
                return False

        return True
