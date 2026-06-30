"""ERA5 job triggering / status for the admin path."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session


def trigger_era5_job(spot_id, *, db: Session, client):
    """Resolve the grid cell (if needed) and submit an ERA5 extract. Idempotent."""
    from app.era5.cds import request_era5_extract
    from app.era5.grid import resolve_grid_cell
    from app.models import Spot

    spot = db.get(Spot, spot_id)
    if spot is None:
        raise LookupError(f"unknown spot {spot_id}")

    cell = spot.era5_cell
    if not cell:
        from geoalchemy2.shape import to_shape

        p = to_shape(spot.location)
        cell = resolve_grid_cell(p.y, p.x)
        spot.era5_cell = cell
        db.commit()
    return request_era5_extract(spot.id, cell, db=db, client=client)


def get_job_status(spot_id, *, db: Session) -> dict | None:
    """Latest ERA5 job status for a spot, or ``None`` if none exists."""
    from app.models import Era5Job

    job = db.scalar(
        select(Era5Job)
        .where(Era5Job.spot_id == spot_id)
        .order_by(Era5Job.created_at.desc())
    )
    if job is None:
        return None
    return {
        "job_id": str(job.id),
        "status": job.status,
        "raw_path": job.raw_path,
        "cell": job.cell,
        "window": (job.params or {}).get("window"),
        "error": job.error,
    }
