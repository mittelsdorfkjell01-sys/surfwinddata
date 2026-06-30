import pytest
from sqlalchemy import func, select

from app.models import Region, Spot
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


def test_regions_seeded(db):
    slugs = set(db.scalars(select(Region.slug)).all())
    assert {"tarifa", "sardinia"}.issubset(slugs)


def test_spots_seeded(db):
    count = db.scalar(select(func.count()).select_from(Spot))
    assert count >= 6


def test_seed_is_idempotent(db):
    before = db.scalar(select(func.count()).select_from(Spot))
    created = seed(db)
    after = db.scalar(select(func.count()).select_from(Spot))
    assert created == {
        "regions": 0, "spots": 0, "scoring_params": 0, "required_fields": 0
    }
    assert before == after


def test_spot_linked_to_region(db):
    spot = db.scalar(select(Spot).where(Spot.slug == "tarifa-los-lances"))
    assert spot is not None
    assert spot.region.slug == "tarifa"
