"""Bulk climatology orchestrator — run the per-spot pipeline over many spots.

The per-spot pipeline (``request → poll → build``) already exists in
``app/era5/cli.py`` / ``cds.py`` / ``pipeline.py`` and is tested; this module only
*orchestrates* it across a selection of spots. Nothing here re-implements the
derivation maths or touches ``spots.overrides`` — it writes ``spots.climatology``
via the existing :func:`build_climatology_record` / :func:`recompute_climatology`.

Design goals (see the Sprint brief):

* **Idempotent** — spots that already carry climatology are skipped unless
  ``--force``; ``--force`` prefers :func:`recompute_climatology` from the cached
  raw Parquet (no network) when a raw file exists.
* **Net-resilient** — a retrying HTTP wrapper (backoff on 429/5xx/timeouts) is
  injected into the Open-Meteo client, plus a configurable pause between spots.
  A single failing spot never aborts the run; its job is marked ``failed`` with
  an error and the batch continues.
* **Honest** — the written record keeps the wave-history markers
  (``wave_source`` / ``wave_window`` / ``wave_note``) the pipeline already sets.
* **Reportable** — one line per spot (``ok`` / ``skip`` / ``fail`` + reason) and a
  final summary; exit code is non-zero when any spot failed (for automation).

Run it with::

    python -m app.era5.batch                     # all spots, Open-Meteo, skip done
    python -m app.era5.batch --status published   # only the live catalogue
    python -m app.era5.batch --region sardinia --dry-run
    python -m app.era5.batch --slug tarifa-los-lances --force

or equivalently ``python -m app.era5.cli batch ...``.
"""

from __future__ import annotations

import argparse
import time
from dataclasses import dataclass, field

from sqlalchemy import select

from app.db.session import SessionLocal
from app.era5 import cds, pipeline
from app.era5.grid import resolve_grid_cell
from app.era5.openmeteo import OpenMeteoHistoryClient
from app.models import Region, Spot

# Transient HTTP status codes worth retrying (rate limit + upstream hiccups).
_RETRY_STATUS = {429, 500, 502, 503, 504}


# --- selection -------------------------------------------------------------

def select_spots(
    db,
    *,
    status: str = "all",
    regions: list[str] | None = None,
    slugs: list[str] | None = None,
) -> list[Spot]:
    """Deterministic (slug-ordered) spot selection with the CLI filters."""
    stmt = select(Spot)
    if status and status != "all":
        stmt = stmt.where(Spot.status == status)
    if regions:
        stmt = stmt.where(
            Spot.region_id.in_(
                select(Region.id).where(Region.slug.in_(list(regions)))
            )
        )
    if slugs:
        stmt = stmt.where(Spot.slug.in_(list(slugs)))
    spots = list(db.scalars(stmt))
    return sorted(spots, key=lambda s: s.slug or "")


def _has_climatology(spot: Spot) -> bool:
    clim = spot.climatology
    return bool(clim) and bool(clim.get("weeks"))


# --- retrying HTTP (injected into the Open-Meteo client) -------------------

def retrying_http(*, retries: int = 3, backoff: float = 2.0, timeout: float = 60.0):
    """Build an ``http(url, params) -> json`` callable with backoff retries.

    Wraps the same ``httpx.get`` the default client uses, but retries transient
    failures (connect/read timeouts, 429, 5xx) with exponential backoff. The
    tested :class:`OpenMeteoHistoryClient` is untouched — resilience lives here.
    """
    import httpx

    def _http(url: str, params: dict) -> dict:
        last_exc: Exception | None = None
        for attempt in range(retries + 1):
            try:
                resp = httpx.get(url, params=params, timeout=timeout)
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code not in _RETRY_STATUS:
                    raise
                last_exc = exc
            except (httpx.TransportError, httpx.TimeoutException) as exc:
                last_exc = exc
            if attempt < retries:
                time.sleep(backoff * (2**attempt))
        assert last_exc is not None
        raise last_exc

    return _http


def _make_client(args):
    """Extraction client: retrying Open-Meteo by default, ``--cds`` opts into CDS."""
    if getattr(args, "cds", False):
        return cds.real_cds_client()
    return OpenMeteoHistoryClient(
        years=args.years,
        http=retrying_http(retries=args.retries, timeout=args.timeout),
    )


# --- per-spot processing ---------------------------------------------------

def process_spot(
    db, spot: Spot, *, client, years: int, force: bool, raw_dir: str | None = None
) -> tuple[str, str]:
    """Compute (or skip) one spot's climatology. Returns ``(outcome, detail)``.

    ``outcome`` is ``"ok"`` | ``"skip"`` | ``"fail"``. Never raises — a failure is
    returned as ``("fail", reason)`` and the job (if any) is left marked failed by
    the pipeline. ``spots.overrides`` is never touched.
    """
    if spot.location is None:
        return "fail", "spot has no location"

    if _has_climatology(spot) and not force:
        return "skip", "already has climatology"

    from geoalchemy2.shape import to_shape

    point = to_shape(spot.location)
    cell = spot.era5_cell or resolve_grid_cell(point.y, point.x)

    # --force from the cached raw Parquet, no network, when a raw file exists.
    if force and pipeline._latest_job_with_raw(db, spot.id) is not None:
        record = pipeline.recompute_climatology(spot.id, db=db)
        return "ok", (
            f"recomputed changed={record['recompute']['changed']} "
            f"window={record['window']}"
        )

    job = cds.request_era5_extract(
        spot.id, cell, db=db, client=client, years=years
    )
    request_id = job.params.get("cds_request_id")
    if not request_id:
        return "fail", f"job {job.id} has no cds_request_id (status={job.status})"

    job = cds.poll_cds_job(
        request_id, db=db, client=client, raw_dir=raw_dir, spot_id=spot.id
    )
    if job.raw_path is None:
        return "fail", f"no raw extract yet (job status={job.status})"

    record = pipeline.build_climatology_record(spot.id, db=db)
    wave = "wave" if record.get("wave_source") else "no-wave"
    return "ok", (
        f"{len(record['weeks'])} weeks window={record['window']} {wave}"
    )


# --- run -------------------------------------------------------------------

@dataclass
class BatchReport:
    ok: list[str] = field(default_factory=list)
    skip: list[tuple[str, str]] = field(default_factory=list)
    fail: list[tuple[str, str]] = field(default_factory=list)

    def summary(self) -> str:
        lines = [
            "",
            f"Batch summary: {len(self.ok)} ok, {len(self.skip)} skip, "
            f"{len(self.fail)} fail.",
        ]
        if self.fail:
            lines.append("Failures:")
            lines += [f"  - {slug}: {reason}" for slug, reason in self.fail]
        return "\n".join(lines)


def run_batch(args, *, db=None, client=None, raw_dir=None) -> BatchReport:
    """Execute the batch for ``args`` and return a :class:`BatchReport`.

    Opens its own DB session when ``db`` is not supplied (the CLI path). A
    ``client`` (and ``raw_dir``) may be injected so tests can drive the batch with
    a fake extraction client — no network. Prints a line per spot; the caller
    decides the exit code from the report.
    """
    own_session = db is None
    db = db or SessionLocal()
    report = BatchReport()
    try:
        spots = select_spots(
            db,
            status=args.status,
            regions=args.region,
            slugs=args.slug,
        )
        print(
            f"Selected {len(spots)} spot(s) "
            f"[status={args.status}"
            + (f", region={args.region}" if args.region else "")
            + (f", slug={args.slug}" if args.slug else "")
            + (", DRY-RUN" if args.dry_run else "")
            + (", FORCE" if args.force else "")
            + "]"
        )

        if args.dry_run:
            for spot in spots:
                if _has_climatology(spot) and not args.force:
                    report.skip.append((spot.slug, "already has climatology"))
                    print(f"[skip] {spot.slug} - already has climatology")
                else:
                    report.ok.append(spot.slug)
                    action = "recompute/refetch" if args.force else "compute"
                    print(f"[plan] {spot.slug} - would {action}")
            print(report.summary())
            return report

        client = client or _make_client(args)
        for i, spot in enumerate(spots):
            try:
                outcome, detail = process_spot(
                    db, spot, client=client, years=args.years,
                    force=args.force, raw_dir=raw_dir,
                )
            except Exception as exc:  # keep the batch alive on any spot failure
                db.rollback()
                outcome, detail = "fail", f"{type(exc).__name__}: {exc}"

            if outcome == "ok":
                report.ok.append(spot.slug)
            elif outcome == "skip":
                report.skip.append((spot.slug, detail))
            else:
                report.fail.append((spot.slug, detail))
            print(f"[{outcome:>4}] {spot.slug} - {detail}", flush=True)

            # Rate-limit-friendly pause between spots that actually fetched.
            if outcome == "ok" and args.sleep > 0 and i < len(spots) - 1:
                time.sleep(args.sleep)

        print(report.summary())
        return report
    finally:
        if own_session:
            db.close()


# --- CLI -------------------------------------------------------------------

def add_batch_arguments(parser: argparse.ArgumentParser) -> None:
    """Register the batch flags (shared with the ``app.era5.cli batch`` subcommand)."""
    parser.add_argument(
        "--status",
        choices=["published", "draft", "all"],
        default="all",
        help="which spots to include (default: all — computes drafts too, "
        "without changing their status)",
    )
    parser.add_argument(
        "--region", action="append", metavar="SLUG",
        help="limit to a region slug (repeatable)",
    )
    parser.add_argument(
        "--slug", action="append", metavar="SLUG",
        help="limit to a specific spot slug (repeatable)",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="recompute even if climatology exists (prefers the cached raw file)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="list what would be computed/skipped; no network, no writes",
    )
    parser.add_argument(
        "--sleep", type=float, default=1.0,
        help="seconds to pause between fetched spots (default: 1.0)",
    )
    parser.add_argument("--years", type=int, default=20)
    parser.add_argument(
        "--retries", type=int, default=3,
        help="HTTP retries per request on transient errors (default: 3)",
    )
    parser.add_argument(
        "--timeout", type=float, default=60.0,
        help="per-request HTTP timeout in seconds (default: 60)",
    )
    parser.add_argument(
        "--cds", action="store_true",
        help="use the optional CDS adapter instead of Open-Meteo",
    )


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="app.era5.batch", description=__doc__.split("\n")[0]
    )
    add_batch_arguments(parser)
    args = parser.parse_args(argv)
    report = run_batch(args)
    raise SystemExit(1 if report.fail else 0)


if __name__ == "__main__":
    main()
