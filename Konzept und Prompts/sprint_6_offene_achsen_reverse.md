# Sprint 6 — Offene Achsen & Reverse-Suche

> Prompt für Claude Code. Befolge die gemeinsamen Konventionen aus „Spezifikation v2". Setzt Sprint 1–5 voraus.

## Kontext
Der Such-Kern findet Spots im Raum und im aktuellen Zeitkontext. Jetzt kommen die Reise-Richtungen: offene Zeit (beste Wochen), offener Ort (Katalog/Europa), Zeitraum-Ranking und die Region-Ebene.

## Ziel
Beide Achsen dürfen „offen" sein. Aus „Ort gegeben → Zeit gesucht" und „Zeit gegeben → Ort gesucht" werden vollwertige Suchen, plus die Region-Aggregation.

## Umfang (Funktionen)
- `resolve_time_window(lens, range_input)` → in Saison: Wochenbereich/Monat; in Aktuell: Tagesbereich ≤ 7 Tage; Zustand „offen" erlaubt.
- `rank_by_timewindow(kandidaten, window, sport, profile)` → primär **coverage** (Anteil Wochen mit pct_usable_hours ≥ week_good_threshold), Tie-Breaker **intensity** (Mittel pct_usable_hours).
- `aggregate_region_season(region_id)` → `regions.season[52]` {spots_working, wind_p50, sst_p50, air_p50}, vorberechnet; spots_working = Zahl laufender Spots, nicht Mittelwert.
- `best_regions_for_window(window, sport, profile)` → Job 4: Regionen im Zeitfenster ranken.
- `best_spots_in_region(region_id, time_context, sport, profile)` → Region→Spot-Zoom.
- `best_weeks_for_area(area, sport, profile)` → **offene Zeit**: aggregiert Wochen-Scores der Spots in area (Region.season oder enthaltene Spots), rankt die 52 Wochen, gibt beste zurück. Bei einem Spot = seine Saisonkurve.
- `region_when_to_go(region_id, sport, profile)` → geglättete 52-Wochen-Kurve der Region.
- `search` erweitern: **offener Ort** = Katalog-Scope (v1 Europa); **offene Zeit** → best_weeks_for_area. Ort-offen + Zeit-offen → Reise-Default (Saison×Region).
- API: `GET /regions/{id}/season`, `GET /search/best-regions`, `GET /search/best-spots`, `GET /areas/best-weeks`.

## Daten
Liest: spots.climatology, Score-Engine, regions. Schreibt: regions.season (Aggregat).

## Akzeptanzkriterien
- „beste Spots im Juni" (offener Ort) rankt über den Katalog; „… Europa" identisch in v1.
- „Sardinien · offen" liefert die besten Wochen für die Fläche; „Sardinien · April–Mai" rankt nach coverage.
- Region-Aggregat: eine Woche kann hoch ranken, obwohl nur ein Spot läuft (spots_working), nicht durch Mittelung verwischt.
- pytest: coverage- vs. intensity-Ranking, offene Zeit/Ort, Region-Aggregat über mehrere Seed-Spots.

## Nicht in diesem Sprint
Ähnlichkeit (Sprint 7), Admin (Sprint 8). Region-Aggregat wird hier per Funktion/CLI ausgelöst, nicht automatisch beim Spot-Anlegen.

## Definition of Done
Offene-Achsen-Logik + Zeitraum-Ranking + Region-Aggregat + Reverse-Endpunkte + Tests grün + README (coverage/intensity, offene Achsen).
