"""Redis cache for Open-Meteo responses.

Keys follow ``om:{model}:{lat_r}:{lon_r}:{var}`` where coordinates are rounded to
2 decimals (~1 km) so nearby spots share an entry, and ``var`` distinguishes the
forecast vs marine payloads. Values are JSON. Default TTL is 30 minutes (well
within the 30-60 min band the live path targets).
"""

from __future__ import annotations

import json
from typing import Any, Protocol

from app.config import get_settings

DEFAULT_TTL_SECONDS = 1800  # 30 min


def cache_key(model: str, lat: float, lon: float, var: str) -> str:
    return f"om:{model}:{round(lat, 2)}:{round(lon, 2)}:{var}"


class Cache(Protocol):
    def get(self, key: str) -> Any | None: ...

    def set(self, key: str, value: Any, ttl: int) -> None: ...


class RedisCache:
    """JSON-over-Redis cache."""

    def __init__(self, url: str | None = None) -> None:
        import redis

        self._r = redis.Redis.from_url(url or get_settings().redis_url)

    def get(self, key: str) -> Any | None:
        raw = self._r.get(key)
        return json.loads(raw) if raw is not None else None

    def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL_SECONDS) -> None:
        self._r.set(key, json.dumps(value), ex=ttl)


class InMemoryCache:
    """Process-local cache (local dev / tests). TTL is accepted but not expired."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}

    def get(self, key: str) -> Any | None:
        return self._store.get(key)

    def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL_SECONDS) -> None:
        self._store[key] = value


_default_cache: Cache | None = None


def default_cache() -> Cache:
    global _default_cache
    if _default_cache is None:
        _default_cache = RedisCache()
    return _default_cache


def cache_get(key: str) -> Any | None:
    """Module-level convenience over the default (Redis) cache."""
    return default_cache().get(key)


def cache_set(key: str, value: Any, ttl: int = DEFAULT_TTL_SECONDS) -> None:
    """Module-level convenience over the default (Redis) cache."""
    default_cache().set(key, value, ttl)
