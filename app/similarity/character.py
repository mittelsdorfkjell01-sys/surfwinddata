"""Character ('charakter') distance: how similar two spots *feel*.

A weighted blend over editorial/structural features: water type, bottom type,
rider level, the numeric wind range, and the orientation pattern. Features that
are missing on either spot are skipped and the remaining weights re-normalised,
so a sparsely-described spot still compares on what it has.
"""

from __future__ import annotations

from typing import Any

from app.scoring.context import primary_sport
from app.scoring.params import SCORING_PARAMS_V1, get_params
from app.similarity.orientation import (
    normalize_orientation,
    orientation_l1,
    window_to_sectors,
)

# Component weights (sum is normalised over whatever is comparable).
_WEIGHTS = {
    "water_type": 0.20,
    "bottom_type": 0.15,
    "level": 0.15,
    "wind_range": 0.20,
    "orientation": 0.30,
}

_LEVELS = ("beginner", "intermediate", "advanced", "pro")
_WIND_RANGE_SCALE_KT = 30.0  # full-scale difference for the wind-range component


def _editorial(spot: Any) -> dict:
    return getattr(spot, "editorial", None) or {}


def _level_distance(a: Any, b: Any) -> float | None:
    try:
        ia, ib = _LEVELS.index(a.level), _LEVELS.index(b.level)
    except (AttributeError, ValueError):
        return None
    return abs(ia - ib) / (len(_LEVELS) - 1)


def wind_range(spot: Any, sport: str | None = None) -> list[float] | None:
    """The spot's usable wind band ``[min, max]`` kt (editorial, else sport params)."""
    ed = _editorial(spot).get("wind_range")
    if isinstance(ed, (list, tuple)) and len(ed) == 2:
        return [float(ed[0]), float(ed[1])]
    sp = sport or primary_sport(spot)
    if sp in SCORING_PARAMS_V1:
        wind = get_params(sp).get("wind")
        if wind:
            return [wind["min_kt"], wind["max_kt"]]
    return None


def _wind_range_distance(a: Any, b: Any, sport: str | None) -> float | None:
    ra, rb = wind_range(a, sport), wind_range(b, sport)
    if ra is None or rb is None:
        return None
    diff = abs(ra[0] - rb[0]) + abs(ra[1] - rb[1])
    return min(diff / _WIND_RANGE_SCALE_KT, 1.0)


def usable_sectors(spot: Any) -> list[int]:
    ed = _editorial(spot)
    windows = ed.get("usable_wind_directions", ed.get("usable_directions"))
    return window_to_sectors(windows)


def _orientation_distance(a: Any, b: Any) -> float | None:
    oa = normalize_orientation(usable_sectors(a), getattr(a, "facing", None))
    ob = normalize_orientation(usable_sectors(b), getattr(b, "facing", None))
    return orientation_l1(oa, ob)


def _categorical(a: str | None, b: str | None) -> float | None:
    if not a or not b:
        return None
    return 0.0 if a == b else 1.0


def character_distance(a: Any, b: Any, sport: str | None = None) -> float:
    """Weighted character distance in [0, 1] (0 = identical feel)."""
    components = {
        "water_type": _categorical(getattr(a, "water_type", None), getattr(b, "water_type", None)),
        "bottom_type": _categorical(getattr(a, "bottom_type", None), getattr(b, "bottom_type", None)),
        "level": _level_distance(a, b),
        "wind_range": _wind_range_distance(a, b, sport),
        "orientation": _orientation_distance(a, b),
    }
    total_w = 0.0
    acc = 0.0
    for key, dist in components.items():
        if dist is None:
            continue
        total_w += _WEIGHTS[key]
        acc += _WEIGHTS[key] * dist
    if total_w == 0.0:
        return 1.0  # nothing comparable -> maximally dissimilar
    return round(acc / total_w, 4)
