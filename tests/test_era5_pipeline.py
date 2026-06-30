"""End-to-end pipeline tests against the test database, with a mocked CDS client.

Skipped automatically when the test database is unreachable (see conftest).
Covers the job lifecycle (queued -> extracting -> derived), idempotency, the
52-week climatology, recompute-without-CDS, and overrides preservation.
"""

from __future__ import annotations

import pytest
from geoalchemy2.shape import to_shape
from sqlalchemy import select

from app.era5 import cds, pipeline
from app.era5.bins import N_WEEKS
from app.models import Era5Job, Spot
from app.seed.seed import seed
from app.services.overrides import apply_overrides
from tests.era5_helpers import FakeCdsClient, make_synthetic_series


@pytest.fixture
def spot(db):
    seed(db)
    s = db.scalar(select(Spot).where(Spot.slug == "tarifa-los-lances"))
    assert s is not None
    return s


@pytest.fixture
def fake_client(spot):
    return FakeCdsClient(make_synthetic_series())


def _run_to_extracting(db, spot, client, raw_dir):
    lat = round(to_shape(spot.location).y, 2)
    cell = {"wind": [lat, -5.5], "wave": [lat, -5.5]}
    job = cds.request_era5_extract(spot.id, cell, db=db, client=client)
    assert job.status == "queued"
    assert job.params["cds_request_id"] == "fake-1"
    rid = job.params["cds_request_id"]
    job = cds.poll_cds_job(rid, db=db, client=client, raw_dir=raw_dir)
    assert job.status == "extracting"
    assert job.raw_path
    return job


def test_request_is_idempotent_per_spot(db, spot, fake_client):
    cell = {"wind": [36.0, -5.5], "wave": [36.0, -5.5]}
    job1 = cds.request_era5_extract(spot.id, cell, db=db, client=fake_client)
    job2 = cds.request_era5_extract(spot.id, cell, db=db, client=fake_client)
    assert job1.id == job2.id
    # only one submission actually hit the (fake) CDS
    assert len(fake_client.submitted) == 1


def test_full_pipeline_builds_52_week_climatology(db, spot, fake_client, tmp_path):
    _run_to_extracting(db, spot, fake_client, str(tmp_path))

    record = pipeline.build_climatology_record(spot.id, db=db)
    assert len(record["weeks"]) == N_WEEKS
    assert record["window"]  # carried from the job params

    job = db.scalar(
        select(Era5Job).where(Era5Job.spot_id == spot.id)
    )
    assert job.status == "derived"
    assert job.completed_at is not None

    db.refresh(spot)
    assert spot.climatology is not None
    assert len(spot.climatology["weeks"]) == N_WEEKS


def test_recompute_without_cds_matches_and_preserves_overrides(
    db, spot, fake_client, tmp_path
):
    _run_to_extracting(db, spot, fake_client, str(tmp_path))
    built = pipeline.build_climatology_record(spot.id, db=db)

    # editor pins a manual override on an unrelated field
    spot.overrides = {"level": "expert"}
    db.commit()

    # recompute must not call CDS; deterministic => no drift
    recomputed = pipeline.recompute_climatology(spot.id, db=db)
    assert recomputed["recompute"]["changed"] is False
    assert recomputed["weeks"] == built["weeks"]
    assert len(fake_client.submitted) <= 1  # no new submission during recompute

    db.refresh(spot)
    # overrides column untouched and still applied on read
    assert spot.overrides == {"level": "expert"}
    effective = apply_overrides(spot)
    assert effective["level"] == "expert"
    assert "level" in effective["_overridden"]
