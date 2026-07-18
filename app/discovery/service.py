"""DB + forecast orchestration for the featured Top-Spots ranking.

Computes the ranking once per ``(sport, day)`` and caches the ordered spot ids
(Redis, via the shared live cache), so the set is stable within a day and
recomputed when the date rolls over. The per-spot forecast fetches reuse the
same cache entries as the live/forecast endpoints, so on a trafficked site the
underlying weather data is usually already warm.
"""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, defer

from app.community.aggregate import bayesian_score, global_mean
from app.discovery import featured
from app.live.cache import Cache, default_cache
from app.live.client import MAX_FORECAST_DAYS, OpenMeteoClient, default_client
from app.models import Favorite, Spot, SpotRating
from app.scoring.context import primary_sport, spot_editorial
from app.scoring.evaluate import evaluate_conditions
from app.scoring.params import get_params

logger = logging.getLogger(__name__)

PUBLISHED = "published"
NO = "nein"
GOOD = "gut"
CACHE_VERSION = 1
N_WEEKS = 52


# --- cache -----------------------------------------------------------------

def _cache_key(sport: str | None, limit: int, day: date) -> str:
    return f"featured:v{CACHE_VERSION}:{sport or 'any'}:{limit}:{day.isoformat()}"


def _seconds_until_next_utc_midnight(day: date, *, now: datetime | None = None) -> int:
    """TTL that expires at the next UTC midnight, so the set lives exactly one day."""
    now = now or datetime.now(timezone.utc)
    midnight = datetime.combine(day + timedelta(days=1), time.min, tzinfo=timezone.utc)
    return max(60, int((midnight - now).total_seconds()))


# --- candidate loading -----------------------------------------------------

def _load_candidates(db: Session, sport: str | None) -> list[Spot]:
    """Published, scorable spots. Heavy JSONB (climatology/overrides/era5) is
    deferred — only the climatology fallback touches it, lazily and rarely."""
    stmt = (
        select(Spot)
        .options(
            defer(Spot.climatology),
            defer(Spot.overrides),
            defer(Spot.era5_cell),
        )
        .where(Spot.status == PUBLISHED)
    )
    if sport is not None:
        stmt = stmt.where(Spot.sports.any(sport))
    return list(db.scalars(stmt))


def _spot_coords(spot: Spot) -> tuple[float, float] | None:
    from geoalchemy2.shape import to_shape

    if spot.location is None:
        return None
    point = to_shape(spot.location)
    return point.y, point.x  # (lat, lon)


# --- popularity ------------------------------------------------------------

def _popularity_index(db: Session) -> tuple[dict, dict, float]:
    """``(ratings_by_spot, favorites_by_spot, global_mean)`` in two grouped
    queries — no per-spot round-trips."""
    rating_rows = db.execute(
        select(
            SpotRating.spot_id,
            func.count(SpotRating.id),
            func.coalesce(func.sum(SpotRating.stars), 0),
        )
        .where(SpotRating.status == PUBLISHED)
        .group_by(SpotRating.spot_id)
    ).all()
    ratings = {sid: (int(n), int(s)) for sid, n, s in rating_rows}

    fav_rows = db.execute(
        select(Favorite.spot_id, func.count(Favorite.id)).group_by(Favorite.spot_id)
    ).all()
    favorites = {sid: int(c) for sid, c in fav_rows}

    return ratings, favorites, global_mean(db)


# --- wind signals from the actual forecast ---------------------------------

def _daylight_mask(hours: list[dict], lat: float, lon: float) -> list[bool]:
    """Sun-above-horizon flag per forecast hour (one vectorised solar call)."""
    from app.era5.solar import solar_elevation_deg

    times = [datetime.fromisoformat(str(h["time"])) for h in hours]
    elevations = solar_elevation_deg(times, lat, lon)
    return [bool(e > 0.0) for e in elevations]


def _hour_values(h: dict) -> dict:
    """Merged forecast hour → the value dict evaluate_conditions expects."""
    return {
        "wind_kt": h.get("wind"),
        "gust_kt": h.get("gust"),
        "wind_dir": h.get("dir"),
        "swell_m": h.get("swell"),
        "period_s": h.get("period"),
        "swell_dir": h.get("swell_dir"),
        "air": h.get("air"),
        "sst": None,  # not carried on the forecast hour merge
        "daylight": True,
    }


def _day_quality(
    hours: list[dict], lat: float, lon: float, editorial: dict, sport: str, params: dict
) -> float:
    """[0, 1] quality for one forecast day: share of daylight hours rated
    ``gut`` (full credit) / merely usable (partial), via the shared engine."""
    if not hours:
        return 0.0
    daylight = _daylight_mask(hours, lat, lon)
    total = usable = good = 0
    for h, lit in zip(hours, daylight):
        if not lit:
            continue
        total += 1
        rating = evaluate_conditions(_hour_values(h), editorial, None, sport, params)[
            "rating"
        ]
        if rating != NO:
            usable += 1
            if rating == GOOD:
                good += 1
    if total == 0:
        return 0.0
    return featured.day_quality(usable / total, good / total)


def _forecast_day_qualities(
    spot: Spot, coords: tuple[float, float], *, db, client, cache
) -> list[float]:
    """Per-day quality over the 7-day forecast horizon (best-first by date)."""
    from app.live.service import get_forecast_series

    sport = primary_sport(spot)
    if sport is None:
        return []
    lat, lon = coords
    params = get_params(sport, db)
    editorial = spot_editorial(spot)
    series = get_forecast_series(
        spot.id, MAX_FORECAST_DAYS, db=db, client=client, cache=cache
    )
    return [
        _day_quality(day.get("hours") or [], lat, lon, editorial, sport, params)
        for day in series.get("days", [])
    ]


def _climatology_day_qualities(spot: Spot, day: date, db: Session) -> list[float]:
    """Fallback when a spot has no live forecast (no coords / fetch error): use
    this calendar week's climatological usable-share as a flat day quality."""
    from app.search.timewindow import spot_week_scores

    sport = primary_sport(spot)
    if sport is None:
        return []
    scores = spot_week_scores(spot, sport, None, None, db)  # pct_usable[52]
    week_idx = min(day.isocalendar().week, N_WEEKS) - 1
    pct = scores[week_idx] if 0 <= week_idx < len(scores) else 0.0
    return [pct] * MAX_FORECAST_DAYS


# --- public entry point ----------------------------------------------------

def _compute(
    db: Session,
    *,
    limit: int,
    sport: str | None,
    client: OpenMeteoClient,
    cache: Cache,
    day: date,
) -> list[uuid.UUID]:
    candidates = _load_candidates(db, sport)
    ratings, favorites, mean = _popularity_index(db)

    rows: list[dict] = []
    for spot in candidates:
        coords = _spot_coords(spot)
        try:
            if coords is None:
                raise LookupError("spot has no location")
            qualities = _forecast_day_qualities(
                spot, coords, db=db, client=client, cache=cache
            )
        except Exception as exc:  # forecast fetch / evaluation failed — degrade
            logger.warning(
                "featured: forecast unavailable for %s (%s) — climatology fallback",
                spot.id,
                exc,
            )
            qualities = _climatology_day_qualities(spot, day, db)

        n_ratings, star_sum = ratings.get(spot.id, (0, 0))
        rows.append(
            {
                "spot_id": spot.id,
                "week_wind": featured.week_wind_score(qualities),
                "today": featured.today_score(qualities),
                "popularity": featured.popularity_score(
                    bayesian_score(n_ratings, star_sum, mean),
                    n_ratings,
                    favorites.get(spot.id, 0),
                ),
                "seed": featured.daily_seed(spot.id, day),
            }
        )

    return [r["spot_id"] for r in featured.rank(rows)[:limit]]


def top_spot_ids(
    db: Session,
    *,
    limit: int = 5,
    sport: str | None = None,
    client: OpenMeteoClient | None = None,
    cache: Cache | None = None,
    today: date | None = None,
) -> list[uuid.UUID]:
    """Ordered ids of the "aktuelle Top Spots", cached per ``(sport, limit, day)``.

    The ranking blends this week's wind forecast, today's conditions and
    community popularity (see :mod:`app.discovery.featured`), with a date seed so
    the set rotates daily. Fail-open: a cache miss recomputes; a dead cache just
    recomputes every call.
    """
    client = client or default_client()
    cache = cache or default_cache()
    day = today or datetime.now(timezone.utc).date()

    key = _cache_key(sport, limit, day)
    hit = cache.get(key)
    if hit is not None:
        return [uuid.UUID(x) for x in hit]

    ordered = _compute(
        db, limit=limit, sport=sport, client=client, cache=cache, day=day
    )
    cache.set(key, [str(x) for x in ordered], _seconds_until_next_utc_midnight(day))
    return ordered
