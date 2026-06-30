"""Live Copernicus CDS adapter. Not exercised by the test-suite.

Uses the classic blocking ``cdsapi.Client.retrieve`` to download the NetCDF
extract, then parses it with ``xarray`` into the normalised hourly series the
pipeline expects. ``submit`` performs the (potentially long) download so that a
later ``poll`` simply reports completion -- a pragmatic mapping of the blocking
client onto the queue/poll seam.

The seam is intentionally **stateless**: the ``request_id`` *is* the path to the
downloaded NetCDF file. ``poll`` and ``fetch_series`` derive everything from that
path, so a fresh client instance in a later request (the FastAPI dependency
builds a new ``RealCdsClient`` per call) can still complete a job that an earlier
instance submitted. A failed download leaves no file behind, so its absence is
how ``poll`` reports failure.
"""

from __future__ import annotations

import os
import tempfile

import numpy as np

from app.era5.bins import CDS_VARIABLE_NAMES, VARS


class RealCdsClient:
    def __init__(self) -> None:
        import cdsapi  # noqa: F401 — fail fast if the dependency is missing

        self._client = cdsapi.Client()

    def submit(self, dataset: str, request: dict) -> str:
        # The target path doubles as the request id so the queue/poll seam needs
        # no in-process state. mkstemp creates an empty placeholder; a successful
        # retrieve overwrites it, a failed one removes it so poll() sees no file.
        fd, target = tempfile.mkstemp(suffix=".nc")
        os.close(fd)
        try:
            self._client.retrieve(dataset, request, target)
        except Exception:  # pragma: no cover — generic failure surfaced via poll
            if os.path.exists(target):
                os.remove(target)
        return target

    def poll(self, request_id: str) -> str:
        return "completed" if os.path.exists(request_id) else "failed"

    def fetch_series(self, request_id: str) -> dict:
        try:
            import xarray as xr
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "Parsing the CDS NetCDF requires 'xarray' (and 'netCDF4'). "
                "Install them, or inject a client that returns a ready series."
            ) from exc

        path = request_id
        ds = xr.open_dataset(path)
        # ERA5 single-levels short names map directly; squeeze the single cell.
        time = ds["valid_time"].values if "valid_time" in ds else ds["time"].values
        series: dict = {"time": np.asarray(time, dtype="datetime64[s]")}
        short_by_long = {v: k for k, v in CDS_VARIABLE_NAMES.items()}
        for name in ds.data_vars:
            short = short_by_long.get(name, name)
            if short in VARS:
                series[short] = np.asarray(ds[name].values, dtype=float).reshape(-1)
        ds.close()
        return series
