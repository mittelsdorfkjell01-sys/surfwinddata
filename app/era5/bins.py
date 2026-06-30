"""Histogram bin definitions and shared constants.

The prompt references a "Score-Parameter-Doc" for the exact bins, which is not
present in the repo. The edges below are a documented, reasonable interpretation
tuned to the watersports the platform tracks (kite/wind/wing/surf); they can be
refined once the parameter doc lands, without changing the pipeline shape.

All histograms are ``[16][6]`` — 16 compass sectors x 6 magnitude bins.
"""

from __future__ import annotations

# Conversion: 1 m/s = 1.9438444924406046 knots.
MS_TO_KNOTS: float = 1.9438444924406046

# 16 compass sectors of 22.5 deg each, sector 0 centred on North (0 deg).
N_SECTORS: int = 16
SECTOR_WIDTH_DEG: float = 360.0 / N_SECTORS  # 22.5
SECTOR_LABELS: tuple[str, ...] = (
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
)

# Wind speed bins in knots. Lower edges of 6 bins; the last is open-ended.
#   0-6   too light       6-10  marginal      10-14 good (intermediate)
#   14-18 strong          18-25 powered       25+   overpowered / experts
WIND_SPEED_BINS_KT: tuple[float, ...] = (0.0, 6.0, 10.0, 14.0, 18.0, 25.0)

# Significant wave height bins in metres. Lower edges of 6 bins; last open-ended.
SWELL_HEIGHT_BINS_M: tuple[float, ...] = (0.0, 0.5, 1.0, 1.5, 2.0, 3.0)

N_MAG_BINS: int = 6

# Mean wave period at/above which swell counts as "long period" groundswell (s).
LONGPERIOD_THRESHOLD_S: float = 10.0

# ERA5 variables pulled for the climatology (short names used internally).
VARS: tuple[str, ...] = ("u10", "v10", "t2m", "sst", "swh", "mwp", "mwd")

# Mapping short name -> CDS ERA5 single-levels variable long name.
CDS_VARIABLE_NAMES: dict[str, str] = {
    "u10": "10m_u_component_of_wind",
    "v10": "10m_v_component_of_wind",
    "t2m": "2m_temperature",
    "sst": "sea_surface_temperature",
    "swh": "significant_height_of_combined_wind_waves_and_swell",
    "mwp": "mean_wave_period",
    "mwd": "mean_wave_direction",
}

# Number of ISO-ish weeks the climatology is bucketed into.
N_WEEKS: int = 52
