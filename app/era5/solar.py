"""Solar elevation and the daylight filter.

We keep only hours when the sun is above the horizon, because the climatology is
meant to describe *sailable daytime* conditions. Solar elevation is computed with
the NOAA solar-position approximation, vectorised over numpy datetime64 in UTC
(no timezone term is needed because the timestamps are already UTC).
"""

from __future__ import annotations

import numpy as np

from app.era5 import seriesutil
from app.era5.bins import N_WEEKS

# Sun considered "up" above this elevation (deg). 0.0 = geometric horizon; a
# small negative value would approximate atmospheric refraction.
DAYLIGHT_ELEVATION_DEG: float = 0.0


def solar_elevation_deg(times: np.ndarray, lat: float, lon: float) -> np.ndarray:
    """Solar elevation angle (degrees above horizon) for each UTC timestamp.

    ``lon`` is positive east. Implements the NOAA spreadsheet formulae.
    """
    times = seriesutil.as_datetime64(times)
    doy = seriesutil.day_of_year(times).astype(float)
    hour = seriesutil.hour_of_day(times)

    # Fractional year (radians).
    gamma = 2.0 * np.pi / 365.0 * (doy - 1.0 + (hour - 12.0) / 24.0)

    # Equation of time (minutes) and solar declination (radians).
    eqtime = 229.18 * (
        0.000075
        + 0.001868 * np.cos(gamma)
        - 0.032077 * np.sin(gamma)
        - 0.014615 * np.cos(2 * gamma)
        - 0.040849 * np.sin(2 * gamma)
    )
    decl = (
        0.006918
        - 0.399912 * np.cos(gamma)
        + 0.070257 * np.sin(gamma)
        - 0.006758 * np.cos(2 * gamma)
        + 0.000907 * np.sin(2 * gamma)
        - 0.002697 * np.cos(3 * gamma)
        + 0.00148 * np.sin(3 * gamma)
    )

    # True solar time (minutes); +4*lon converts degrees east to minutes.
    time_offset = eqtime + 4.0 * lon
    tst = (hour * 60.0) + time_offset
    hour_angle = np.radians(tst / 4.0 - 180.0)

    lat_r = np.radians(lat)
    cos_zenith = np.sin(lat_r) * np.sin(decl) + np.cos(lat_r) * np.cos(decl) * np.cos(
        hour_angle
    )
    cos_zenith = np.clip(cos_zenith, -1.0, 1.0)
    zenith = np.degrees(np.arccos(cos_zenith))
    return 90.0 - zenith


def daylight_mask(times: np.ndarray, lat: float, lon: float) -> np.ndarray:
    """Boolean mask: True where the sun is above the horizon."""
    return solar_elevation_deg(times, lat, lon) > DAYLIGHT_ELEVATION_DEG


def filter_daylight(series: dict, lat: float, lon: float) -> tuple[dict, list[int]]:
    """Drop night-time hours from ``series``.

    Returns ``(daylight_series, daylight_hours_per_week)`` where the second item
    is a length-52 list counting the kept (daytime) hours in each week bucket.
    """
    times = seriesutil.as_datetime64(series["time"])
    mask = daylight_mask(times, lat, lon)
    day_series = seriesutil.subset(series, mask)

    weeks = seriesutil.week_index(times[mask])
    counts = np.bincount(weeks, minlength=N_WEEKS)[:N_WEEKS]
    return day_series, counts.astype(int).tolist()
