"""Season ('saison') distance: do two spots run at the *same time of year*?

Compares the pre-computed 52-week usable-hours curves by Pearson correlation. A
high correlation means the same season (distance → 0); anti-correlation means
opposite seasons (distance → 1).
"""

from __future__ import annotations

from statistics import mean
from typing import Any

from app.search.timewindow import spot_week_scores


def pearson(x: list[float], y: list[float]) -> float | None:
    """Pearson correlation, or ``None`` if either series has no variance."""
    n = len(x)
    if n == 0 or n != len(y):
        return None
    mx, my = mean(x), mean(y)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    sxx = sum((a - mx) ** 2 for a in x)
    syy = sum((b - my) ** 2 for b in y)
    if sxx == 0 or syy == 0:
        return None
    return sxy / (sxx**0.5 * syy**0.5)


def season_distance(curve_a: list[float], curve_b: list[float]) -> float:
    """Map correlation of two weekly curves to a distance in [0, 1].

    ``r = 1`` (same season) → 0, ``r = -1`` (opposite) → 1, undefined → 0.5.
    """
    r = pearson(curve_a, curve_b)
    if r is None:
        return 0.5
    return round((1.0 - r) / 2.0, 4)


def season_distance_spots(
    a: Any, b: Any, sport: str | None = None, profile: dict | None = None
) -> float:
    return season_distance(
        spot_week_scores(a, sport, profile), spot_week_scores(b, sport, profile)
    )
