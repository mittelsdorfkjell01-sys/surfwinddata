"""DB-gated admin workflow tests. Skip when the test database is unavailable.

Covers the full create → curate → validate → live path, the n/a rule, and the
override → audit → provenance → recompute → revert behaviour.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select

from app.admin.deps import get_cds_client, get_stock_client
from app.main import app
from app.models import Era5Job, Spot, SpotAudit
from app.seed.seed import seed
from tests.era5_helpers import FakeCdsClient, make_synthetic_series


class _FakeStock:
    def search(self, query):
        return {"url": f"img/{query}", "source": "unsplash",
                "license": "Unsplash License", "credit": "Jo"}


@pytest.fixture(scope="module", autouse=True)
def _seeded(_migrated_db):
    from app.db.session import SessionLocal
    from tests.conftest import require_db

    require_db()
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _cleanup_test_rows(db):
    """Delete this module's created regions after **each** test so accumulated
    spots/jobs don't collide (every fake job reuses cds_request_id 'fake-1') or
    leak into later modules. Region delete cascades to spots + era5_jobs."""
    yield
    from app.models import Region

    for region in db.scalars(
        select(Region).where(Region.slug.like("test-region-%"))
    ).all():
        db.delete(region)
    db.commit()


@pytest.fixture
def admin(client):
    app.dependency_overrides[get_cds_client] = lambda: FakeCdsClient(make_synthetic_series())
    app.dependency_overrides[get_stock_client] = lambda: _FakeStock()
    yield client
    app.dependency_overrides.pop(get_cds_client, None)
    app.dependency_overrides.pop(get_stock_client, None)


@pytest.fixture
def region_id(admin):
    # Unique slug per test — the fixture is function-scoped and rows aren't torn
    # down between tests, so a fixed slug would collide on the 2nd test.
    suffix = uuid.uuid4().hex[:8]
    resp = admin.post("/admin/regions", json={
        "name": f"Test Region {suffix}", "slug": f"test-region-{suffix}",
        "country": "DE", "lat": 54.4, "lon": 10.2,
        "defaults": {"model_pref": "icon_d2"},
    })
    assert resp.status_code == 201
    return resp.json()["id"]


def _create_spot(admin, region_id, **overrides):
    suffix = uuid.uuid4().hex[:8]
    body = {
        "name": f"New Spot {suffix}", "slug": f"new-spot-{suffix}",
        "region_id": region_id, "lat": 54.41, "lon": 10.22,
        "sports": ["kitesurf"], "water_type": "sea", "bottom_type": "sand",
        "level": "beginner", "water_character": "chop",
    }
    body.update(overrides)
    resp = admin.post("/admin/spots", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


# --- create: draft + template + ERA5 job -----------------------------------

def test_create_spot_inherits_defaults_and_triggers_era5(admin, region_id, db):
    spot = _create_spot(admin, region_id)
    assert spot["status"] == "draft"
    assert spot["model_pref"] == "icon_d2"        # inherited from region defaults
    assert spot["era5_cell"] is not None          # grid cell resolved

    status = admin.get(f"/admin/spots/{spot['id']}/era5").json()
    assert status["status"] == "queued"           # ERA5 job submitted
    job = db.scalar(select(Era5Job).where(Era5Job.spot_id == spot["id"]))
    assert job is not None


# --- readiness + go-live ---------------------------------------------------

def test_set_live_blocked_until_ready_then_succeeds(admin, region_id, db):
    spot = _create_spot(admin, region_id)
    sid = spot["id"]

    # initially incomplete -> 409 with a clear gap list
    resp = admin.post(f"/admin/spots/{sid}/live")
    assert resp.status_code == 409
    gaps = resp.json()["detail"]["gaps"]
    assert {"editorial.description", "climatology", "image"} <= set(gaps)

    # curate editorial (description) + the wind directions
    admin.patch(f"/admin/spots/{sid}", json={"editorial": {
        "description": "A breezy Baltic flatwater spot.",
        "usable_wind_directions": {"min": 180, "max": 260},
    }})
    # image with full rights
    admin.post(f"/admin/spots/{sid}/image", json={
        "url": "https://img/x.jpg", "source": "unsplash",
        "license": "Unsplash License", "credit": "Jo",
    })
    # climatology arrives from the pipeline (set directly here)
    spot_row = db.get(Spot, sid)
    spot_row.climatology = {"window": "2006-2025", "weeks": [{"week": 1}]}
    db.commit()

    ready = admin.get(f"/admin/spots/{sid}/readiness").json()
    assert ready["ready"] is True

    live = admin.post(f"/admin/spots/{sid}/live")
    assert live.status_code == 200
    assert live.json()["status"] == "published"


def test_na_counts_as_fulfilled(admin, region_id, db):
    # a spot whose description is explicitly n/a still satisfies that rule
    spot = _create_spot(admin, region_id)
    sid = spot["id"]
    admin.patch(f"/admin/spots/{sid}", json={"editorial": {
        "description": "n/a", "usable_wind_directions": "n/a",
    }})
    ready = admin.get(f"/admin/spots/{sid}/readiness").json()
    gaps = set(ready["gaps"])
    assert "editorial.description" not in gaps
    assert "editorial.usable_wind_directions" not in gaps


# --- override / provenance / audit / revert --------------------------------

def test_override_writes_provenance_and_audit_then_revert(admin, region_id, db):
    spot = _create_spot(admin, region_id)
    sid = spot["id"]

    resp = admin.post(f"/admin/spots/{sid}/override",
                      json={"field": "confidence", "value": 0.95})
    assert resp.status_code == 200
    view = resp.json()
    assert view["fields"]["confidence"] == 0.95
    assert view["provenance"]["confidence"] == "überschrieben"

    audit = db.scalar(
        select(SpotAudit).where(SpotAudit.spot_id == sid)
        .where(SpotAudit.action == "override")
    )
    assert audit is not None and audit.changes["field"] == "confidence"

    # revert restores the auto provenance
    reverted = admin.post(f"/admin/spots/{sid}/revert", json={"field": "confidence"})
    assert reverted.status_code == 200
    assert reverted.json()["provenance"]["confidence"] == "auto"


def test_recompute_climatology_leaves_override(admin, region_id, db, tmp_path):
    from app.era5 import cds, pipeline, rawfile

    spot = _create_spot(admin, region_id)
    sid = spot["id"]

    # stand up a raw extract + job, build the climatology (Sprint 2 path)
    client = FakeCdsClient(make_synthetic_series())
    job = cds.poll_cds_job(
        db.scalar(select(Era5Job).where(Era5Job.spot_id == sid)).params["cds_request_id"],
        db=db, client=client, raw_dir=str(tmp_path),
    )
    pipeline.build_climatology_record(sid, db=db)

    # editor pins confidence
    admin.post(f"/admin/spots/{sid}/override", json={"field": "confidence", "value": 0.9})
    # re-derive from the raw file
    pipeline.recompute_climatology(sid, db=db)

    db.expire_all()
    spot_row = db.get(Spot, sid)
    assert spot_row.overrides == {"confidence": 0.9}   # override untouched
    assert spot_row.climatology["weeks"]               # climatology refreshed


# --- region stock image ----------------------------------------------------

def test_region_stock_image(admin, region_id):
    resp = admin.post(f"/admin/regions/{region_id}/stock-image")
    assert resp.status_code == 200
    img = resp.json()["image"]
    assert img["license"] and img["credit"]
