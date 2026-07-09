"""Verify that the deployed content is visible, searchable and season-backed.

A fast red/green check for the "spots invisible / unsearchable" failure mode.
Runs against the configured ``DATABASE_URL`` via an in-process TestClient (no
running server needed) and checks, in order:

  1. the catalogue is seeded (regions, spots, published spots),
  2. at least one spot has a derived climatology,
  3. ``/spots?status=published`` returns > 0 (landing row has tiles),
  4. ``/spots/{id}/season`` returns a 52-week curve for a climatology spot,
  5. ``/search/best-spots`` ranks at least one spot with intensity > 0,
  6. ``/search?q=...`` returns spots.

Exits 0 when everything passes, 1 otherwise. Use it after ``seed`` + the
climatology batch on a fresh environment::

    python -m scripts.verify_content        # or: python scripts/verify_content.py
"""

from __future__ import annotations

import os
import sys

# Allow ``python scripts/verify_content.py`` (not just ``-m``) by putting the
# project root on the path before importing ``app``.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import func, select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Region, Spot  # noqa: E402

N_WEEKS = 52


def _p(ok: bool, label: str, detail: str = "") -> bool:
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {label}" + (f" - {detail}" if detail else ""))
    return ok


def main() -> int:
    db = SessionLocal()
    client = TestClient(app)
    checks: list[bool] = []
    try:
        n_regions = db.scalar(select(func.count()).select_from(Region))
        n_spots = db.scalar(select(func.count()).select_from(Spot))
        n_pub = db.scalar(
            select(func.count()).select_from(Spot).where(Spot.status == "published")
        )
        n_clim = db.scalar(
            select(func.count()).select_from(Spot).where(Spot.climatology.is_not(None))
        )
        print("Content counts:")
        checks.append(_p(n_regions > 0, "regions seeded", f"{n_regions}"))
        checks.append(_p(n_spots > 0, "spots seeded", f"{n_spots}"))
        checks.append(_p(n_pub > 0, "published spots", f"{n_pub}"))
        checks.append(
            _p(n_clim > 0, "spots with climatology", f"{n_clim}/{n_spots}")
        )

        print("Endpoints:")
        # published listing (landing row)
        r = client.get("/spots", params={"status": "published"})
        checks.append(
            _p(r.status_code == 200 and len(r.json()) > 0,
               "GET /spots?status=published > 0",
               f"http={r.status_code}, n={len(r.json()) if r.is_success else '?'}")
        )

        # pick a spot that has climatology for the season/curve checks
        clim_spot = db.scalar(select(Spot).where(Spot.climatology.is_not(None)))
        if clim_spot is None:
            checks.append(_p(False, "a climatology spot exists to probe", "none"))
        else:
            sport = (clim_spot.sports or [None])[0]
            r = client.get(
                f"/spots/{clim_spot.id}/season", params={"sport": sport}
            )
            weeks = r.json().get("weeks", []) if r.is_success else []
            checks.append(
                _p(r.status_code == 200 and len(weeks) == N_WEEKS,
                   f"GET /spots/{clim_spot.slug}/season = {N_WEEKS} weeks",
                   f"http={r.status_code}, weeks={len(weeks)}")
            )

            r = client.get("/search/best-spots", params={"sport": sport})
            spots = r.json().get("spots", []) if r.is_success else []
            ranked = [s for s in spots if (s.get("intensity") or 0) > 0]
            checks.append(
                _p(r.status_code == 200 and len(ranked) > 0,
                   "GET /search/best-spots ranks >0 spots (intensity>0)",
                   f"http={r.status_code}, ranked={len(ranked)}/{len(spots)}")
            )

        # text search returns spots
        r = client.get("/search", params={"q": "Tarifa"})
        found = r.json().get("spots", []) if r.is_success else []
        checks.append(
            _p(r.status_code == 200 and len(found) > 0,
               "GET /search?q=Tarifa returns spots",
               f"http={r.status_code}, n={len(found)}")
        )
    finally:
        db.close()

    ok = all(checks)
    print("\nRESULT:", "GREEN - content is visible & searchable" if ok
          else "RED - see failures above")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
