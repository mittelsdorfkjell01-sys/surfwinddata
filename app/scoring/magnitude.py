"""Magnitude grading: among conditions that pass the gates, good vs. moderate."""

from __future__ import annotations

from app.scoring.params import get_params
from app.scoring.profile import profile_thresholds

GOOD = "gut"
MODERATE = "mäßig"


def _wind_grade(values: dict, offsets: dict, params: dict) -> tuple[str, list[str]]:
    band = params["wind"]
    gmin = band["good_min_kt"] + offsets.get("good_min_kt", 0.0)
    gmax = band["good_max_kt"] + offsets.get("good_max_kt", 0.0)
    w = values.get("wind_kt")

    if w is None or w < gmin:
        return MODERATE, ["below_ideal"]
    if w > gmax:
        return MODERATE, ["above_ideal"]

    # Gustiness downgrade.
    gust = values.get("gust_kt")
    if gust is not None and w:
        if gust / w >= params["gust_ratio_downgrade"] or (gust - w) >= params[
            "gust_delta_downgrade_kt"
        ]:
            return MODERATE, ["gusty"]
    return GOOD, ["ideal_band"]


def _wave_grade(values: dict, offsets: dict, params: dict) -> tuple[str, list[str]]:
    band = params["swell"]
    gmin = band["good_min_m"] + offsets.get("good_min_m", 0.0)
    gmax = band["good_max_m"] + offsets.get("good_max_m", 0.0)
    h = values.get("swell_m")

    if h is None or h < gmin:
        return MODERATE, ["below_ideal"]
    if h > gmax:
        return MODERATE, ["above_ideal"]
    return GOOD, ["ideal_band"]


def grade_magnitude(
    values: dict,
    editorial: dict | None,
    profile: dict | None,
    params: dict,
    sport: str | None = None,
) -> tuple[str, list[str]]:
    """Grade gate-passing conditions as ``gut`` or ``mäßig``.

    The rider level shifts only the *ideal* band; gustiness downgrades a wind
    rating from good to moderate.
    """
    level = (profile or {}).get("level")
    sport = sport or (profile or {}).get("sport")
    offsets = profile_thresholds(level, sport or "", params) if level else {}

    if params["sport_type"] == "wind":
        return _wind_grade(values, offsets, params)
    return _wave_grade(values, offsets, params)
