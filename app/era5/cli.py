"""Command-line entry points for the ERA5 climatology pipeline.

Examples
--------
    # 1. submit a 20-year extract for a spot (real CDS; needs ~/.cdsapirc)
    python -m app.era5.cli request tarifa-los-lances

    # 2. poll until the raw file lands, then derive the climatology
    python -m app.era5.cli poll <cds_request_id>
    python -m app.era5.cli build tarifa-los-lances

    # 3. re-derive from the stored raw file later, without touching CDS
    python -m app.era5.cli recompute tarifa-los-lances

This is the only way to run the pipeline in Sprint 2 — there is no automatic
trigger when a spot is created (that arrives with admin in a later sprint).
"""

from __future__ import annotations

import argparse
import json
import uuid

from sqlalchemy import select

from app.db.session import SessionLocal
from app.era5 import cds, pipeline
from app.era5.grid import resolve_grid_cell
from app.models import Spot


def _resolve_spot(db, ref: str) -> Spot:
    try:
        spot = db.get(Spot, uuid.UUID(ref))
        if spot is not None:
            return spot
    except (ValueError, AttributeError):
        pass
    spot = db.scalar(select(Spot).where(Spot.slug == ref))
    if spot is None:
        raise SystemExit(f"no spot matching {ref!r} (id or slug)")
    return spot


def _cmd_request(args) -> None:
    db = SessionLocal()
    try:
        spot = _resolve_spot(db, args.spot)
        from geoalchemy2.shape import to_shape

        point = to_shape(spot.location)
        cell = spot.era5_cell or resolve_grid_cell(point.y, point.x)
        job = cds.request_era5_extract(
            spot.id, cell, db=db, client=cds.real_cds_client(), years=args.years
        )
        print(
            f"job {job.id} status={job.status} "
            f"cds_request_id={job.params.get('cds_request_id')}"
        )
    finally:
        db.close()


def _cmd_poll(args) -> None:
    db = SessionLocal()
    try:
        job = cds.poll_cds_job(
            args.cds_request_id, db=db, client=cds.real_cds_client()
        )
        print(f"job {job.id} status={job.status} raw_path={job.raw_path}")
    finally:
        db.close()


def _cmd_build(args) -> None:
    db = SessionLocal()
    try:
        spot = _resolve_spot(db, args.spot)
        record = pipeline.build_climatology_record(spot.id, db=db)
        print(
            f"climatology built for {spot.slug}: "
            f"{len(record['weeks'])} weeks, window={record['window']}"
        )
    finally:
        db.close()


def _cmd_recompute(args) -> None:
    db = SessionLocal()
    try:
        spot = _resolve_spot(db, args.spot)
        record = pipeline.recompute_climatology(spot.id, db=db)
        print(
            f"recomputed {spot.slug}: changed={record['recompute']['changed']}, "
            f"window={record['window']}"
        )
        if args.dump:
            print(json.dumps(record["weeks"][0], indent=2))
    finally:
        db.close()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="app.era5.cli", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("request", help="submit a CDS extract for a spot")
    p.add_argument("spot", help="spot id or slug")
    p.add_argument("--years", type=int, default=20)
    p.set_defaults(func=_cmd_request)

    p = sub.add_parser("poll", help="poll a CDS request and store the raw file")
    p.add_argument("cds_request_id")
    p.set_defaults(func=_cmd_poll)

    p = sub.add_parser("build", help="derive climatology from the raw file")
    p.add_argument("spot", help="spot id or slug")
    p.set_defaults(func=_cmd_build)

    p = sub.add_parser("recompute", help="re-derive from the raw file (no CDS)")
    p.add_argument("spot", help="spot id or slug")
    p.add_argument("--dump", action="store_true", help="print week 1 as JSON")
    p.set_defaults(func=_cmd_recompute)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
