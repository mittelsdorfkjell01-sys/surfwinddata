"""Region write workflow + region stock images."""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.admin.stock import StockImageClient


def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return base or uuid.uuid4().hex[:8]


def _point(lat: float, lon: float):
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Point

    return from_shape(Point(lon, lat), srid=4326)


def create_region(data: dict, *, db: Session) -> Any:
    """Create a region with optional centre and defaults template."""
    from app.models import Region

    center = None
    if data.get("lat") is not None and data.get("lon") is not None:
        center = _point(float(data["lat"]), float(data["lon"]))
    region = Region(
        slug=data.get("slug") or _slugify(data["name"]),
        name=data["name"],
        country=data.get("country"),
        center=center,
        description=data.get("description"),
        defaults=data.get("defaults") or {},
        season=data.get("season"),
        image=data.get("image"),
    )
    db.add(region)
    db.commit()
    db.refresh(region)
    return region


def assign_spot_to_region(spot_id, region_id, *, db: Session) -> Any:
    """Move a spot to a region, inheriting ``model_pref`` if unset."""
    from app.models import Region, Spot

    spot = db.get(Spot, spot_id)
    if spot is None:
        raise LookupError(f"unknown spot {spot_id}")
    region = db.get(Region, region_id)
    if region is None:
        raise LookupError(f"unknown region {region_id}")
    spot.region_id = region.id
    if not spot.model_pref and region.defaults:
        spot.model_pref = region.defaults.get("model_pref")
    db.commit()
    db.refresh(spot)
    return spot


def update_region_defaults(region_id, defaults: dict, *, db: Session) -> Any:
    """Merge into ``regions.defaults`` (the spot-creation template)."""
    from app.models import Region

    region = db.get(Region, region_id)
    if region is None:
        raise LookupError(f"unknown region {region_id}")
    merged = dict(region.defaults or {})
    merged.update(defaults or {})
    region.defaults = merged
    db.commit()
    db.refresh(region)
    return region


def fetch_region_stock_image(region_name: str, *, client: StockImageClient) -> dict | None:
    """Look up a credited stock image for a region (license + credit included)."""
    return client.search(region_name)


def set_region_stock_image(
    region_id, *, db: Session, client: StockImageClient
) -> Any:
    """Fetch and store a stock image for a region by its name."""
    from app.models import Region

    region = db.get(Region, region_id)
    if region is None:
        raise LookupError(f"unknown region {region_id}")
    image = fetch_region_stock_image(region.name, client=client)
    if image is not None:
        region.image = image
        db.commit()
        db.refresh(region)
    return region
