from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, sourced from environment variables / .env."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = "postgresql+psycopg://surf:surf@localhost:5432/surfwind"
    test_database_url: str = (
        "postgresql+psycopg://surf:surf@localhost:5432/surfwind_test"
    )
    redis_url: str = "redis://localhost:6379/0"

    api_title: str = "Surfwinddate API"
    api_debug: bool = True

    # Whether this deployment exposes the back office (auth + /admin* routers) and
    # runs the admin bootstrap. True on the admin deployment (kjellmittelsdorf.de);
    # set ENABLE_ADMIN_API=false on the public deployment (surfwinddata.com) so its
    # origin serves only the public + community endpoints — no /auth, no /admin.
    enable_admin_api: bool = True

    # Browser origins allowed to call the API (CORS). The Vite dev server runs on
    # 5173 by default. NoDecode keeps pydantic-settings from JSON-parsing the env
    # var so the validator below can accept a comma-separated list too.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    # Where uploaded hero images are stored on disk, and the URL prefix they are
    # served from (StaticFiles mount in app.main). The stored image URL is
    # root-relative (e.g. "/media/spots/<id>/hero.jpg"); the frontend resolves it
    # against the API base.
    media_dir: str = "data/media"
    media_url_prefix: str = "/media"

    # Where uploaded images live: "local" writes to media_dir on disk (dev / VPS
    # with a persistent volume); "blob" uploads to Vercel Blob and stores the
    # returned public https URL (serverless hosts whose filesystem is ephemeral).
    media_backend: str = "local"  # local | blob
    # Vercel Blob read/write token (required when media_backend="blob").
    blob_read_write_token: str | None = None

    # Serverless DB pooling: on a short-lived serverless invocation, holding a
    # SQLAlchemy pool is wrong (connections outlive the function / exhaust the
    # server). True => NullPool (open+close per checkout); pair it with a
    # server-side pooler (e.g. Neon's pooled endpoint). False => normal pool.
    db_serverless: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return []
            if s.startswith("["):  # JSON array
                import json

                return json.loads(s)
            return [o.strip() for o in s.split(",") if o.strip()]
        return v

    # Directory where ERA5 raw extracts (Parquet) are stored by the pipeline.
    era5_raw_dir: str = "data/era5_raw"

    # Rolling window (weeks) used to smooth the 52-week climatology curve
    # (wrap-around). 1 disables smoothing. 3 = ±1 week.
    climatology_smooth_weeks: int = 3

    # TTL (seconds) for cached Open-Meteo live/forecast responses (30-60 min band).
    live_cache_ttl: int = 1800

    # When true, a queued ERA5 job is processed automatically in the background
    # (on spot create and on the "ERA5 anstoßen" trigger) instead of waiting for
    # the batch runner. Off by default so tests stay deterministic; enable it in
    # a running deployment (ERA5_AUTOPROCESS=true).
    era5_autoprocess: bool = False

    # Optional comma-separated override of the independent global models whose
    # disagreement forms the Sprint 18 consensus band (default: the DWD/NOAA/ECMWF
    # trio in app.live.models.CONSENSUS_GLOBAL_MODELS). None => use the default.
    live_consensus_models: str | None = None

    # Optional shared key guarding the /admin endpoints (X-Admin-Key header).
    # Since Sprint A this is only a **break-glass** fallback: when set, a correct
    # X-Admin-Key is accepted as an emergency admin (actor="break-glass"). The
    # regular path is the cookie session below. Default None => break-glass off.
    admin_key: str | None = None

    # --- Admin auth (Sprint A) ---------------------------------------------
    # Secret used to sign the session JWT. MUST be overridden in production; the
    # dev default only keeps local runs and tests working out of the box.
    jwt_secret: str = "dev-insecure-change-me"
    # Session lifetime (hours) — short-lived; re-login required after expiry.
    jwt_ttl_hours: int = 12
    # httpOnly cookie carrying the session JWT.
    auth_cookie_name: str = "swd_session"
    # Set True behind HTTPS in production so the cookie is only sent over TLS.
    cookie_secure: bool = False
    # SameSite policy for the session cookie ("lax" is right for a same-site SPA).
    cookie_samesite: str = "lax"

    # First-run bootstrap: if no AdminUser exists at startup and both are set, an
    # admin is created from these. Never hard-code a password default.
    admin_bootstrap_email: str | None = None
    admin_bootstrap_password: str | None = None

    # Contact address surfaced by the take-down / image-report flow (Sprint C).
    takedown_contact_email: str | None = None

    # Comma-separated extra terms that flag a tip/rating for review (on top of the
    # built-in spam/URL indicators). Content still publishes; it just shows up
    # flagged in the review panel. Case-insensitive substring match.
    banned_words: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
