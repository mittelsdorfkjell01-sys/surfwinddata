"""Helpers for turning a Spot into evaluation inputs (editorial + sport)."""

from __future__ import annotations

from typing import Any


def spot_editorial(spot: Any) -> dict:
    """Editorial dict for a spot, with the spot's ``facing`` folded in.

    ``facing`` (a column) drives the onshore-wind gate, but editorial may already
    carry its own; editorial wins.
    """
    ed = dict(getattr(spot, "editorial", None) or {})
    if "facing" not in ed and getattr(spot, "facing", None) is not None:
        ed["facing"] = spot.facing
    return ed


def primary_sport(spot: Any, sport: str | None = None) -> str | None:
    """Explicit sport, else the spot's first listed sport."""
    if sport:
        return sport
    sports = getattr(spot, "sports", None) or []
    return sports[0] if sports else None
