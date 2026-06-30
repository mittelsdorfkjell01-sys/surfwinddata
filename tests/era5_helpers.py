"""Shared fixtures for the ERA5 pipeline tests: a synthetic hourly series and a
fake CDS client (so no test ever touches the network)."""

from __future__ import annotations

import numpy as np

from app.era5.bins import VARS


def make_synthetic_series(year: int = 2021) -> dict:
    """A deterministic, full-year (non-leap) hourly ERA5-like series.

    Builds plausible diurnal + seasonal signals so the daylight filter,
    histograms and percentiles all have structure to bite on. Temperatures are
    in Kelvin (ERA5 convention); wind components in m/s.
    """
    times = np.arange(
        f"{year}-01-01", f"{year + 1}-01-01", dtype="datetime64[h]"
    ).astype("datetime64[s]")

    day = times.astype("datetime64[D]")
    hour = ((times - day) / np.timedelta64(1, "h")).astype(float)
    doy = (day - times.astype("datetime64[Y]").astype("datetime64[D]")).astype(
        float
    ) + 1

    two_pi = 2.0 * np.pi
    # Wind: stronger in the afternoon and in summer; slowly rotating direction.
    speed = np.clip(
        6.0
        + 3.0 * np.sin(two_pi * (hour - 15) / 24.0)
        + 2.0 * np.sin(two_pi * (doy - 200) / 365.0),
        0.2,
        None,
    )
    angle = 0.4 * np.sin(two_pi * doy / 365.0)  # radians around due-east
    u10 = speed * np.cos(angle)
    v10 = speed * np.sin(angle)

    t2m = (
        288.0
        + 8.0 * np.sin(two_pi * (doy - 80) / 365.0)
        + 4.0 * np.sin(two_pi * (hour - 15) / 24.0)
    )
    sst = 290.0 + 5.0 * np.sin(two_pi * (doy - 100) / 365.0)

    swh = np.clip(
        1.0
        + 0.8 * np.sin(two_pi * (doy - 300) / 365.0)
        + 0.3 * np.sin(two_pi * hour / 24.0),
        0.05,
        None,
    )
    mwp = np.clip(8.0 + 3.0 * np.sin(two_pi * (doy - 300) / 365.0), 2.0, None)
    mwd = (200.0 + 40.0 * np.sin(two_pi * doy / 365.0)) % 360.0

    series = {
        "time": times,
        "u10": u10,
        "v10": v10,
        "t2m": t2m,
        "sst": sst,
        "swh": swh,
        "mwp": mwp,
        "mwd": mwd,
    }
    assert set(VARS).issubset(series)
    return series


class FakeCdsClient:
    """In-memory stand-in for the Copernicus CDS client.

    Records what was submitted and hands back a pre-canned series on
    ``fetch_series`` — no network, no ``cdsapi`` import.
    """

    def __init__(self, series: dict, *, state: str = "completed") -> None:
        self._series = series
        self._state = state
        self.submitted: list[tuple[str, dict]] = []

    def submit(self, dataset: str, request: dict) -> str:
        self.submitted.append((dataset, request))
        return f"fake-{len(self.submitted)}"

    def poll(self, request_id: str) -> str:
        return self._state

    def fetch_series(self, request_id: str) -> dict:
        return self._series
