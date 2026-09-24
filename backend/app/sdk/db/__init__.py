"""aiutox_sdk.db — re-exports of app.core.db public surface.

Provides database session, declarative base and dependency injection.
"""

from app.core.db.base_class import Base
from app.core.db.deps import get_db
from app.core.db.session import SessionLocal, engine

__all__ = [
    "Base",
    "get_db",
    "SessionLocal",
    "engine",
]
