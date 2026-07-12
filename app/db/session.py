from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import get_settings

settings = get_settings()

# On serverless (db_serverless=True) don't keep a client-side pool: each checkout
# opens and closes its own connection, and a server-side pooler (e.g. Neon's
# pooled endpoint) owns the real pooling. Otherwise use SQLAlchemy's normal pool.
_engine_kwargs: dict = {"pool_pre_ping": True, "future": True}
if settings.db_serverless:
    _engine_kwargs = {"poolclass": NullPool, "future": True}

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
