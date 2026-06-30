"""Helpers for the in-memory hourly series.

A *series* is a plain dict ``{"time": datetime64[]} + {var: float64[]}`` where
``var`` ranges over :data:`app.era5.bins.VARS`. Keeping it as a dict of numpy
arrays (rather than a dataframe) avoids a pandas dependency and makes the math
explicit.
"""

from __future__ import annotations

import numpy as np

from app.era5.bins import N_WEEKS, VARS


def as_datetime64(time) -> np.ndarray:
    """Coerce a time array/list to ``datetime64[s]`` (UTC, tz-naive)."""
    arr = np.asarray(time)
    if arr.dtype.kind == "M":
        return arr.astype("datetime64[s]")
    # list of python datetimes / ISO strings
    return np.array([np.datetime64(t) for t in arr], dtype="datetime64[s]")


def day_of_year(times: np.ndarray) -> np.ndarray:
    """1-based day of year for each timestamp."""
    days = times.astype("datetime64[D]")
    year_start = times.astype("datetime64[Y]").astype("datetime64[D]")
    return (days - year_start).astype(int) + 1


def hour_of_day(times: np.ndarray) -> np.ndarray:
    """Fractional hour (UTC) within the day, e.g. 13.5 for 13:30."""
    secs = (times - times.astype("datetime64[D]").astype("datetime64[s]")).astype(int)
    return secs / 3600.0


def week_index(times: np.ndarray) -> np.ndarray:
    """0-based week bucket in ``[0, 51]``.

    Weeks are seven-day buckets of the day-of-year; the trailing days of the
    year (and the leap day) fold into week 51 so there are always exactly 52.
    """
    doy = day_of_year(times)
    return np.minimum((doy - 1) // 7, N_WEEKS - 1)


def subset(series: dict, mask: np.ndarray) -> dict:
    """Return a new series keeping only rows where ``mask`` is True."""
    out = {"time": as_datetime64(series["time"])[mask]}
    for var in VARS:
        if var in series and series[var] is not None:
            out[var] = np.asarray(series[var], dtype=float)[mask]
    return out


def n_hours(series: dict) -> int:
    return int(len(np.asarray(series["time"])))
