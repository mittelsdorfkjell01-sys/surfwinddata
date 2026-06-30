"""Orientation normalisation.

Two coasts that are mirror images (e.g. a west-facing and an east-facing beach)
feel the same wind *relative to the shore* even though the absolute compass
directions differ. We therefore translate a spot's usable wind sectors into an
onshore/side/offshore pattern **relative to its ``facing``**, folding left/right
so mirrored coasts collapse onto the same pattern.
"""

from __future__ import annotations

from app.era5.bins import N_SECTORS, SECTOR_WIDTH_DEG
from app.scoring.geometry import direction_in_windows

# Pattern buckets, by the folded offset (0..180) between wind bearing and facing.
ORIENTATION_CATEGORIES = (
    "onshore",        # wind from the sea, straight in
    "side_onshore",
    "cross",          # along the shore
    "side_offshore",
    "offshore",       # wind from the land, straight out
)


def _classify(folded_deg: float) -> str:
    if folded_deg <= 22.5:
        return "onshore"
    if folded_deg <= 67.5:
        return "side_onshore"
    if folded_deg <= 112.5:
        return "cross"
    if folded_deg <= 157.5:
        return "side_offshore"
    return "offshore"


def window_to_sectors(windows) -> list[int]:
    """The 16-point sectors whose centre bearing falls in ``windows``.

    ``windows`` is a window dict ``{"min","max"}``, a list of windows, or a list
    of sector indices.
    """
    if windows is None:
        return []
    if isinstance(windows, list) and windows and isinstance(windows[0], int):
        return [s % N_SECTORS for s in windows]
    return [
        s for s in range(N_SECTORS)
        if direction_in_windows(s * SECTOR_WIDTH_DEG, windows)
    ]


def normalize_orientation(sectors, facing: float | None) -> dict | None:
    """Onshore/side/offshore pattern of ``sectors`` relative to ``facing``.

    Returns a normalised distribution over :data:`ORIENTATION_CATEGORIES`, or
    ``None`` if ``facing`` or ``sectors`` are missing (orientation can't be
    judged). Folding the bearing offset to ``[0, 180]`` makes the pattern
    invariant to coastline mirroring.
    """
    if facing is None or not sectors:
        return None
    counts = {c: 0 for c in ORIENTATION_CATEGORIES}
    for s in sectors:
        bearing = (s * SECTOR_WIDTH_DEG) % 360.0
        rel = (bearing - facing) % 360.0
        folded = min(rel, 360.0 - rel)
        counts[_classify(folded)] += 1
    total = sum(counts.values())
    return {c: round(counts[c] / total, 4) for c in ORIENTATION_CATEGORIES}


def orientation_l1(a: dict | None, b: dict | None) -> float | None:
    """L1 distance between two orientation patterns, normalised to [0, 1]."""
    if a is None or b is None:
        return None
    return round(sum(abs(a[c] - b[c]) for c in ORIENTATION_CATEGORIES) / 2.0, 4)
