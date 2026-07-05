import os

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api import admin, regions, search, spots
from app.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.api_title, debug=settings.api_debug)

# Let the browser SPA (Vite dev server, and any configured origins) call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded media (hero images) from disk at the configured URL prefix.
os.makedirs(settings.media_dir, exist_ok=True)
app.mount(
    settings.media_url_prefix,
    StaticFiles(directory=settings.media_dir),
    name="media",
)

app.include_router(spots.router)
app.include_router(regions.router)
app.include_router(search.router)
app.include_router(admin.router)


def _check_db() -> bool:
    """A real round-trip, not just 'the process is alive'."""
    try:
        from app.db.session import engine

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def _check_redis() -> bool:
    try:
        import redis

        client = redis.Redis.from_url(
            settings.redis_url, socket_connect_timeout=1, socket_timeout=1
        )
        return bool(client.ping())
    except Exception:
        return False


@app.get("/health", tags=["meta"])
def health(response: Response) -> dict[str, str]:
    """Liveness + dependency readiness with a separate status per dependency.

    Redis is a non-critical cache: if it is down the API still serves (status
    ``degraded``, HTTP 200) so an uptime check / the proxy does not confuse a
    broken cache with a broken server. A dead DB is fatal → HTTP 503.
    """
    db_ok = _check_db()
    redis_ok = _check_redis()
    if db_ok and redis_ok:
        status = "ok"
    elif db_ok:
        status = "degraded"
    else:
        status = "error"
        response.status_code = 503
    return {
        "status": status,
        "db": "ok" if db_ok else "down",
        "redis": "ok" if redis_ok else "down",
    }
