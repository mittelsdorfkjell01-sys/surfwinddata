"""Mocked Open-Meteo tests for the live + forecast path. No network, no database."""

from __future__ import annotations

import pytest

from app.live.cache import InMemoryCache, cache_key
from app.live.client import MAX_FORECAST_DAYS
from app.live.models import AROME, BEST_MATCH, ICON_D2, ICON_EU, select_model
from app.live.service import (
    confidence_for_day,
    get_forecast_series,
    get_live_conditions,
)
from tests.live_helpers import FakeDB, FakeOpenMeteoClient, make_spot


# --- model selection -------------------------------------------------------

def test_select_model_regional_domains():
    assert select_model(48.8, 2.3) == AROME       # Paris / France
    assert select_model(52.5, 13.4) == ICON_D2    # Berlin / central EU
    assert select_model(36.0128, -5.6035) == ICON_EU  # Tarifa / wider EU
    assert select_model(0.0, -30.0) == BEST_MATCH     # mid-Atlantic


def test_select_model_respects_pref():
    # model_pref always wins, even where a regional model would apply
    assert select_model(48.8, 2.3, pref="gfs") == "gfs"


# --- cache key -------------------------------------------------------------

def test_cache_key_rounds_coordinates():
    assert cache_key("icon_eu", 36.0128, -5.6035, "forecast") == (
        "om:icon_eu:36.01:-5.6:forecast"
    )


# --- confidence staffing ---------------------------------------------------

def test_confidence_for_day_tiers():
    assert [confidence_for_day(i) for i in range(7)] == [
        "hoch", "hoch", "hoch", "mittel", "mittel", "niedrig", "niedrig",
    ]


# --- cache hit / miss ------------------------------------------------------

def test_second_call_hits_cache_no_http():
    spot = make_spot()
    db = FakeDB(spot)
    client = FakeOpenMeteoClient()
    cache = InMemoryCache()

    get_live_conditions(spot.id, db=db, client=client, cache=cache)
    assert client.forecast_calls == 1
    assert client.marine_calls == 1

    # within TTL -> served from cache, no new HTTP calls
    get_live_conditions(spot.id, db=db, client=client, cache=cache)
    assert client.forecast_calls == 1
    assert client.marine_calls == 1

    # forecast reuses the same cached forecast+marine entries -> still no calls
    get_forecast_series(spot.id, db=db, client=client, cache=cache)
    assert client.forecast_calls == 1
    assert client.marine_calls == 1


def test_live_conditions_shape_and_model():
    spot = make_spot(model_pref="icon_d2")
    out = get_live_conditions(
        spot.id, db=FakeDB(spot), client=FakeOpenMeteoClient(), cache=InMemoryCache()
    )
    assert out["model"] == "icon_d2"  # honoured model_pref
    cur = out["current"]
    assert set(cur) == {
        "wind", "gust", "dir", "air", "sst", "swell", "period", "swell_dir"
    }
    assert cur["wind"] == 14.0
    assert cur["sst"] == 20.0


def test_unknown_spot_raises_lookup():
    spot = make_spot()
    other = make_spot()
    with pytest.raises(LookupError):
        get_live_conditions(
            other.id, db=FakeDB(spot), client=FakeOpenMeteoClient(),
            cache=InMemoryCache(),
        )


# --- forecast horizon + confidence -----------------------------------------

def test_forecast_returns_exactly_7_days_with_confidence():
    spot = make_spot()
    # fake serves 8 days of data; the service must still cap at 7
    client = FakeOpenMeteoClient(data_days=8)
    series = get_forecast_series(
        spot.id, days=7, db=FakeDB(spot), client=client, cache=InMemoryCache()
    )

    assert len(series["days"]) == MAX_FORECAST_DAYS
    confidences = [d["confidence"] for d in series["days"]]
    assert confidences == [
        "hoch", "hoch", "hoch", "mittel", "mittel", "niedrig", "niedrig",
    ]
    # each day has 24 hourly samples and a summary
    for day in series["days"]:
        assert len(day["hours"]) == 24
        assert "wind_max" in day["summary"]


def test_forecast_horizon_is_capped_even_if_more_requested():
    spot = make_spot()
    client = FakeOpenMeteoClient(data_days=8)
    series = get_forecast_series(
        spot.id, days=20, db=FakeDB(spot), client=client, cache=InMemoryCache()
    )
    assert len(series["days"]) == MAX_FORECAST_DAYS  # never beyond 7


def test_forecast_fewer_days_when_requested():
    spot = make_spot()
    series = get_forecast_series(
        spot.id, days=3, db=FakeDB(spot), client=FakeOpenMeteoClient(),
        cache=InMemoryCache(),
    )
    assert len(series["days"]) == 3
    assert [d["confidence"] for d in series["days"]] == ["hoch", "hoch", "hoch"]


def test_forecast_hours_merge_wind_and_swell():
    spot = make_spot()
    series = get_forecast_series(
        spot.id, days=1, db=FakeDB(spot), client=FakeOpenMeteoClient(),
        cache=InMemoryCache(),
    )
    first_hour = series["days"][0]["hours"][0]
    assert first_hour["wind"] is not None
    assert first_hour["swell"] is not None      # marine merged in
    assert first_hour["period"] is not None
