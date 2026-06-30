from typing import Any

from geoalchemy2.shape import to_shape
from pydantic import BaseModel


class GeoPoint(BaseModel):
    """GeoJSON-ish point with explicit lon/lat (WGS84)."""

    lon: float
    lat: float

    @classmethod
    def from_geo(cls, value: Any) -> "GeoPoint | None":
        """Build from a GeoAlchemy2 WKB/WKT element (or None)."""
        if value is None:
            return None
        shape = to_shape(value)
        return cls(lon=shape.x, lat=shape.y)


class GeoPolygon(BaseModel):
    """Polygon as a list of [lon, lat] rings (outer ring first)."""

    rings: list[list[list[float]]]

    @classmethod
    def from_geo(cls, value: Any) -> "GeoPolygon | None":
        if value is None:
            return None
        shape = to_shape(value)
        rings = [list(map(list, shape.exterior.coords))]
        rings.extend(list(map(list, interior.coords)) for interior in shape.interiors)
        return cls(rings=rings)
