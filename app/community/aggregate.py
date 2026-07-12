"""Rating aggregation for a spot: count, average, and a Bayesian score.

A **Bayesian average** ``(C·m + Σstars) / (C + n)`` keeps a spot with one 5★
rating from leaping past a spot with fifty 4★ ones: ``m`` is the global mean,
``C`` a confidence weight (how many "prior" votes at ``m`` each spot starts with).

The three public sort modes are exposed as pure key functions so the search layer
can rank without duplicating the formula (it reads the aggregate, it does not
recompute the numeric scoring core).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import SpotRating

# C — prior weight; DEFAULT_PRIOR_MEAN — m fallback before any ratings exist.
BAYES_CONFIDENCE = 5
DEFAULT_PRIOR_MEAN = 3.5
# "Geheimtipp" (insider) = strong average from only a handful of ratings.
GEHEIMTIPP_MAX_N = 5
GEHEIMTIPP_MIN_AVG = 4.0

PUBLISHED = "published"


def global_mean(db: Session) -> float:
    avg = db.scalar(
        select(func.avg(SpotRating.stars)).where(SpotRating.status == PUBLISHED)
    )
    return float(avg) if avg is not None else DEFAULT_PRIOR_MEAN


def bayesian_score(n: int, star_sum: int, m: float, c: int = BAYES_CONFIDENCE) -> float:
    """(C·m + Σstars) / (C + n). With n=0 this is exactly the prior mean m."""
    return (c * m + star_sum) / (c + n) if (c + n) else m


def rating_aggregate(db: Session, spot_id, *, m: float | None = None) -> dict[str, Any]:
    """``{count, avg, score}`` over a spot's *published* ratings."""
    n, star_sum = db.execute(
        select(
            func.count(SpotRating.id),
            func.coalesce(func.sum(SpotRating.stars), 0),
        ).where(SpotRating.spot_id == spot_id, SpotRating.status == PUBLISHED)
    ).one()
    n, star_sum = int(n), int(star_sum)
    mean = m if m is not None else global_mean(db)
    avg = (star_sum / n) if n else None
    return {
        "count": n,
        "avg": round(avg, 2) if avg is not None else None,
        "score": round(bayesian_score(n, star_sum, mean), 3),
    }


def is_geheimtipp(agg: dict[str, Any]) -> bool:
    return (
        0 < agg["count"] <= GEHEIMTIPP_MAX_N
        and (agg["avg"] or 0) >= GEHEIMTIPP_MIN_AVG
    )


def sort_key(mode: str, agg: dict[str, Any]) -> tuple:
    """Ranking key (descending) for a spot's aggregate, per public sort mode:

    * ``beste``      — Bayesian score, then vote count (many + good win).
    * ``geheimtipp`` — insiders first (high avg, low n), then average.
    * ``empfohlen``  — balanced default; accessibility weighting is applied by the
      caller that also holds the spot's facilities, so here it is the Bayesian score.
    """
    if mode == "beste":
        return (agg["score"], agg["count"])
    if mode == "geheimtipp":
        return (1 if is_geheimtipp(agg) else 0, agg["avg"] or 0, -agg["count"])
    return (agg["score"],)  # empfohlen / default
