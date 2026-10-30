"""Migration manager for Alembic migrations."""

import logging
import re
from importlib.metadata import entry_points
from pathlib import Path

from alembic import command, config, script
from alembic.runtime.migration import MigrationContext
from alembic.script.revision import RevisionError
from sqlalchemy import text

from app.core.config_file import get_settings
from app.core.db.session import engine
from app.core.migrations.models import MigrationInfo, MigrationResult, MigrationStatus

logger = logging.getLogger(__name__)


def _build_version_locations(backend_dir: Path) -> str:
    """Return newline-separated version_locations string for all module branches.

    Uses newline separator to match ``path_separator = newline`` in alembic.ini.
    """
    locations = [str(backend_dir / "migrations" / "versions")]
    for base in ("app/modules", "app/core"):
        search_base = backend_dir / base
        if search_base.is_dir():
            for module_dir in sorted(search_base.iterdir()):
                versions_dir = module_dir / "migrations" / "versions"
                if versions_dir.is_dir():
                    locations.append(str(versions_dir))
    # Scan externally installed modules for migration paths via entry_points
    for ep in entry_points(group="aiutox.modules"):
        try:
            cls = ep.load()
            if hasattr(cls, "get_migrations_path"):
                migrations_path = cls.get_migrations_path()
                if migrations_path and Path(migrations_path).is_dir():
                    normalized = str(Path(migrations_path).resolve())
                    if normalized not in locations:
                        locations.append(normalized)
        except Exception:
            pass

    return "\n".join(locations)


class MigrationManager:
    """Manager for Alembic migrations."""

    def __init__(self, alembic_cfg_path: Path | None = None):
        """Initialize migration manager.

        Args:
            alembic_cfg_path: Path to alembic.ini file. Defaults to backend/alembic.ini
        """
        if alembic_cfg_path is None:
            # Assume we're in backend directory
            backend_dir = Path(__file__).parent.parent.parent.parent
            alembic_cfg_path = backend_dir / "alembic.ini"

        backend_dir = alembic_cfg_path.parent
        self.alembic_cfg = config.Config(str(alembic_cfg_path))
        # Set version_locations before ScriptDirectory is created so CLI and
        # programmatic usage both discover module migration branches.
        self.alembic_cfg.set_main_option(
            "version_locations", _build_version_locations(backend_dir)
        )
        self.script_dir = script.ScriptDirectory.from_config(self.alembic_cfg)
        self.settings = get_settings()
        self.engine = engine

    def get_current_heads(self) -> list[str]:
        """Get every head revision recorded in the database.

        Returns:
            All current head revision IDs; empty if no migrations are applied
            or the database cannot be read.
        """
        try:
            with self.engine.connect() as connection:
                context = MigrationContext.configure(connection)
                return list(context.get_current_heads())
        except Exception as exc:
            # Every migration then reads as pending; say why
            logger.warning("Could not read the database heads: %s", exc)
            return []

    def get_current_revision(self) -> str | None:
        """Get current revision from database.

        Returns:
            Current revision ID or None if no migrations applied.
            If multiple heads exist, returns the first one (for backward compatibility).
        """
        with self.engine.connect() as connection:
            context = MigrationContext.configure(connection)
            try:
                # Try to get single revision first (backward compatibility)
                return context.get_current_revision()
            except Exception:
                # If multiple heads exist, get all heads and return first one
                try:
                    heads = context.get_current_heads()
                    return heads[0] if heads else None
                except Exception:
                    # Fallback: try to get from script directory
                    try:
                        heads = self.script_dir.get_heads()  # type: ignore[assignment]
                        return heads[0] if heads else None
                    except Exception:
                        return None

    def _scripts_by_path(self) -> dict[Path, script.Script]:
        """Map each migration file to its Alembic script (revision graph node)."""
        return {
            Path(rev_script.path).resolve(): rev_script
            for rev_script in self.script_dir.walk_revisions()
        }

    def _get_migration_info_from_file(
        self,
        file_path: Path,
        scripts_by_path: dict[Path, script.Script] | None = None,
    ) -> MigrationInfo | None:
        """Extract migration info from a migration file.

        The revision and its parent(s) come from the Alembic revision graph, so a
        merge revision reports all of its parents as a tuple.

        Args:
            file_path: Path to migration file
            scripts_by_path: Optional precomputed result of ``_scripts_by_path``

        Returns:
            MigrationInfo or None if file cannot be parsed
        """
        try:
            if scripts_by_path is None:
                scripts_by_path = self._scripts_by_path()
            rev_script = scripts_by_path.get(file_path.resolve())
            if rev_script is None:
                return None

            with open(file_path, encoding="utf-8") as f:
                content = f.read()

            # Extract description from docstring or comment
            description_match = re.search(
                r'"""([^"]+)"""|Revision ID: ([^\n]+)',
                content,
            )
            description = None
            if description_match:
                description = description_match.group(1) or description_match.group(2)

            down_revision = rev_script.down_revision
            if isinstance(down_revision, list):
                down_revision = tuple(down_revision)

            return MigrationInfo(
                revision=rev_script.revision,
                down_revision=down_revision,
                file=file_path.name,
                applied=False,  # Will be set later
                description=description,
            )
        except Exception:
            return None

    def _get_all_migration_files(self) -> list[MigrationInfo]:
        """Get all migration files from all version locations (core + modules).

        Returns:
            List of MigrationInfo objects
        """
        migrations = []
        scripts_by_path = self._scripts_by_path()
        for versions_dir in self.script_dir._version_locations:
            for file_path in sorted(Path(versions_dir).glob("*.py")):
                if file_path.name in ("__init__.py", "env.py"):
                    continue
                migration_info = self._get_migration_info_from_file(
                    file_path, scripts_by_path
                )
                if migration_info:
                    migrations.append(migration_info)
        return migrations

    def _get_applied_revisions(self, heads: list[str] | None = None) -> set[str]:
        """Revision IDs reachable from every database head, heads included."""
        applied: set[str] = set()
        for head in self.get_current_heads() if heads is None else heads:
            try:
                applied.update(
                    rev.revision
                    for rev in self.script_dir.revision_map.iterate_revisions(
                        head, "base", inclusive=True
                    )
                )
            except RevisionError:
                logger.warning(
                    "Database head %s is not in the migration files; "
                    "its ancestors are not counted as applied",
                    head,
                )
                continue
        return applied

    def get_applied_migrations(
        self,
        all_migrations: list[MigrationInfo] | None = None,
        applied_revisions: set[str] | None = None,
    ) -> list[MigrationInfo]:
        """Get list of applied migrations.

        A migration is applied when it is a database head or an ancestor of one,
        so several heads and merge revisions are all accounted for.

        Returns:
            List of applied MigrationInfo objects
        """
        if applied_revisions is None:
            applied_revisions = self._get_applied_revisions()
        if not applied_revisions:
            return []

        if all_migrations is None:
            all_migrations = self._get_all_migration_files()
        applied = []
        for migration in all_migrations:
            if migration.revision in applied_revisions:
                migration.applied = True
                applied.append(migration)

        # Sort by revision order (oldest first)
        applied.sort(key=lambda m: m.revision)

        return applied

    def get_pending_migrations(
        self,
        all_migrations: list[MigrationInfo] | None = None,
        applied_revisions: set[str] | None = None,
    ) -> list[MigrationInfo]:
        """Get list of pending migrations.

        Returns:
            List of pending MigrationInfo objects
        """
        if all_migrations is None:
            all_migrations = self._get_all_migration_files()
        if applied_revisions is None:
            applied_revisions = self._get_applied_revisions()

        if not applied_revisions:
            # No migrations applied, all are pending
            return all_migrations

        revision_map = {m.revision: m for m in all_migrations}

        # walk_revisions yields every revision from the heads down to the base,
        # parents after children; reverse it to get oldest first.
        pending = []
        for rev_script in reversed(list(self.script_dir.walk_revisions())):
            if rev_script.revision in applied_revisions:
                continue
            migration = revision_map.get(rev_script.revision)
            if migration:
                pending.append(migration)

        return pending

    def get_status(self) -> MigrationStatus:
        """Get complete migration status.

        Returns:
            MigrationStatus object
        """
        # One read of the database heads and one scan of the migration files
        heads = self.get_current_heads()
        all_migrations = self._get_all_migration_files()
        applied_revisions = self._get_applied_revisions(heads)
        applied = self.get_applied_migrations(all_migrations, applied_revisions)
        pending = self.get_pending_migrations(all_migrations, applied_revisions)

        # Same value get_current_revision() gives: the head, or the first of several
        current_revision = heads[0] if heads else None

        # Orphaned: recorded in the database, absent from the migration files
        known = {m.revision for m in all_migrations}
        orphaned = [head for head in heads if head not in known]

        return MigrationStatus(
            current_revision=current_revision,
            applied=applied,
            pending=pending,
            orphaned=orphaned,
        )

    def apply_migrations(self) -> MigrationResult:
        """Apply pending migrations.

        Returns:
            MigrationResult object
        """
        try:
            pending = self.get_pending_migrations()
            if not pending:
                return MigrationResult(
                    success=True,
                    applied_count=0,
                    warnings=["No pending migrations"],
                )

            # Capture output
            import io
            import sys

            old_stdout = sys.stdout
            sys.stdout = buffer = io.StringIO()

            try:
                # Use "heads" (plural) to handle multiple head revisions
                command.upgrade(self.alembic_cfg, "heads")
                buffer.getvalue()
            finally:
                sys.stdout = old_stdout

            applied_revisions = [m.revision for m in pending]

            return MigrationResult(
                success=True,
                applied_count=len(pending),
                applied_migrations=applied_revisions,
            )
        except Exception as e:
            return MigrationResult(
                success=False,
                errors=[str(e)],
            )

    def rollback(self, steps: int = 1) -> MigrationResult:
        """Rollback migrations.

        Args:
            steps: Number of migrations to rollback

        Returns:
            MigrationResult object
        """
        try:
            current_revision = self.get_current_revision()
            if not current_revision:
                return MigrationResult(
                    success=False,
                    errors=["No migrations to rollback"],
                )

            # Get target revision
            applied = self.get_applied_migrations()
            if len(applied) < steps:
                return MigrationResult(
                    success=False,
                    errors=[
                        f"Only {len(applied)} migrations applied, cannot rollback {steps}"
                    ],
                )

            target_revision = (
                applied[-(steps + 1)].revision if len(applied) > steps else None
            )

            import io
            import sys

            old_stdout = sys.stdout
            sys.stdout = buffer = io.StringIO()

            try:
                if target_revision:
                    command.downgrade(self.alembic_cfg, target_revision)
                else:
                    command.downgrade(self.alembic_cfg, "base")
                buffer.getvalue()
            finally:
                sys.stdout = old_stdout

            return MigrationResult(
                success=True,
                applied_count=-steps,  # Negative to indicate rollback
            )
        except Exception as e:
            return MigrationResult(
                success=False,
                errors=[str(e)],
            )

    def fresh(self) -> MigrationResult:
        """Drop all tables and re-run migrations.

        Returns:
            MigrationResult object
        """
        try:
            # Drop all tables using SQL to ensure everything is removed
            with self.engine.begin() as connection:
                # Get all table names in public schema
                result = connection.execute(text("""
                    SELECT tablename FROM pg_tables
                    WHERE schemaname = 'public'
                """))
                tables = [row[0] for row in result]

                # Drop all tables with CASCADE in a single transaction
                if tables:
                    # Build DROP statements
                    drop_statements = ", ".join([f'"{table}"' for table in tables])
                    connection.execute(
                        text(f"DROP TABLE IF EXISTS {drop_statements} CASCADE")
                    )

            # Run migrations from the beginning
            return self.apply_migrations()
        except Exception as e:
            return MigrationResult(
                success=False,
                errors=[str(e)],
            )

    def refresh(self) -> MigrationResult:
        """Rollback all migrations and re-run them.

        Returns:
            MigrationResult object
        """
        try:
            # Rollback all
            rollback_result = self.rollback(steps=999)  # Rollback all
            if not rollback_result.success:
                return rollback_result

            # Apply all
            return self.apply_migrations()
        except Exception as e:
            return MigrationResult(
                success=False,
                errors=[str(e)],
            )

    def create_migration(self, message: str, autogenerate: bool = True) -> str:
        """Create a new migration.

        Args:
            message: Migration description
            autogenerate: Whether to autogenerate from models

        Returns:
            Path to created migration file
        """
        import io
        import sys

        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()

        try:
            if autogenerate:
                command.revision(self.alembic_cfg, message=message, autogenerate=True)
            else:
                command.revision(self.alembic_cfg, message=message)

            output = buffer.getvalue()
            # Extract file path from output
            # Alembic outputs: "Generating migrations/versions/..."
            match = re.search(r"Generating\s+([^\s]+)", output)
            if match:
                return match.group(1)
            return "Migration created"
        finally:
            sys.stdout = old_stdout
