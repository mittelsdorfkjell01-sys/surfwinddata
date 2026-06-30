# Sprint 2 — ERA5-Klimatologie-Pipeline

> Prompt für Claude Code. Befolge die gemeinsamen Konventionen aus „Spezifikation v2". Setzt Sprint 1 (Schema, Modelle, Seed) voraus.

## Kontext
Das Datengerüst steht. Jetzt kommt der riskanteste Teil zuerst: aus ERA5 pro Spot eine vorberechnete Saison-Klimatologie bauen. Das ist ein **Offline-Batch**, keine Laufzeit-API.

## Ziel
Für einen Spot end-to-end: nächste Gitterzelle auflösen, 20-Jahres-Stundenreihe von der Copernicus-CDS-API ziehen, verarbeiten, das Wochen-Histogramm + abgeleitete Werte speichern. Plus Re-Derivation aus Rohdaten ohne erneute CDS-Anfrage.

## Umfang (Funktionen)
- `resolve_grid_cell(lat, lon)` → era5_cell {wind:[lat,lon], wave:[lat,lon]} (0,25° Wind/Temp, 0,5° Welle).
- `request_era5_extract(spot_id, cell, years=20, variables=[u10,v10,t2m,sst,swh,mwp,mwd])` → CDS-Request via `cdsapi`, ERA5Job auf `queued`. Fenster = letzte 20 volle Jahre.
- `poll_cds_job(cds_request_id)` → bei Fertigstellung Rohdatei (NetCDF/Parquet) im Objektspeicher/lokal ablegen, Pfad in `era5_jobs.raw_path`.
- `compute_wind_components(u, v)` → Stärke (kt) + Richtung (16 Sektoren, 0=N).
- `filter_daylight(series, lat, lon)` → nur Tageslichtstunden (Sonnenstand), daylight_hours/Woche.
- `aggregate_weekly_histogram(series)` → `wind_joint[16][6]` und `swell_joint[16][6]` pro Woche (Bins siehe Score-Parameter-Doc).
- `derive_display_stats(...)` → wind p10/p50/p90, dir_dominant, swell hs_p50/period_p50/longperiod_frac/dir_dominant, air_p50, sst_p50.
- `build_climatology_record(spot_id)` → schreibt `spots.climatology` (JSONB, 52 Wochen, window="2006-2025"), ERA5Job auf `derived`.
- `recompute_climatology(spot_id)` → aus gespeicherter Rohdatei neu ableiten, OHNE CDS; `overrides` unberührt lassen, bei Abweichung Hinweis-Flag.

## Daten
Liest: spots (Koordinaten), Rohdatei. Schreibt: era5_jobs, raw_path, spots.climatology.

## Akzeptanzkriterien
- Job ist idempotent und hat nachvollziehbaren Status (queued→extracting→derived→failed).
- Für einen Seed-Spot wird `climatology` mit 52 Wochen erzeugt; Histogramm-Summen plausibel, Tageslicht-Filter wirksam.
- `recompute_climatology` erzeugt aus der Rohdatei dasselbe Ergebnis ohne CDS-Aufruf und überschreibt keine `overrides`.
- pytest mit **gemocktem** CDS-Client (kein echter Netzaufruf in Tests) über eine kleine synthetische Stundenreihe; prüft Komponenten-Rechnung, Tageslicht-Filter, Histogramm-Aggregation, Display-Stats.

## Nicht in diesem Sprint
Live/Forecast (Sprint 3), Score (Sprint 4). Kein automatisches Auslösen beim Spot-Anlegen (kommt mit Admin, Sprint 8) — hier per Funktion/CLI.

## Definition of Done
Pipeline-Funktionen + Job-Status + recompute + gemockte Tests grün + README (CDS-Setup, wie man die Pipeline für einen Spot startet, wo Rohdaten liegen).
