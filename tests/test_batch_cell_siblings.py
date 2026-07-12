"""Regression: spots that share an ERA5 grid cell must each get their own extract.

The Open-Meteo seam derives ``cds_request_id`` from the *cell* (``omh|lat|lon|y0|y1``),
so every spot in the same 0.25 deg cell carries the SAME id. Before the fix,
``poll_cds_job`` resolved that id **globally** and could return a cell-sibling's
already-derived job, leaving the current spot with no raw extract of its own —
``build_climatology_record`` then raising ``LookupError: no ERA5 raw extract for
spot``. The fix scopes the lookup to the spot being polled.

Uses a cell-based fake client (the shared ``FakeCdsClient`` hands out unique ids,
which would hide the bug). No network. Skips when the test DB is unreachable.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone

import pytest
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import delete, select

from app.era5 import batch
from app.era5.bins import N_WEEKS
from app.models import Era5Job, Region, Spot
from app.seed.seed import seed
from tests.era5_helpers import FakeCdsClient, make_synthetic_series

# Both spots resolve to this one cell, so their request ids collide.
CELL = {"wind": [36.0, -5.5], "wave": [36.0, -5.5]}
RID = "cell|36.0|-5.5"
SLUGS = ["cell-sibling-a", "cell-sibling-b"]


class CellFakeClient(FakeCdsClient):
    """Fake whose request id is derived from the request *area* (like Open-Meteo),
    so two spots sharing a grid cell submit the identical id — reproducing the
    collision the global lookup used to mishandle."""

    def submit(self, dataset: str, request: dict) -> str:
        self.submitted.append((dataset, request))
        area = request["area"]  # [N, W, S, E] == [lat, lon, lat, lon]
        return f"cell|{float(area[0])}|{float(area[1])}"


def _args(**over) -> argparse.Namespace:
    base = dict(
        status="all", region=None, slug=list(SLUGS), force=False, dry_run=False,
        sleep=0.0, years=20, retries=3, timeout=60.0, cds=False,
    )
    base.update(over)
    return argparse.Namespace(**base)


def _delete_by_slug(db, slugs) -> None:
    ids = list(db.scalars(select(Spot.id).where(Spot.slug.in_(slugs))))
    if ids:
        db.execute(delete(Era5Job).where(Era5Job.spot_id.in_(ids)))
        db.execute(delete(Spot).where(Spot.id.in_(ids)))
        db.commit()


@pytest.fixture
def cell_siblings(db):
    region = db.scalar(select(Region))
    if region is None:
        seed(db)
        region = db.scalar(select(Region))
    assert region is not None

    # Defensive: clear leftovers from a crashed prior run (shared session DB).
    _delete_by_slug(db, SLUGS)

    spots = []
    for i, slug in enumerate(SLUGS):
        s = Spot(
            slug=slug,
            name=f"Cell Sibling {i}",
            region_id=region.id,
            # Slightly different coordinates, but the same era5_cell => the
            # pipeline requests the same cell centre (and thus id) for both.
            location=from_shape(Point(-5.5 + i * 0.01, 36.0 + i * 0.01), srid=4326),
            era5_cell=CELL,
            sports=["kitesurf"],
            status="published",
        )
        db.add(s)
        spots.append(s)
    db.commit()
    for s in spots:
        db.refresh(s)

    yield spots

    _delete_by_slug(db, SLUGS)


def test_poll_resolves_current_spot_not_a_derived_cell_sibling(
    db, cell_siblings, tmp_path
):
    """The exact production failure: spot A has an older still-queued job while a
    cell-sibling B already has a *newer* derived extract. A global (latest-first)
    lookup returns B's job, so A used to fail with 'no ERA5 raw extract'."""
    a, b = cell_siblings
    now = datetime.now(timezone.utc)
    a_job = Era5Job(
        spot_id=a.id, cell=CELL,
        params={"cds_request_id": RID, "window": "2006-2025"},
        status="queued", created_at=now - timedelta(hours=2),
    )
    b_job = Era5Job(
        spot_id=b.id, cell=CELL,
        params={"cds_request_id": RID, "window": "2006-2025"},
        status="derived", raw_path="already-derived-sibling.parquet",
        created_at=now,
    )
    db.add_all([a_job, b_job])
    db.commit()

    report = batch.run_batch(
        _args(slug=[SLUGS[0]]),
        db=db,
        client=CellFakeClient(make_synthetic_series()),
        raw_dir=str(tmp_path),
    )

    assert report.ok == [SLUGS[0]], report.summary()
    assert not report.fail, report.summary()
    db.refresh(a)
    assert a.climatology is not None
    assert len(a.climatology["weeks"]) == N_WEEKS


def test_batch_computes_both_cell_siblings(db, cell_siblings, tmp_path):
    """End-to-end: running the batch over two fresh same-cell spots gives each its
    own 52-week climatology (no collision, no re-fetch is asserted here)."""
    report = batch.run_batch(
        _args(),
        db=db,
        client=CellFakeClient(make_synthetic_series()),
        raw_dir=str(tmp_path),
    )

    assert sorted(report.ok) == sorted(SLUGS), report.summary()
    assert not report.fail, report.summary()
    for s in cell_siblings:
        db.refresh(s)
        assert s.climatology is not None
        assert len(s.climatology["weeks"]) == N_WEEKS

    # Sanity: the two jobs really shared one cell-based request id.
    rids = {
        j.params["cds_request_id"]
        for j in db.scalars(
            select(Era5Job).where(Era5Job.spot_id.in_([s.id for s in cell_siblings]))
        )
    }
    assert rids == {RID}, rids
