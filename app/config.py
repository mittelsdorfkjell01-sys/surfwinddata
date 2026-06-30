from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # Directory where ERA5 raw extracts (Parquet) are stored by the pipeline.
    era5_raw_dir: str = "data/era5_raw"

    # TTL (seconds) for cached Open-Meteo live/forecast responses (30-60 min band).
    live_cache_ttl: int = 1800

    # Optional shared key guarding the /admin endpoints (X-Admin-Key header).
    # None => admin is unprotected (no auth yet; see Sprint 8 notes).
    admin_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
