"""Regional weather-model selection for Open-Meteo.

Open-Meteo can serve several regional models; the high-resolution ones only
cover a bounded domain, so we pick the best regional model for the spot's
coordinates and fall back to ``best_match`` (Open-Meteo's own blend) elsewhere.

Domains are approximate bounding boxes for the published model coverage and are
intentionally simple; a spot's ``model_pref`` (when set) always wins.
"""

from __future__ import annotations

# Open-Meteo `models` identifiers.
AROME = "meteofrance_arome_france_hd"  # Meteo-France AROME, France + coasts, ~1.3 km
ICON_D2 = "icon_d2"                    # DWD ICON-D2, central Europe, ~2 km
ICON_EU = "icon_eu"                    # DWD ICON-EU, Europe nest, ~7 km
BEST_MATCH = "best_match"             # Open-Meteo global blend


def _in_box(lat: float, lon: float, s: float, n: float, w: float, e: float) -> bool:
    return s <= lat <= n and w <= lon <= e


def select_model(lat: float, lon: float, pref: str | None = None) -> str:
    """Choose the preferred regional model for a coordinate.

    If ``pref`` is given (e.g. ``spots.model_pref``) it is returned unchanged.
    Otherwise the most specific covering regional model wins, falling back to
    ``best_match``.
    """
    if pref:
        return pref

    # Meteo-France AROME — France and its immediate coastlines (checked first as
    # the highest-resolution option).
    if _in_box(lat, lon, 41.0, 51.5, -5.5, 9.5):
        return AROME

    # DWD ICON-D2 — central Europe (DE/AT/CH/BeNeLux/Alps).
    if _in_box(lat, lon, 43.2, 58.1, -3.9, 20.3):
        return ICON_D2

    # DWD ICON-EU — wider Europe nest.
    if _in_box(lat, lon, 29.5, 70.5, -23.5, 62.5):
        return ICON_EU

    return BEST_MATCH
