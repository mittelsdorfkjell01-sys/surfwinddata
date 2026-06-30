"""Derive wind speed and direction from ERA5 u/v components."""

from __future__ import annotations

import numpy as np

from app.era5.bins import MS_TO_KNOTS, N_SECTORS, SECTOR_WIDTH_DEG


def compute_wind_components(u, v) -> dict:
    """Convert eastward/northward wind components to speed & compass direction.

    ``u`` (eastward) and ``v`` (northward) are ERA5 10 m wind components in m/s;
    they may be scalars or numpy arrays. Returns a dict of arrays:

    * ``speed_kt``  - wind speed in knots
    * ``dir_deg``   - meteorological direction the wind blows *from*, degrees,
      0 = North, 90 = East
    * ``sector``    - 16-point compass sector index (0 = N), ``round(dir/22.5)``

    The meteorological "from" convention: a wind blowing toward the north
    (``v > 0``) comes *from* the south, i.e. 180 deg.
    """
    u = np.asarray(u, dtype=float)
    v = np.asarray(v, dtype=float)

    speed_ms = np.hypot(u, v)
    speed_kt = speed_ms * MS_TO_KNOTS

    # Direction the wind comes from, 0=N increasing clockwise through E.
    dir_deg = (np.degrees(np.arctan2(-u, -v))) % 360.0
    sector = (np.round(dir_deg / SECTOR_WIDTH_DEG).astype(int)) % N_SECTORS

    return {"speed_kt": speed_kt, "dir_deg": dir_deg, "sector": sector}


def direction_to_sector(dir_deg) -> np.ndarray:
    """Bucket a compass bearing (deg, 0=N) into a 16-point sector index."""
    dir_deg = np.asarray(dir_deg, dtype=float) % 360.0
    return (np.round(dir_deg / SECTOR_WIDTH_DEG).astype(int)) % N_SECTORS
