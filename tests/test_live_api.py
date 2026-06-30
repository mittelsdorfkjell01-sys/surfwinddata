"""API tests for /spots/{id}/live and /forecast, with Open-Meteo + cache mocked
via FastAPI dependency overrides. DB-gated (skips when the test DB is down)."""

from __future__ import annotations

import pytest
from sqlalchemy import select

from app.live.cache import InMemoryCache
from app.live.client import MAX_FORECAST_DAYS
from app.live.deps import get_cache, get_om_client
from app.main import app
from app.models import Spot
from app.seed.seed import seed
from tests.live_helpers import FakeOpenMeteoClient


@pytest.fixture
def seeded_spot_id(db):
    seed(db)
    spot = db.scalar(select(Spot).where(Spot.slug == "tarifa-los-lances"))
    return spot.id


@pytest.fixture
def fake_live(client):
    fake = FakeOpenMeteoClient()
    cache = InMemoryCache()
    app.dependency_overrides[get_om_client] = lambda: fake
    app.dependency_overrides[get_cache] = lambda: cache
    yield fake
    app.dependency_overrides.pop(get_om_client, None)
    app.dependency_overrides.pop(get_cache, None)


def test_live_endpoint(client, seeded_spot_id, fake_live):
    resp = client.get(f"/spots/{seeded_spot_id}/live")
    assert resp.status_code == 200
    body = resp.json()
    assert body["model"]
    assert set(body["current"]) == {
        "wind", "gust", "dir", "air", "sst", "swell", "period", "swell_dir"
    }


def test_forecast_endpoint_caps_at_7(client, seeded_spot_id, fake_live):
    resp = client.get(f"/spots/{seeded_spot_id}/forecast")
    assert resp.status_code == 200
    days = resp.json()["days"]
    assert len(days) == MAX_FORECAST_DAYS
    assert days[0]["confidence"] == "hoch"
    assert days[-1]["confidence"] == "niedrig"


def test_forecast_endpoint_rejects_over_horizon(client, seeded_spot_id, fake_live):
    # query validation caps days at 7
    resp = client.get(f"/spots/{seeded_spot_id}/forecast?days=10")
    assert resp.status_code == 422


def test_live_endpoint_404_for_unknown_spot(client, fake_live):
    import uuid

    resp = client.get(f"/spots/{uuid.uuid4()}/live")
    assert resp.status_code == 404
