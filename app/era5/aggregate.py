"""Weekly joint histograms and per-week display statistics."""

from __future__ import annotations

import numpy as np

from app.era5 import seriesutil
from app.era5.bins import (
    LONGPERIOD_THRESHOLD_S,
    MS_TO_KNOTS,
    N_MAG_BINS,
    N_SECTORS,
    N_WEEKS,
    SECTOR_WIDTH_DEG,
    SWELL_HEIGHT_BINS_M,
    WIND_SPEED_BINS_KT,
)
from app.era5.components import compute_wind_components, direction_to_sector


def _mag_bin(values: np.ndarray, edges: tuple[float, ...]) -> np.ndarray:
    """Index of the bin each value falls in (0..len(edges)-1, last open-ended)."""
    # np.digitize with the lower edges: edges[0] is 0, so subtract 1, clip to range.
    idx = np.digitize(values, edges, right=False) - 1
    return np.clip(idx, 0, len(edges) - 1)


def _joint_histogram(sectors: np.ndarray, mag_idx: np.ndarray) -> list[list[int]]:
    """Build a ``[N_SECTORS][N_MAG_BINS]`` integer count matrix."""
    flat = sectors * N_MAG_BINS + mag_idx
    counts = np.bincount(flat, minlength=N_SECTORS * N_MAG_BINS)[
        : N_SECTORS * N_MAG_BINS
    ]
    return counts.reshape(N_SECTORS, N_MAG_BINS).astype(int).tolist()


def _wind_joint(series: dict) -> list[list[int]]:
    comp = compute_wind_components(series["u10"], series["v10"])
    mag = _mag_bin(comp["speed_kt"], WIND_SPEED_BINS_KT)
    return _joint_histogram(comp["sector"], mag)


def _swell_joint(series: dict) -> list[list[int]]:
    swh = np.asarray(series.get("swh"), dtype=float)
    mwd = np.asarray(series.get("mwd"), dtype=float)
    valid = np.isfinite(swh) & np.isfinite(mwd)
    if not valid.any():
        return [[0] * N_MAG_BINS for _ in range(N_SECTORS)]
    sectors = direction_to_sector(mwd[valid])
    mag = _mag_bin(swh[valid], SWELL_HEIGHT_BINS_M)
    return _joint_histogram(sectors, mag)


def aggregate_weekly_histogram(series: dict) -> dict[int, dict]:
    """Per-week joint histograms.

    Returns ``{week_number(1..52): {"wind_joint": [16][6],
    "swell_joint": [16][6]}}``. Each cell is an hour count; wind cells sum to the
    hours in the week, swell cells sum to the hours with valid wave data.
    """
    times = seriesutil.as_datetime64(series["time"])
    weeks = seriesutil.week_index(times)

    out: dict[int, dict] = {}
    for w in range(N_WEEKS):
        mask = weeks == w
        wk = seriesutil.subset(series, mask)
        out[w + 1] = {
            "wind_joint": _wind_joint(wk),
            "swell_joint": _swell_joint(wk),
        }
    return out


def _pct(values: np.ndarray, q: float) -> float | None:
    """NaN-aware percentile rounded to 1 decimal, or None if no data."""
    values = np.asarray(values, dtype=float)
    values = values[np.isfinite(values)]
    if values.size == 0:
        return None
    return round(float(np.percentile(values, q)), 1)


def _dominant_sector(sectors: np.ndarray) -> int | None:
    if sectors.size == 0:
        return None
    counts = np.bincount(sectors, minlength=N_SECTORS)[:N_SECTORS]
    return int(np.argmax(counts))


def derive_display_stats(series: dict) -> dict:
    """Compact human-facing statistics for a (typically one-week) series.

    All temperatures are converted from Kelvin to degrees Celsius. Directions
    are reported as a dominant 16-point sector index (0 = N) plus its bearing.
    Returns ``None`` valued fields where a series carries no valid samples
    (e.g. wave fields at an inland spot).
    """
    n = seriesutil.n_hours(series)

    comp = compute_wind_components(series["u10"], series["v10"])
    wind_sectors = comp["sector"]
    wind_dom = _dominant_sector(wind_sectors) if n else None

    swh = np.asarray(series.get("swh"), dtype=float) if "swh" in series else np.array([])
    mwp = np.asarray(series.get("mwp"), dtype=float) if "mwp" in series else np.array([])
    mwd = np.asarray(series.get("mwd"), dtype=float) if "mwd" in series else np.array([])
    mwp_valid = mwp[np.isfinite(mwp)] if mwp.size else mwp
    longperiod_frac = (
        round(float(np.mean(mwp_valid >= LONGPERIOD_THRESHOLD_S)), 3)
        if mwp_valid.size
        else None
    )
    swell_dom = (
        _dominant_sector(direction_to_sector(mwd[np.isfinite(mwd)]))
        if mwd.size and np.isfinite(mwd).any()
        else None
    )

    t2m = np.asarray(series.get("t2m"), dtype=float) if "t2m" in series else np.array([])
    sst = np.asarray(series.get("sst"), dtype=float) if "sst" in series else np.array([])

    return {
        "hours": n,
        "wind": {
            "p10_kt": _pct(comp["speed_kt"], 10) if n else None,
            "p50_kt": _pct(comp["speed_kt"], 50) if n else None,
            "p90_kt": _pct(comp["speed_kt"], 90) if n else None,
            "dir_dominant": wind_dom,
            "dir_dominant_deg": (
                round(wind_dom * SECTOR_WIDTH_DEG, 1) if wind_dom is not None else None
            ),
        },
        "swell": {
            "hs_p50_m": _pct(swh, 50),
            "period_p50_s": _pct(mwp, 50),
            "longperiod_frac": longperiod_frac,
            "dir_dominant": swell_dom,
            "dir_dominant_deg": (
                round(swell_dom * SECTOR_WIDTH_DEG, 1) if swell_dom is not None else None
            ),
        },
        "air_p50_c": _kelvin_pct(t2m, 50),
        "sst_p50_c": _kelvin_pct(sst, 50),
    }


def _kelvin_pct(values: np.ndarray, q: float) -> float | None:
    p = _pct(values, q)
    return round(p - 273.15, 1) if p is not None else None


# Re-export so callers don't need to import bins for the conversion constant.
__all__ = [
    "aggregate_weekly_histogram",
    "derive_display_stats",
    "MS_TO_KNOTS",
]
