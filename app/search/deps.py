"""FastAPI dependency providers for search (geocoder + scorer), overridable in tests."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.scoring import Scorer, default_scorer
from app.search.geocode import Geocoder, HttpOpenMeteoGeocoder

_geocoder: Geocoder | None = None


def get_geocoder() -> Geocoder:
    global _geocoder
    if _geocoder is None:
        _geocoder = HttpOpenMeteoGeocoder()
    return _geocoder


def get_scorer(db: Session = Depends(get_db)) -> Scorer:
    """Request-scoped scorer bound to the db so DB-deployed scoring_params win."""
    return default_scorer(db)
