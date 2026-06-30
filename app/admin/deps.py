"""Admin FastAPI dependencies: CDS client, stock client, and the optional key."""

from __future__ import annotations

import secrets

from fastapi import Header, HTTPException

from app.admin.stock import StockImageClient, default_stock_client
from app.config import get_settings


class _LazyCdsClient:
    """Defers building the real ``cdsapi`` client until a method is first called.

    Constructing :class:`RealCdsClient` reads ``~/.cdsapirc`` and can raise if the
    CDS credentials are missing. Doing that eagerly in the FastAPI dependency made
    ``POST /admin/spots`` fail at resolution time — even though spot creation
    treats the ERA5 trigger as best-effort. Deferring construction keeps the
    endpoint working and lets the caller's try/except own any CDS failure.
    """

    def __init__(self) -> None:
        self._client = None

    def _delegate(self):
        if self._client is None:
            from app.era5.cds import real_cds_client

            self._client = real_cds_client()
        return self._client

    def submit(self, dataset: str, request: dict) -> str:
        return self._delegate().submit(dataset, request)

    def poll(self, request_id: str) -> str:
        return self._delegate().poll(request_id)

    def fetch_series(self, request_id: str) -> dict:
        return self._delegate().fetch_series(request_id)


def get_cds_client():
    """Lazy Copernicus CDS client (built on first use); tests override with a fake."""
    return _LazyCdsClient()


def get_stock_client() -> StockImageClient:
    return default_stock_client()


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    """Gate admin endpoints with ``ADMIN_KEY`` when configured (else open)."""
    key = get_settings().admin_key
    if key and not secrets.compare_digest(x_admin_key or "", key):
        raise HTTPException(status_code=401, detail="invalid or missing admin key")
