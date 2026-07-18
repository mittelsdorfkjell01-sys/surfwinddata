"""Featured "aktuelle Top Spots" ranking — pure scoring, no DB / no HTTP.

Three signals are combined into one score (weights sum to 1.0):

* ``week_wind``  — how good the wind is over the next 7 forecast days, evaluated
  with the *same* :func:`app.scoring.evaluate.evaluate_conditions` used
  everywhere else (so "gut" here means "gut" on the spot page too). This is the
  headline "Wind diese Woche gut".
* ``today``      — how good *today's* conditions are (the now-badge angle).
* ``popularity`` — community signal: a spot's Bayesian rating blended with
  engagement (favourites + rating count).

A small date-seeded ``seed`` term breaks ties deterministically and guarantees
the set visibly rotates day to day even when the underlying data barely moves.

Everything here is pure: the service layer feeds in forecast day-quality values
and popularity aggregates, so the weighting stays unit-testable and the scoring
seam matches the rest of the codebase (this module ranks; it does not fetch).
"""

from __future__ import annotations

import hashlib
import math
from datetime import date
from typing import Any

# --- weights (sum to 1.0) --------------------------------------------------
W_WEEK = 0.45  # wind this week (actual 7-day forecast)
W_TODAY = 0.30  # current / today's conditions
W_POPULARITY = 0.20  # ratings + favourites
W_SEED = 0.05  # daily jitter — guarantees day-to-day rotation, breaks ties

# A day's quality gives "gut" hours full credit and merely-usable ("mäßig")
# hours partial credit, so a day of solid conditions beats a day of marginal ones.
MAESSIG_CREDIT = 0.4

# Rating normalisation: stars are 1..5; map the Bayesian score onto [0, 1].
RATING_STAR_MIN = 1.0
RATING_STAR_MAX = 5.0
# Engagement (favourites + ratings) saturates on a log curve: this many total
# interactions maps to ~1.0, so a wildly-popular spot cannot swamp the signal.
ENGAGEMENT_SATURATION = 25
POP_RATING_WEIGHT = 0.6
POP_ENGAGEMENT_WEIGHT = 0.4


def _clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def day_quality(pct_usable: float, gut_anteil: float) -> float:
    """[0, 1] quality for one day.

    ``gut`` hours score full, merely-usable ("mäßig") hours partial. Both inputs
    are shares of the day's *daylight* hours, with ``gut_anteil <= pct_usable``
    by construction (a "gut" hour is also usable).
    """
    maessig = max(0.0, pct_usable - gut_anteil)
    return _clamp01(gut_anteil + MAESSIG_CREDIT * maessig)


def week_wind_score(day_qualities: list[float]) -> float:
    """Mean day-quality over the forecast horizon → "Wind diese Woche gut"."""
    return sum(day_qualities) / len(day_qualities) if day_qualities else 0.0


def today_score(day_qualities: list[float]) -> float:
    """First forecast day's quality → "aktueller guter Score"."""
    return day_qualities[0] if day_qualities else 0.0


def popularity_score(bayes_rating: float, n_ratings: int, n_favorites: int) -> float:
    """[0, 1] popularity from a Bayesian star rating plus engagement volume."""
    span = RATING_STAR_MAX - RATING_STAR_MIN
    norm_rating = _clamp01((bayes_rating - RATING_STAR_MIN) / span) if span else 0.0
    interactions = max(0, n_ratings) + max(0, n_favorites)
    engagement = math.log1p(interactions) / math.log1p(ENGAGEMENT_SATURATION)
    return _clamp01(
        POP_RATING_WEIGHT * norm_rating + POP_ENGAGEMENT_WEIGHT * _clamp01(engagement)
    )


def daily_seed(spot_id: Any, day: date) -> float:
    """Deterministic [0, 1) jitter for ``(spot, day)``.

    Stable within a day (so the Top-Spots set doesn't reshuffle on every load)
    but different each day (so it rotates). Independent of the spot's data.
    """
    digest = hashlib.sha256(f"{spot_id}:{day.isoformat()}".encode()).hexdigest()
    return int(digest[:8], 16) / 0x100000000


def featured_score(
    week_wind: float, today: float, popularity: float, seed: float
) -> float:
    """The weighted blend of the four terms."""
    return (
        W_WEEK * week_wind
        + W_TODAY * today
        + W_POPULARITY * popularity
        + W_SEED * seed
    )


def rank(candidates: list[dict]) -> list[dict]:
    """Score and sort candidates best-first (pure).

    Each candidate is a dict with ``spot_id``, ``week_wind``, ``today``,
    ``popularity`` and ``seed``. Returns the same dicts with a ``score`` key
    added, sorted descending. Ties break on ``seed`` then ``spot_id`` so the
    order is deterministic for a given day.
    """
    scored = [
        {
            **c,
            "score": featured_score(
                c["week_wind"], c["today"], c["popularity"], c["seed"]
            ),
        }
        for c in candidates
    ]
    scored.sort(key=lambda c: (c["score"], c["seed"], str(c["spot_id"])), reverse=True)
    return scored
