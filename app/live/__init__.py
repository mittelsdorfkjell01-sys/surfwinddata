"""Live + forecast runtime path (Sprint 3).

Current conditions and a 7-day forecast for a spot, sourced from Open-Meteo and
cached in Redis. This path is **strictly separate** from the ERA5 climatology
(``app.era5``): nothing here is merged with climatology and nothing beyond the
7-day horizon is ever returned. Live data is never persisted to Postgres.

  select_model(lat, lon, pref)   pick the regional model (honours spots.model_pref)
  OpenMeteoClient                fetch_forecast / fetch_marine (injectable seam)
  cache_get / cache_set          Redis, key om:{model}:{lat}:{lon}:{var}, 30-60 min TTL
  get_live_conditions(spot_id)   current{wind,gust,dir,air,sst,swell,period,swell_dir}
  get_forecast_series(spot_id)   7 days, per-day confidence (hoch/mittel/niedrig)
"""
