"""Resolve coordinates to the nearest ERA5 grid cell(s).

ERA5 is delivered on a regular lat/lon grid. Atmospheric variables (wind,
temperature) are on a 0.25 deg grid; ocean-wave variables on a coarser 0.50 deg
grid. A spot therefore maps to *two* cell centres which usually differ.
"""

from __future__ import annotations

WIND_GRID_DEG: float = 0.25
WAVE_GRID_DEG: float = 0.50


def _snap(value: float, step: float) -> float:
    """Snap ``value`` to the nearest multiple of ``step`` (cell centre)."""
    return round(round(value / step) * step, 6)


def _normalise_lon(lon: float) -> float:
    """Fold longitude into [-180, 180)."""
    return ((lon + 180.0) % 360.0) - 180.0


def resolve_grid_cell(lat: float, lon: float) -> dict:
    """Return the nearest ERA5 cell centres for ``lat``/``lon``.

    >>> resolve_grid_cell(36.025, -5.628)
    {'wind': [36.0, -5.75], 'wave': [36.0, -5.5]}

    The result is a JSON-friendly dict ``{"wind": [lat, lon], "wave": [lat, lon]}``
    suitable for persisting in ``spots.era5_cell`` / ``era5_jobs.cell``.
    """
    if not -90.0 <= lat <= 90.0:
        raise ValueError(f"latitude out of range: {lat}")
    lon = _normalise_lon(lon)
    return {
        "wind": [_snap(lat, WIND_GRID_DEG), _snap(lon, WIND_GRID_DEG)],
        "wave": [_snap(lat, WAVE_GRID_DEG), _snap(lon, WAVE_GRID_DEG)],
    }
