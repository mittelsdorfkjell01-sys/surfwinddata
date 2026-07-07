"""Rolling week-smoothing for the 52-week climatology.

A raw per-week climatology carries week-to-week sampling noise that reads as
false signal. We smooth each week with a centred rolling window over the week
axis, **wrapping around** week 52 -> 1 (the year is cyclic). The smoothed weeks
are what the score curve and the display use; the raw weeks are kept alongside.

The joint histograms become floats (weighted hour counts averaged over the
window) — the scoring engine consumes them as ``usable/total`` ratios, so
fractional counts are fine.
"""

from __future__ import annotations

import numpy as np

from app.era5.bins import N_WEEKS

# Scalar week fields smoothed as a plain mean of the present (non-None) values.
_WIND_SCALARS = ("p10_kt", "p50_kt", "p90_kt")
_SWELL_SCALARS = ("hs_p50_m", "period_p50_s", "longperiod_frac")


def _mean_scalars(values: list) -> float | None:
    present = [v for v in values if v is not None]
    if not present:
        return None
    return round(float(np.mean(present)), 3)


def _mean_joint(joints: list) -> list[list[float]]:
    stack = np.array(joints, dtype="float64")  # (window, 16, 6)
    return np.round(stack.mean(axis=0), 4).tolist()


def smooth_weeks(weeks: list[dict], window: int = 3) -> list[dict]:
    """Return smoothed copies of ``weeks`` (length 52), wrap-around window.

    Directions (``dir_dominant*``) are categorical/circular and left at the
    centre week's value; everything numeric is averaged over the window.
    """
    if window <= 1 or len(weeks) != N_WEEKS:
        return [dict(w) for w in weeks]

    radius = window // 2
    out: list[dict] = []
    for i in range(N_WEEKS):
        idx = [(i + d) % N_WEEKS for d in range(-radius, radius + 1)]
        win = [weeks[j] for j in idx]
        centre = weeks[i]

        wind = dict(centre["wind"])
        for k in _WIND_SCALARS:
            wind[k] = _mean_scalars([w["wind"].get(k) for w in win])
        wind["joint"] = _mean_joint([w["wind"]["joint"] for w in win])

        swell = dict(centre["swell"])
        for k in _SWELL_SCALARS:
            swell[k] = _mean_scalars([w["swell"].get(k) for w in win])
        swell["joint"] = _mean_joint([w["swell"]["joint"] for w in win])

        out.append(
            {
                "week": centre["week"],
                "daylight_hours": round(
                    float(np.mean([w["daylight_hours"] for w in win])), 2
                ),
                "wind": wind,
                "swell": swell,
                "air_p50_c": _mean_scalars([w.get("air_p50_c") for w in win]),
                "sst_p50_c": _mean_scalars([w.get("sst_p50_c") for w in win]),
            }
        )
    return out
