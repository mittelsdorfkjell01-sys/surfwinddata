"""Test doubles for the live path: a counting fake Open-Meteo client, synthetic
responses, and a minimal fake DB returning a single in-memory spot."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.models import Spot

_BASE = datetime(2026, 6, 29, 0, 0)


def _hourly_times(days: int) -> list[str]:
    return [
        (_BASE + timedelta(hours=h)).strftime("%Y-%m-%dT%H:%M")
        for h in range(days * 24)
    ]


def make_forecast_response(days: int = 8) -> dict:
    times = _hourly_times(days)
    n = len(times)
    return {
        "latitude": 36.0,
        "longitude": -5.6,
        "current": {
            "time": times[0],
            "wind_speed_10m": 14.0,
            "wind_gusts_10m": 19.0,
            "wind_direction_10m": 270.0,
            "temperature_2m": 22.0,
        },
        "hourly": {
            "time": times,
            "wind_speed_10m": [10.0 + (i % 12) for i in range(n)],
            "wind_gusts_10m": [15.0 + (i % 12) for i in range(n)],
            "wind_direction_10m": [(i * 5) % 360 for i in range(n)],
            "temperature_2m": [18.0 + (i % 8) for i in range(n)],
        },
    }


def make_marine_response(days: int = 8) -> dict:
    times = _hourly_times(days)
    n = len(times)
    return {
        "current": {
            "time": times[0],
            "swell_wave_height": 1.2,
            "swell_wave_period": 9.0,
            "swell_wave_direction": 250.0,
            "sea_surface_temperature": 20.0,
        },
        "hourly": {
            "time": times,
            "swell_wave_height": [1.0 + 0.1 * (i % 5) for i in range(n)],
            "swell_wave_period": [8.0 + (i % 4) for i in range(n)],
            "swell_wave_direction": [(200 + i) % 360 for i in range(n)],
            "sea_surface_temperature": [19.0 + (i % 3) for i in range(n)],
        },
    }


class FakeOpenMeteoClient:
    """Records call counts and the model it was asked for. No network."""

    def __init__(self, data_days: int = 8) -> None:
        self._data_days = data_days
        self.forecast_calls = 0
        self.marine_calls = 0
        self.models_seen: list[str] = []

    def fetch_forecast(self, lat, lon, model, days=7) -> dict:
        self.forecast_calls += 1
        self.models_seen.append(model)
        return make_forecast_response(self._data_days)

    def fetch_marine(self, lat, lon, days=7) -> dict:
        self.marine_calls += 1
        return make_marine_response(self._data_days)


def make_spot(lat: float = 36.0128, lon: float = -5.6035, model_pref=None) -> Spot:
    spot = Spot(
        slug="test-spot",
        name="Test Spot",
        region_id=uuid.uuid4(),
        location=from_shape(Point(lon, lat), srid=4326),
        model_pref=model_pref,
        sports=["kitesurf"],
        status="published",
    )
    spot.id = uuid.uuid4()
    return spot


class FakeDB:
    """Stands in for a SQLAlchemy Session's ``.get`` lookup."""

    def __init__(self, spot: Spot) -> None:
        self._spot = spot

    def get(self, model, ident):
        return self._spot if ident == self._spot.id else None
