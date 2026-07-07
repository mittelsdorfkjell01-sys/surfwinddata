# Wellen-Datenquelle — Prüfnotiz (Sprint 11)

**Frage:** Reicht Open-Meteo für eine historische Wellen-Klimatologie, oder braucht es
den CDS-Fallback (Option c)?

**Vorgehen:** Echte HTTP-Abfragen gegen die beiden Open-Meteo-Endpunkte für einen
Atlantik-Wellen-Punkt (Ericeira/Portugal, ~38.98 N, 9.5 W) und einen Wind-Punkt
(Tarifa). Getestet am 2026-07-05.

## Ergebnisse (belegt)

| Quelle | Variablen | Zeitspanne mit **echten** Werten | Auflösung |
| ------ | --------- | -------------------------------- | --------- |
| **Historical Weather API** (`archive-api.open-meteo.com/v1/archive`, ERA5) | `wind_speed_10m`, `wind_direction_10m`, `temperature_2m` | tief (getestet 2005 → volle Werte; ERA5 reicht bis 1940) | stündlich, 0.25° |
| Historical Weather API — **Wellen** (`wave_height`/`period`/`direction`) | akzeptiert die Parameter, liefert aber **nur `null`** für historische Daten (2005 und 2010 geprüft, auch mit `models=era5`) | — (keine echten Werte) | — |
| **Marine API** (`marine-api.open-meteo.com/v1/marine`) | `wave_height`, `wave_period`, `wave_direction` | **erst ab 2022** echte Werte (2019/2020/2021 = `null`, 2022 = voll) | stündlich |

Konkrete Belege:
- `archive` Wind 2005: 72 Stunden, `wind_speed_10m=[5.73, 5.81, 6.05]` (m/s), `wind_direction_10m=[65,63,68]`.
- `archive` Wellen 2005 & 2010: `wave_height` = 48/72 Werte, **0 non-null**.
- `marine` Wellen: 2019/2020/2021 = 0 non-null; **2022 = 48/48 non-null** (`wave_height=[1.84,1.86,…]`).

## Entscheidung: **Option (b)** — Wellen über den kürzeren verfügbaren Zeitraum

- **Wind:** ERA5 über die Historical Weather API, ~20 Jahre (Default 2004–2023). Tiefe,
  lückenlose Historie. Kein CDS.
- **Wellen:** Marine API über den **tatsächlich verfügbaren** Zeitraum (**ab 2022**),
  im Record **klar als geringere Jahres-Tiefe markiert** (`wave_window`, `wave_source`,
  `wave_note`). Für Wellen-Spots liefert das eine (dünne, aber echte) Saison-Kurve.
- **Kein CDS-Fallback (Option c).** Die Daten erzwingen ihn nicht: Marine liefert echte
  Wellenhistorie ab 2022. `cdsapi`/`netCDF4`/`xarray`/`~/.cdsapirc` werden aus dem
  Standardpfad entfernt und sind nur noch optional (nicht Kern).

**Konsequenz für die Klimatologie:** Wind- und Wellen-Achse teilen sich eine Zeitachse
(Wind = volle 20 Jahre), aber die Swell-Histogramme nutzen nur die Stunden mit echten
Wellendaten (ab 2022). Die bestehende `_swell_joint`-Logik filtert ohnehin auf
`isfinite`, sodass NaN-Wellenstunden (vor 2022) automatisch ausgeschlossen werden.

**Attribution (Pflicht im UI später):** „Wetterdaten von Open-Meteo.com, CC BY 4.0"
(ERA5 via Copernicus/ECMWF; Wellen via Open-Meteo-Wellenmodell).
