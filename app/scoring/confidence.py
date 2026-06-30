"""Per-spot confidence tier for a sport: hoch | mittel | niedrig."""

from __future__ import annotations

from typing import Any

HIGH = "hoch"
MEDIUM = "mittel"
LOW = "niedrig"

_ORDER = [LOW, MEDIUM, HIGH]
_VALID = set(_ORDER)

# Sports whose drivers are modelled less reliably get a one-tier haircut.
_WAVE_SPORTS = {"surf"}


def _downgrade(tier: str) -> str:
    i = _ORDER.index(tier)
    return _ORDER[max(0, i - 1)]


def confidence_for(
    climatology: Any,
    editorial: dict | None,
    sport: str,
    *,
    numeric_confidence: float | None = None,
    wind_type: str | None = None,
) -> str:
    """Pure confidence rule.

    ``editorial.confidence_override`` (hoch/mittel/niedrig) wins outright. Else
    start from whether climatology exists, then downgrade for wave or thermal
    sports and for a low stored numeric confidence.
    """
    editorial = editorial or {}
    override = editorial.get("confidence_override")
    if override in _VALID:
        return override

    has_clim = isinstance(climatology, dict) and bool(climatology.get("weeks"))
    if not has_clim:
        return LOW

    tier = HIGH
    if sport in _WAVE_SPORTS:
        tier = _downgrade(tier)
    if (wind_type or editorial.get("wind_type")) == "thermal":
        tier = _downgrade(tier)
    if numeric_confidence is not None and numeric_confidence < 0.4:
        tier = _downgrade(tier)
    return tier


def spot_confidence(spot_id, sport: str, *, db) -> str:
    """Confidence tier for a stored spot."""
    from app.models import Spot

    spot = db.get(Spot, spot_id)
    if spot is None:
        raise LookupError(f"unknown spot {spot_id}")
    return confidence_for(
        spot.climatology,
        spot.editorial,
        sport,
        numeric_confidence=spot.confidence,
    )
