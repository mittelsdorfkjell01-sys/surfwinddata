"""Climatological scoring: evaluate the weekly histogram cell-by-cell.

A week's score is the share of its daylight hours that pass the *same*
``evaluate_conditions`` used live — so live and seasonal ratings stay consistent.
The Stage-1 ``describe_week`` is purely descriptive (no gates).
"""

from __future__ import annotations

from typing import Any

from app.era5.bins import SECTOR_WIDTH_DEG
from app.scoring.context import primary_sport, spot_editorial
from app.scoring.evaluate import evaluate_conditions
from app.scoring.params import (
    SCORING_PARAMS_VERSION,
    SWELL_BIN_REP_M,
    WIND_BIN_REP_KT,
    get_params,
)

GOOD = "gut"
NO = "nein"


def _week_entry(climatology: dict | None, week: int) -> dict | None:
    weeks = (climatology or {}).get("weeks") if isinstance(climatology, dict) else None
    if not weeks:
        return None
    return next((w for w in weeks if w.get("week") == week), None)


def _wind_cell_values(sector: int, mag_bin: int, editorial: dict) -> dict:
    return {
        "wind_kt": WIND_BIN_REP_KT[mag_bin],
        "wind_dir": sector * SECTOR_WIDTH_DEG,
        "daylight": True,
    }


def _wave_cell_values(sector: int, mag_bin: int, week_entry: dict) -> dict:
    swell = week_entry.get("swell", {})
    wind = week_entry.get("wind", {})
    return {
        "swell_m": SWELL_BIN_REP_M[mag_bin],
        "swell_dir": sector * SECTOR_WIDTH_DEG,
        "period_s": swell.get("period_p50_s"),
        # week-level wind for the onshore gate (not available per swell cell)
        "wind_kt": wind.get("p50_kt"),
        "wind_dir": wind.get("dir_dominant_deg"),
        "daylight": True,
    }


def evaluate_week_cells(
    week_entry: dict,
    editorial: dict | None,
    profile: dict | None,
    sport: str,
    params: dict | None = None,
) -> dict:
    """Score one climatology week. Pure — operates on the week dict directly.

    Returns ``{week, total_hours, usable_hours, good_hours, pct_usable,
    gut_anteil}`` where the percentages are over the week's daylight hours.
    """
    params = params or get_params(sport)
    editorial = editorial or {}
    is_wind = params["sport_type"] == "wind"
    block = week_entry.get("wind" if is_wind else "swell", {})
    joint = block.get("joint")

    total = usable = good = 0
    if joint:
        for sector, row in enumerate(joint):
            for mag_bin, hours in enumerate(row):
                if not hours:
                    continue
                total += hours
                values = (
                    _wind_cell_values(sector, mag_bin, editorial)
                    if is_wind
                    else _wave_cell_values(sector, mag_bin, week_entry)
                )
                result = evaluate_conditions(values, editorial, profile, sport, params)
                if result["rating"] != NO:
                    usable += hours
                    if result["rating"] == GOOD:
                        good += hours

    return {
        "week": week_entry.get("week"),
        "total_hours": total,
        "usable_hours": usable,
        "good_hours": good,
        "pct_usable": round(usable / total, 4) if total else 0.0,
        "gut_anteil": round(good / total, 4) if total else 0.0,
    }


def climatology_curve(
    climatology: dict | None,
    editorial: dict | None,
    profile: dict | None,
    sport: str,
    params: dict | None = None,
) -> list[dict]:
    """Per-week scores for all 52 weeks (pure)."""
    params = params or get_params(sport)
    weeks = (climatology or {}).get("weeks") if isinstance(climatology, dict) else None
    if not weeks:
        return []
    return [
        evaluate_week_cells(w, editorial, profile, sport, params)
        for w in sorted(weeks, key=lambda x: x.get("week", 0))
    ]


def describe_week_entry(week_entry: dict) -> dict:
    """Stage-1 description of a week — no gates, tolerant of sparse editorial."""
    wind = week_entry.get("wind", {})
    swell = week_entry.get("swell", {})
    return {
        "week": week_entry.get("week"),
        "daylight_hours": week_entry.get("daylight_hours"),
        "wind": {
            "p10_kt": wind.get("p10_kt"),
            "p50_kt": wind.get("p50_kt"),
            "p90_kt": wind.get("p90_kt"),
            "dir_dominant": wind.get("dir_dominant"),
            "dir_dominant_deg": wind.get("dir_dominant_deg"),
        },
        "swell": {
            "hs_p50_m": swell.get("hs_p50_m"),
            "period_p50_s": swell.get("period_p50_s"),
            "dir_dominant_deg": swell.get("dir_dominant_deg"),
        },
        "air_c": week_entry.get("air_p50_c"),
        "sst_c": week_entry.get("sst_p50_c"),
    }


# --- DB wrappers -----------------------------------------------------------

def _load_spot(db, spot_id):
    from app.models import Spot

    spot = db.get(Spot, spot_id)
    if spot is None:
        raise LookupError(f"unknown spot {spot_id}")
    return spot


def score_climatology_week(
    spot_id, week: int, profile: dict | None, sport: str, *, db, params: dict | None = None
) -> dict:
    """Usable-hours share for one week of a spot's climatology."""
    spot = _load_spot(db, spot_id)
    entry = _week_entry(spot.climatology, week)
    if entry is None:
        raise LookupError(f"no climatology week {week} for spot {spot_id}")
    params = params or get_params(sport, db)
    return evaluate_week_cells(entry, spot_editorial(spot), profile, sport, params)


def score_climatology_curve(
    spot_id, profile: dict | None, sport: str, *, db, params: dict | None = None
) -> dict:
    """The 52-week usable-hours curve plus flagged good weeks."""
    spot = _load_spot(db, spot_id)
    params = params or get_params(sport, db)
    weeks = climatology_curve(spot.climatology, spot_editorial(spot), profile, sport, params)
    threshold = params.get("week_good_threshold", 0.40)
    return {
        "sport": sport,
        "scoring_params_version": SCORING_PARAMS_VERSION,
        "curve": [w["pct_usable"] for w in weeks],
        "weeks": weeks,
        "good_weeks": [w["week"] for w in weeks if w["pct_usable"] >= threshold],
    }


def describe_week(spot_id, week: int, *, db) -> dict:
    """Stage-1 description for a spot's week."""
    spot = _load_spot(db, spot_id)
    entry = _week_entry(spot.climatology, week)
    if entry is None:
        raise LookupError(f"no climatology week {week} for spot {spot_id}")
    return describe_week_entry(entry)
