"""Small compass helpers shared by the gates (direction windows, onshore test)."""

from __future__ import annotations


def angular_diff(a: float, b: float) -> float:
    """Smallest absolute difference between two bearings (degrees), in [0, 180]."""
    d = abs((a - b) % 360.0)
    return min(d, 360.0 - d)


def _in_window(deg: float, window: dict) -> bool:
    lo, hi = window["min"] % 360.0, window["max"] % 360.0
    deg = deg % 360.0
    if lo <= hi:
        return lo <= deg <= hi
    return deg >= lo or deg <= hi  # wraps through 0/360


def direction_in_windows(deg: float | None, windows) -> bool:
    """True if ``deg`` falls in any usable window. ``None`` windows => all usable."""
    if windows is None:
        return True
    if deg is None:
        return True  # unknown direction can't fail a direction gate
    if isinstance(windows, dict):
        windows = [windows]
    return any(_in_window(deg, w) for w in windows)


def is_strong_onshore(
    wind_kt: float | None,
    wind_dir: float | None,
    facing: float | None,
    onshore_max_kt: float,
) -> bool:
    """Strong onshore = wind above the threshold blowing from the sea onto the beach.

    ``facing`` is the bearing the beach faces (toward the water); wind direction is
    the meteorological *from* bearing, so onshore means the wind comes from within
    90 deg of ``facing``.
    """
    if facing is None or wind_kt is None or wind_dir is None:
        return False
    if wind_kt <= onshore_max_kt:
        return False
    return angular_diff(wind_dir, facing) <= 90.0
