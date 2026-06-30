"""Stock-image lookup seam (Unsplash/Pexels) with mandatory license + credit.

Behind a protocol so the network is mocked in tests. The real adapter is a thin,
best-effort Unsplash client; it is never exercised by the suite.
"""

from __future__ import annotations

import os
from typing import Protocol


class StockImageClient(Protocol):
    def search(self, query: str) -> dict | None: ...


class UnsplashStockImageClient:  # pragma: no cover - live network only
    """Returns ``{url, source, license, credit}`` for the first match, or None."""

    API_URL = "https://api.unsplash.com/search/photos"

    def __init__(self, access_key: str | None = None) -> None:
        self._key = access_key or os.environ.get("UNSPLASH_ACCESS_KEY")

    def search(self, query: str) -> dict | None:
        if not self._key:
            raise RuntimeError("UNSPLASH_ACCESS_KEY not configured")
        import httpx

        resp = httpx.get(
            self.API_URL,
            params={"query": query, "per_page": 1, "orientation": "landscape"},
            headers={"Authorization": f"Client-ID {self._key}"},
            timeout=10.0,
        )
        resp.raise_for_status()
        results = resp.json().get("results") or []
        if not results:
            return None
        photo = results[0]
        user = photo.get("user", {})
        return {
            "url": photo["urls"]["regular"],
            "source": "unsplash",
            "license": "Unsplash License",
            "credit": user.get("name") or user.get("username") or "Unsplash",
        }


_default_client: StockImageClient | None = None


def default_stock_client() -> StockImageClient:
    global _default_client
    if _default_client is None:
        _default_client = UnsplashStockImageClient()
    return _default_client
