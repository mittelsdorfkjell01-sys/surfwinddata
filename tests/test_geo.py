import pytest
from geoalchemy2 import Geography
from sqlalchemy import cast, func, select

from app.models import Spot
from app.seed.seed import seed


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


def _spots_within(db, lon: float, lat: float, meters: float) -> set[str]:
    center = cast(func.ST_MakePoint(lon, lat), Geography)
    stmt = select(Spot.slug).where(
        func.ST_DWithin(Spot.location, center, meters)
    )
    return set(db.scalars(stmt).all())


def test_st_dwithin_finds_tarifa_spots(db):
    # ~15 km around Tarifa town centre should catch the three Tarifa spots
    # and none of the Sardinian ones.
    found = _spots_within(db, -5.6035, 36.0128, 15_000)
    assert {
        "tarifa-los-lances",
        "tarifa-valdevaqueros",
        "tarifa-balneario",
    }.issubset(found)
    assert not any(slug.startswith("sardinia-") for slug in found)


def test_st_dwithin_tight_radius(db):
    # 1 km around Balneario should essentially isolate it.
    found = _spots_within(db, -5.6060, 36.0080, 1_000)
    assert "tarifa-balneario" in found
    assert "sardinia-poetto" not in found


def test_distance_ordering(db):
    center = cast(func.ST_MakePoint(-5.6035, 36.0128), Geography)
    stmt = (
        select(Spot.slug, func.ST_Distance(Spot.location, center).label("d"))
        .order_by("d")
        .limit(1)
    )
    nearest_slug, distance = db.execute(stmt).first()
    assert nearest_slug.startswith("tarifa-")
    assert distance < 5_000  # nearest Tarifa spot is well within 5 km
