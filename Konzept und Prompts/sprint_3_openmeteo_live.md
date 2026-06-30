# Sprint 3 — Open-Meteo Live + Forecast (gecacht)

> Prompt für Claude Code. Befolge die gemeinsamen Konventionen aus „Spezifikation v2". Setzt Sprint 1–2 voraus.

## Kontext
Der Saison-Pfad (ERA5) steht. Jetzt der getrennte Laufzeit-Pfad: aktuelle Bedingungen und 7-Tage-Forecast aus Open-Meteo, mit Cache. Strikt getrennt von der Klimatologie.

## Ziel
Für einen Spot aktuelle Werte und eine 7-Tage-Reihe mit Konfidenz je Tag liefern, performant gecacht.

## Umfang (Funktionen)
- `select_model(lat, lon)` → bevorzugtes Regionalmodell (z. B. ICON-D2/EU, AROME für EU-Küsten), sonst `best_match`. Ergebnis nutzt `spots.model_pref`, falls gesetzt.
- `fetch_forecast(lat, lon, model, days=7)` → Wind/Böen/Richtung/Temperatur stündlich + current (Open-Meteo Forecast-API).
- `fetch_marine(lat, lon, days=7)` → Swell-Höhe/Periode/Richtung (Marine-API).
- `cache_get/cache_set(key, value, ttl)` → Redis, key `om:{model}:{lat_r}:{lon_r}:{var}`, TTL 30–60 Min.
- `get_live_conditions(spot_id)` → current{wind, gust, dir, air, sst, swell, period, swell_dir} aus Cache, sonst fetch → cache.
- `get_forecast_series(spot_id, days=7)` → tägliche/stündliche Reihe **plus Konfidenzstufe je Tag** (Tag 1–3 `hoch`, 4–5 `mittel`, 6–7 `niedrig`). **Keine** Werte über 7 Tage hinaus, keine Zusammenführung mit Klimatologie.
- API: `GET /spots/{id}/live`, `GET /spots/{id}/forecast`.

## Daten
Liest: spots (Koordinaten, model_pref), Redis-Cache. Schreibt: Redis-Cache. **Keine** Persistenz der Live-Daten in Postgres.

## Akzeptanzkriterien
- Zweiter Aufruf innerhalb der TTL trifft den Cache (kein erneuter HTTP-Call).
- `get_forecast_series` liefert genau 7 Tage mit korrekter Konfidenz-Staffelung; nichts dahinter.
- pytest mit **gemocktem** Open-Meteo-Client; prüft Modellwahl, Cache-Treffer/-Miss, Konfidenz-Staffelung, Forecast-Horizont-Kappung.

## Nicht in diesem Sprint
Score/Badge (Sprint 4) — hier nur Rohwerte. Keine Klimatologie-Anbindung über die 7-Tage-Grenze. Kein Hand-off-Hinweis (gehört zur Anzeige/Score, Sprint 4+).

## Definition of Done
Fetch + Cache + Live/Forecast-Endpunkte mit Konfidenz + gemockte Tests grün + README (Modellwahl, Cache-Keys, TTL).
