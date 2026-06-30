import os
from importlib.metadata import entry_points
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool, text

from app.core.config_file import get_settings
from app.core.db.session import Base

# Import automation2 AI models
from app.core.automation.ai.models import (  # noqa: F401
    AICapabilityRegistration,
    AIConversation,
    AIConversationMemory,
    AIConversationMessage,
    AILLMProviderConfig,
)

# Import all models so Alembic can detect them
from app.models import (  # noqa: F401
    AuditLog,
    Contact,
    ContactMethod,
    Mention,
    PersonIdentification,
    SystemConfig,
)
from app.core.auth.models import DelegatedPermission, ModuleRole, RefreshToken  # noqa: F401
from app.core.tenants.models import Tenant  # noqa: F401
from app.core.users.models import Organization, User, UserRole  # noqa: F401

# Import billing and finances models
from app.modules.billing.models import (  # noqa: F401
    Charge,
    OwnerLiquidation,
    Payment,
    PaymentPlan,
)
from app.modules.finances.models import (  # noqa: F401
    FinancialDocument,
    FinancialPeriod,
    OwnerAccount,
)

# Import CRM models from modules
from app.modules.crm.models.crm import (  # noqa: F401
    Lead,
    Opportunity,
    Pipeline,
)

# Import data_collection Medium models
from app.modules.data_collection.models.case import DCCase  # noqa: F401
from app.modules.data_collection.models.dashboard import DCDashboard  # noqa: F401

# Import data_collection models
from app.modules.data_collection.models.form import DCForm  # noqa: F401
from app.modules.data_collection.models.form_folder import DCFormFolder  # noqa: F401
from app.modules.data_collection.models.form_group import DCFormGroup  # noqa: F401
from app.modules.data_collection.models.form_version import DCFormVersion  # noqa: F401
from app.modules.data_collection.models.lookup_table import DCLookupTable  # noqa: F401
from app.modules.data_collection.models.respondent_link import (
    DCRespondentLink,  # noqa: F401
)
from app.modules.data_collection.models.submission import DCFormSubmission  # noqa: F401
from app.modules.data_collection.models.sync_event import DCSyncEvent  # noqa: F401
from app.modules.data_collection.models.sync_state import DCSyncState  # noqa: F401

# Import inventory models from modules
from app.modules.inventory.models.inventory import (  # noqa: F401
    Location,
    StockMove,
    Warehouse,
)

try:
    from aiutox_module_products.models.product import (  # noqa: F401
        Category,
        Product,
        ProductBarcode,
        ProductVariant,
    )
except ImportError:
    pass

# Import core platform models
from app.core.marketplace.models import MarketplacePurchase  # noqa: F401
from app.core.work_items.models import WorkItem, WorkItemArchive  # noqa: F401
from app.core.widgets.models import UserWidgetPreference  # noqa: F401

# this is the Alembic Config object
config = context.config


def _build_version_locations() -> list[str]:
    """Build version_locations dynamically based on existing module migrations.

    Returns list of migration folder paths:
      - Core migrations: backend/migrations/versions
      - Module migrations: backend/app/modules/{name}/migrations/versions (if folder exists)
      - Core service migrations: backend/app/core/{name}/migrations/versions (if folder exists)

    This scans the modules directory for any migration folders,
    making the system agnostic to the module registry.
    """
    locations = []

    # Always include core migrations
    core_migrations = os.path.join(os.path.dirname(__file__), "versions")
    locations.append(core_migrations)

    # Scan app/modules directory for migration folders
    modules_base = os.path.join(os.path.dirname(__file__), "..", "app", "modules")

    if os.path.isdir(modules_base):
        for module_name in sorted(os.listdir(modules_base)):
            module_path = os.path.join(modules_base, module_name)
            if not os.path.isdir(module_path):
                continue

            # Check if this module has a migrations/versions folder
            module_migrations = os.path.join(module_path, "migrations", "versions")
            module_migrations = os.path.normpath(module_migrations)

            if os.path.isdir(module_migrations):
                locations.append(module_migrations)

    # Scan app/core directory for core services with their own migration branches
    # (e.g. core/tasks which behaves as an infrastructure module, not a business module)
    core_base = os.path.join(os.path.dirname(__file__), "..", "app", "core")

    if os.path.isdir(core_base):
        for service_name in sorted(os.listdir(core_base)):
            service_path = os.path.join(core_base, service_name)
            if not os.path.isdir(service_path):
                continue
            service_migrations = os.path.join(service_path, "migrations", "versions")
            service_migrations = os.path.normpath(service_migrations)
            if os.path.isdir(service_migrations):
                locations.append(service_migrations)

    # Scan externally installed modules for migration paths via entry_points
    for ep in entry_points(group="aiutox.modules"):
        try:
            cls = ep.load()
            if hasattr(cls, "get_migrations_path"):
                migrations_path = cls.get_migrations_path()
                if migrations_path and os.path.isdir(migrations_path):
                    normalized = os.path.normpath(migrations_path)
                    if normalized not in locations:
                        locations.append(normalized)
        except Exception:
            pass

    return locations


# Set version_locations on the Alembic config object BEFORE ScriptDirectory is created.
# This ensures 'alembic heads', 'alembic history', 'alembic current' and all CLI
# inspection commands can discover module migration branches without running migrations.
# Without this, those commands only see migrations/versions/ (the script_location default).
_version_locations = _build_version_locations()
config.set_main_option("version_locations", "\n".join(_version_locations))

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Get database URL from settings (can be overridden by Alembic config)
settings = get_settings()
# Only set from settings if not already set in config (allows test overrides)
if (
    not config.get_main_option("sqlalchemy.url")
    or config.get_main_option("sqlalchemy.url") == "driver://user:pass@localhost/dbname"
):
    config.set_main_option("sqlalchemy.url", settings.database_url)

# add your model's MetaData object here
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    version_locations = _build_version_locations()

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
        version_locations=version_locations,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    # Get database URL from Alembic config (allows test overrides)
    # Fallback to settings if not set in config
    database_url = config.get_main_option("sqlalchemy.url") or settings.database_url

    # Create engine directly to avoid encoding issues with engine_from_config
    # Use connect_args to pass connection parameters directly if URL encoding fails
    connectable = None
    try:
        # First, try with the URL as-is
        connectable = create_engine(
            database_url,
            poolclass=pool.NullPool,
            echo=False,
            future=True,
            # Explicitly set client encoding
            connect_args={
                "options": "-c client_encoding=utf8",
            },
        )
        # Test the connection to catch encoding errors early
        with connectable.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
    except (UnicodeDecodeError, UnicodeError, Exception) as e:
        # Check if it's an encoding error
        if (
            isinstance(e, (UnicodeDecodeError, UnicodeError))
            or "utf-8" in str(e).lower()
            or "codec" in str(e).lower()
        ):
            # If there's an encoding error, try using connection parameters directly
            import sys

            print(
                "\n⚠️  Warning: Encoding issue detected, trying alternative connection method...",
                file=sys.stderr,
            )
            try:
                # Use direct connection parameters to completely bypass URL parsing
                # This avoids all encoding issues with the URL string
                print(
                    "   Using direct connection parameters to avoid encoding issues...",
                    file=sys.stderr,
                )

                # Clean password - handle encoding issues more aggressively
                pwd = settings.POSTGRES_PASSWORD
                pwd_str = None

                if isinstance(pwd, bytes):
                    # Decode bytes with error handling - try multiple encodings
                    for encoding in ["utf-8", "latin-1", "cp1252", "iso-8859-1"]:
                        try:
                            pwd_str = pwd.decode(encoding, errors="replace")
                            # Remove replacement characters if any
                            pwd_str = pwd_str.replace("\ufffd", "")
                            break
                        except Exception:
                            continue
                    if pwd_str is None:
                        # Last resort: decode as latin-1 and replace invalid chars
                        pwd_str = pwd.decode("latin-1", errors="replace")
                else:
                    # If string, ensure it's valid UTF-8
                    pwd_str = str(pwd)
                    try:
                        # Clean any invalid UTF-8 sequences
                        pwd_bytes = pwd_str.encode("utf-8", errors="replace")
                        pwd_str = pwd_bytes.decode("utf-8", errors="replace")
                        # Remove replacement characters
                        pwd_str = pwd_str.replace("\ufffd", "")
                    except Exception:
                        # If encoding fails, try to clean manually
                        pwd_str = "".join(c for c in pwd_str if ord(c) < 0x110000)

                # Clean other string parameters too
                clean_host = (
                    str(settings.POSTGRES_HOST)
                    .encode("utf-8", errors="replace")
                    .decode("utf-8", errors="replace")
                )
                clean_user = (
                    str(settings.POSTGRES_USER)
                    .encode("utf-8", errors="replace")
                    .decode("utf-8", errors="replace")
                )
                clean_db = (
                    str(settings.POSTGRES_DB)
                    .encode("utf-8", errors="replace")
                    .decode("utf-8", errors="replace")
                )

                # Use a completely clean URL without any special characters
                # Use localhost as placeholder - all real params come from connect_args
                minimal_url = "postgresql+psycopg2://localhost/postgres"

                # Create a custom connection creator that builds DSN directly
                # This completely bypasses URL parsing in psycopg2
                def create_connection():
                    import psycopg2

                    # Build DSN string directly with cleaned values
                    dsn_parts = [
                        f"host={clean_host}",
                        f"port={settings.POSTGRES_PORT}",
                        f"user={clean_user}",
                        f"password={pwd_str}",
                        f"dbname={clean_db}",
                        "client_encoding=utf8",
                    ]
                    dsn = " ".join(dsn_parts)
                    return psycopg2.connect(dsn)

                connectable = create_engine(
                    minimal_url,
                    poolclass=pool.NullPool,
                    echo=False,
                    future=True,
                    creator=create_connection,  # Use custom connection creator
                )
                # Test the connection
                with connectable.connect() as test_conn:
                    test_conn.execute(text("SELECT 1"))
            except Exception as e2:
                print(
                    "\n❌ Error: Could not create database connection due to encoding issues",
                    file=sys.stderr,
                )
                print(
                    "This usually means the password or connection string has encoding issues.",
                    file=sys.stderr,
                )
                print(
                    "Please check your .env file is saved as UTF-8 encoding.",
                    file=sys.stderr,
                )
                print(
                    "If your password contains special characters, try URL-encoding them manually.",
                    file=sys.stderr,
                )
                raise e2
        else:
            # Not an encoding error, re-raise the original exception
            raise

    with connectable.connect() as connection:
        version_locations = _build_version_locations()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            version_locations=version_locations,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
