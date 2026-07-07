"""Admin FastAPI dependencies: CDS client, stock client, and the optional key."""

from __future__ import annotations

import secrets

from fastapi import Header, HTTPException

from app.admin.stock import StockImageClient, default_stock_client
from app.config import get_settings


def get_extract_client():
    """Climatology extraction client — **Open-Meteo Historical** by default.

    Wind/temperature from the ERA5 archive-api, waves from the marine-api; plain
    HTTP, no ``cdsapi`` / ``~/.cdsapirc`` needed. Constructing it does no network
    (fetching happens lazily in ``fetch_series``). Tests override this dependency
    with a fake client that returns a canned series.
    """
    from app.era5.openmeteo import OpenMeteoHistoryClient

    return OpenMeteoHistoryClient()


# Backward-compatible alias: the seam used to be CDS-specific. Kept so existing
# dependency overrides (tests) keep working. The optional CDS adapter lives in
# app.era5.cds.real_cds_client() and is no longer on the default path.
get_cds_client = get_extract_client


def get_stock_client() -> StockImageClient:
    return default_stock_client()


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    """Gate admin endpoints with ``ADMIN_KEY`` when configured (else open)."""
    key = get_settings().admin_key
    if key and not secrets.compare_digest(x_admin_key or "", key):
        raise HTTPException(status_code=401, detail="invalid or missing admin key")
