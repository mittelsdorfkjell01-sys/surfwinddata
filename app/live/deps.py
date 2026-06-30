"""FastAPI dependency providers for the live path.

Endpoints depend on these so tests can override the Open-Meteo client and cache
via ``app.dependency_overrides`` without any network or Redis.
"""

from __future__ import annotations

from app.live.cache import Cache, default_cache
from app.live.client import OpenMeteoClient, default_client


def get_om_client() -> OpenMeteoClient:
    return default_client()


def get_cache() -> Cache:
    return default_cache()
