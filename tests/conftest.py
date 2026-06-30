"""Pytest fixtures.

The suite runs against a real Postgres+PostGIS database (TEST_DATABASE_URL) so
the migration, geography columns and ST_DWithin can be exercised for real.

Before anything from ``app`` that builds an engine is imported, we redirect
DATABASE_URL to the test database and reset the cached settings.
"""

import os
from pathlib import Path

from app.config import Settings, get_settings

# --- redirect the app to the test database BEFORE engine creation ---------
_TEST_URL = Settings().test_database_url
os.environ["DATABASE_URL"] = _TEST_URL
get_settings.cache_clear()

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.exc import OperationalError  # noqa: E402

from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Set by the session fixture: False when the test database can't be reached, so
# DB-backed tests skip instead of erroring (pure-function tests still run).
DB_AVAILABLE = True


def require_db() -> None:
    if not DB_AVAILABLE:
        pytest.skip("test database unavailable (start docker compose)")


def _alembic_config() -> Config:
    cfg = Config(str(PROJECT_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(PROJECT_ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", _TEST_URL)
    return cfg


@pytest.fixture(scope="session", autouse=True)
def _migrated_db():
    """Reset the test schema and run the migration to head, once per session.

    If the database is unreachable the suite does not error: ``DB_AVAILABLE`` is
    flipped and DB-backed fixtures skip, so pure-function tests still run.
    """
    global DB_AVAILABLE
    try:
        with engine.begin() as conn:
            conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
        command.upgrade(_alembic_config(), "head")
    except OperationalError as exc:
        DB_AVAILABLE = False
        print(f"\n[tests] test database unavailable — DB tests skipped: {exc}")
    yield


@pytest.fixture
def db():
    require_db()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    require_db()
    return TestClient(app)
