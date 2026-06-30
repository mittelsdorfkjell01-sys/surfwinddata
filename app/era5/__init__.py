"""ERA5 climatology pipeline (Sprint 2).

An *offline batch* that turns a 20-year ERA5 hourly reanalysis into a
pre-computed, per-week seasonal climatology for a spot. Nothing here runs at
request time — see ``app.era5.cli`` for the entry points.

Pipeline stages (each a small, independently testable function):

  resolve_grid_cell        coordinates           -> nearest ERA5 cell(s)
  request_era5_extract     cell + variables      -> CDS request, Era5Job 'queued'
  poll_cds_job             cds_request_id        -> raw Parquet on disk, 'extracting'
  compute_wind_components  (u, v)                -> speed (kt) + 16-sector direction
  filter_daylight          series, lat, lon      -> daylight-only hours
  aggregate_weekly_histogram  series             -> wind/swell joint[16][6] per week
  derive_display_stats     series                -> percentiles & dominant directions
  build_climatology_record spot                  -> spots.climatology, Era5Job 'derived'
  recompute_climatology    spot                  -> re-derive from raw file, no CDS
"""
