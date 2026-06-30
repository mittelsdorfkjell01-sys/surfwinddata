"""Live conditions and 7-day forecast assembly.

The cached fetch always pulls the full 7-day horizon once, so the live and the
forecast endpoints share a single cache entry per (model, location). The forecast
is then capped/sliced to the requested number of days. Confidence is staffed by
day: days 1-3 ``hoch``, 4-5 ``mittel``, 6-7 ``niedrig``.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.live.cache import Cache, cache_key, default_cache
from app.live.client import MAX_FORECAST_DAYS, OpenMeteoClient, default_client
from app.live.models import select_model
from app.models import Spot

CONFIDENCE_HIGH = "hoch"
CONFIDENCE_MEDIUM = "mittel"
CONFIDENCE_LOW = "niedrig"


def confidence_for_day(day_index: int) -> str:
    """0-based day index -> confidence tier (days 1-3 / 4-5 / 6-7)."""
    if day_index <= 2:
        return CONFIDENCE_HIGH
    if day_index <= 4:
        return CONFIDENCE_MEDIUM
    return CONFIDENCE_LOW


def _spot_coords(spot: Spot) -> tuple[float, float]:
    from geoalchemy2.shape import to_shape

    point = to_shape(spot.location)
    return point.y, point.x  # (lat, lon)


def _load_spot(db: Session, spot_id) -> Spot:
    spot = db.get(Spot, spot_id)
    if spot is None:
        raise LookupError(f"unknown spot {spot_id}")
    return spot


# --- cached fetches --------------------------------------------------------

def _cached_forecast(
    lat: float, lon: float, model: str, *, client: OpenMeteoClient, cache: Cache
) -> dict:
    key = cache_key(model, lat, lon, "forecast")
    hit = cache.get(key)
    if hit is not None:
        return hit
    data = client.fetch_forecast(lat, lon, model, MAX_FORECAST_DAYS)
    cache.set(key, data, get_settings().live_cache_ttl)
    return data


def _cached_marine(
    lat: float, lon: float, *, client: OpenMeteoClient, cache: Cache
) -> dict:
    # Marine model is independent of the atmospheric model -> fixed key segment.
    key = cache_key("marine", lat, lon, "marine")
    hit = cache.get(key)
    if hit is not None:
        return hit
    data = client.fetch_marine(lat, lon, MAX_FORECAST_DAYS)
    cache.set(key, data, get_settings().live_cache_ttl)
    return data


# --- public service entry points -------------------------------------------

def get_live_conditions(
    spot_id,
    *,
    db: Session,
    client: OpenMeteoClient | None = None,
    cache: Cache | None = None,
) -> dict:
    """Current conditions for a spot, from cache or a fresh fetch.

    Returns ``current{wind, gust, dir, air, sst, swell, period, swell_dir}``.
    Never persisted to Postgres.
    """
    client = client or default_client()
    cache = cache or default_cache()

    spot = _load_spot(db, spot_id)
    lat, lon = _spot_coords(spot)
    model = select_model(lat, lon, spot.model_pref)

    fc = _cached_forecast(lat, lon, model, client=client, cache=cache)
    mar = _cached_marine(lat, lon, client=client, cache=cache)
    cur_f = fc.get("current") or {}
    cur_m = mar.get("current") or {}

    return {
        "spot_id": spot.id,
        "model": model,
        "time": cur_f.get("time"),
        "current": {
            "wind": cur_f.get("wind_speed_10m"),
            "gust": cur_f.get("wind_gusts_10m"),
            "dir": cur_f.get("wind_direction_10m"),
            "air": cur_f.get("temperature_2m"),
            "sst": cur_m.get("sea_surface_temperature"),
            "swell": cur_m.get("swell_wave_height"),
            "period": cur_m.get("swell_wave_period"),
            "swell_dir": cur_m.get("swell_wave_direction"),
        },
    }


def _index_marine_hours(marine: dict) -> dict[str, dict]:
    hourly = marine.get("hourly") or {}
    times = hourly.get("time") or []
    swh = hourly.get("swell_wave_height") or []
    per = hourly.get("swell_wave_period") or []
    sdir = hourly.get("swell_wave_direction") or []
    by_time: dict[str, dict] = {}
    for i, t in enumerate(times):
        by_time[t] = {
            "swell": swh[i] if i < len(swh) else None,
            "period": per[i] if i < len(per) else None,
            "swell_dir": sdir[i] if i < len(sdir) else None,
        }
    return by_time


def _merge_hours(forecast: dict, marine: dict) -> list[dict]:
    hourly = forecast.get("hourly") or {}
    times = hourly.get("time") or []
    ws = hourly.get("wind_speed_10m") or []
    wg = hourly.get("wind_gusts_10m") or []
    wd = hourly.get("wind_direction_10m") or []
    t2 = hourly.get("temperature_2m") or []
    marine_by_time = _index_marine_hours(marine)

    hours: list[dict] = []
    for i, t in enumerate(times):
        m = marine_by_time.get(t, {})
        hours.append(
            {
                "time": t,
                "wind": ws[i] if i < len(ws) else None,
                "gust": wg[i] if i < len(wg) else None,
                "dir": wd[i] if i < len(wd) else None,
                "air": t2[i] if i < len(t2) else None,
                "swell": m.get("swell"),
                "period": m.get("period"),
                "swell_dir": m.get("swell_dir"),
            }
        )
    return hours


def _nums(values: list) -> list[float]:
    return [v for v in values if isinstance(v, (int, float))]


def _day_summary(hours: list[dict]) -> dict:
    winds = _nums([h["wind"] for h in hours])
    gusts = _nums([h["gust"] for h in hours])
    airs = _nums([h["air"] for h in hours])
    swells = _nums([h["swell"] for h in hours])
    return {
        "wind_avg": round(sum(winds) / len(winds), 1) if winds else None,
        "wind_max": round(max(winds), 1) if winds else None,
        "gust_max": round(max(gusts), 1) if gusts else None,
        "air_min": round(min(airs), 1) if airs else None,
        "air_max": round(max(airs), 1) if airs else None,
        "swell_max": round(max(swells), 1) if swells else None,
    }


def get_forecast_series(
    spot_id,
    days: int = MAX_FORECAST_DAYS,
    *,
    db: Session,
    client: OpenMeteoClient | None = None,
    cache: Cache | None = None,
) -> dict:
    """Daily + hourly forecast with a confidence tier per day.

    Returns at most :data:`MAX_FORECAST_DAYS` days (the horizon is hard-capped);
    nothing beyond 7 days and no climatology blending.
    """
    client = client or default_client()
    cache = cache or default_cache()
    days = max(1, min(days, MAX_FORECAST_DAYS))

    spot = _load_spot(db, spot_id)
    lat, lon = _spot_coords(spot)
    model = select_model(lat, lon, spot.model_pref)

    fc = _cached_forecast(lat, lon, model, client=client, cache=cache)
    mar = _cached_marine(lat, lon, client=client, cache=cache)
    hours = _merge_hours(fc, mar)

    # Group hours by calendar date, preserving order.
    by_date: dict[str, list[dict]] = {}
    for h in hours:
        date = str(h["time"])[:10]
        by_date.setdefault(date, []).append(h)

    ordered_dates = list(by_date.keys())[:days]  # hard horizon cap
    day_records = [
        {
            "date": date,
            "confidence": confidence_for_day(i),
            "summary": _day_summary(by_date[date]),
            "hours": by_date[date],
        }
        for i, date in enumerate(ordered_dates)
    ]

    return {
        "spot_id": spot.id,
        "model": model,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "days": day_records,
    }
