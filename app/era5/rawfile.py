"""Read/write the downloaded ERA5 extract as a flat hourly Parquet table.

The CDS delivers NetCDF/GRIB; ``poll_cds_job`` normalises that into a single
hourly table (one row per timestamp, one column per variable) and stores it as
Parquet. Parquet is chosen over NetCDF for the on-disk raw format because it is
a single light dependency (pyarrow), cross-platform, and trivially round-trips
the arrays that ``recompute_climatology`` needs — no CDS call required to
re-derive.
"""

from __future__ import annotations

import os

import numpy as np

from app.era5 import seriesutil
from app.era5.bins import VARS

# NOTE: pyarrow is imported lazily inside the two functions below, not at module
# top. Parquet raw extracts are only ever read/written by the OFFLINE climatology
# batch — never on the request path. Keeping the (large ~130 MB) pyarrow import
# lazy lets the request-serving app import this module (and the whole app.era5
# chain) without pulling pyarrow, so it can be excluded from a size-limited
# serverless bundle (e.g. Vercel's 250 MB function limit).


def write_raw(path: str, series: dict) -> str:
    """Persist an hourly ``series`` to ``path`` as Parquet. Returns ``path``."""
    import pyarrow as pa
    import pyarrow.parquet as pq

    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    times = seriesutil.as_datetime64(series["time"])
    columns = {"time": pa.array(times.astype("datetime64[s]"))}
    for var in VARS:
        if var in series and series[var] is not None:
            columns[var] = pa.array(np.asarray(series[var], dtype="float64"))
        else:
            columns[var] = pa.array(np.full(len(times), np.nan, dtype="float64"))
    pq.write_table(pa.table(columns), path)
    return path


def read_raw(path: str) -> dict:
    """Load an hourly series previously written by :func:`write_raw`."""
    import pyarrow.parquet as pq

    table = pq.read_table(path)
    data = table.to_pydict()
    series: dict = {"time": np.array(data["time"], dtype="datetime64[s]")}
    for var in VARS:
        if var in data:
            series[var] = np.asarray(data[var], dtype="float64")
    return series
