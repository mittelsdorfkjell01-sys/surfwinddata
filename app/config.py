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

    # Optional comma-separated override of the independent global models whose
    # disagreement forms the Sprint 18 consensus band (default: the DWD/NOAA/ECMWF
    # trio in app.live.models.CONSENSUS_GLOBAL_MODELS). None => use the default.
    live_consensus_models: str | None = None

    # Optional shared key guarding the /admin endpoints (X-Admin-Key header).
    # None => admin is unprotected (no auth yet; see Sprint 8 notes).
    admin_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
