# Sprint 4 — Score-Engine (Stufe 2) + Stufe-1-Beschreibung

> Prompt für Claude Code. Befolge die gemeinsamen Konventionen aus „Spezifikation v2". Setzt Sprint 1–3 voraus.

## Kontext
Klimatologie (Saison) und Live/Forecast (Aktuell) liegen vor. Jetzt die zentrale Bewertungslogik, die beide nutzt. Sie ist die Kernfunktion, von der Badge, Saisonkurve, Region-Aggregat und Rankings abhängen.

## Ziel
Eine regelbasierte, kategoriale Bewertung (gut/mäßig/nein), parametrisiert über `scoring_params` (global) + `editorial` (Spot) + Rider-Profil (Niveau). Dieselbe Funktion live und klimatologisch.

## Umfang (Funktionen)
- `scoring_params` befüllen (Version 1, je Sportart): Bins, Gatter, Bänder, Niveau-Offsets, `week_good_threshold=0.40`, Distanz-`d0=40`. Werte aus dem Score-Parameter-Doc.
- `profile_thresholds(level, sport)` → Schwellen-Offsets.
- `apply_gates(values, editorial, sport)` → pass/fail. Kite: Tageslicht, Richtung ∈ usable, Stärke ∈ [min,max]. Surf: Swell-Richtung ∈ window, Höhe ∈ [min,max], Periode ≥ period_min, Gezeit ∈ window (falls dependence), kein starker auflandiger Wind. **Keine Gefahren-Ausgabe** — nicht nutzbare Richtung = einfach fail.
- `grade_magnitude(values, editorial, profile)` → gut|mäßig (inkl. Böigkeits-Downgrade bei gust/mean≥1.4 oder gust−mean≥8 kt).
- `evaluate_conditions(values, editorial, profile, sport)` → {rating, reasons} (Kernfunktion; nutzt apply_gates + grade_magnitude).
- `score_live(spot_id, profile)` → Jetzt-Badge (über get_live_conditions).
- `score_climatology_week(spot_id, week, profile, sport)` → pct_usable_hours (zellweise evaluate über das Wochen-Histogramm), plus „gut-Anteil".
- `score_climatology_curve(spot_id, profile, sport)` → pct_usable[52].
- `describe_week(spot_id, week)` → Stufe-1-Beschreibung ohne Gatter (typ. Wind p50+Spanne, dominante Richtung, sst, air).
- `spot_confidence(spot_id, sport)` → hoch|mittel|niedrig (Welle/thermisch niedriger; `confidence_override` beachten).
- API: `GET /spots/{id}/badge`, `GET /spots/{id}/season?stage=1|2`.

## Daten
Liest: spots.climatology, spots.editorial, scoring_params, Live-Cache. Schreibt: optional vorgerechnete Klima-Scores mit `scoring_params.version`-Tag (Cache/Spalte).

## Akzeptanzkriterien
- Gatter-Fälle korrekt: Richtung außerhalb usable → nein; Wind unter min → nein; ideale Richtung+Idealband → gut.
- Klima-Score einer Woche = Anteil passierender Tageslicht-Stunden; konsistent zwischen live und klimatologisch (gleiche Logik).
- Niveau verschiebt das Rating nachvollziehbar (Anfänger vs. Pro).
- Stufe-1-`describe_week` funktioniert ohne vollständige `editorial`.
- pytest über synthetische Werte/Histogramme; deckt Kite und Surf, alle Gatter, Böigkeit, Niveau-Offsets, Konfidenz ab.

## Nicht in diesem Sprint
Suche/Rankings (Sprint 5–6) — hier nur die Bewertung pro Spot/Woche. Keine Aggregation über mehrere Spots.

## Definition of Done
scoring_params v1 + Score-Funktionen + Stufe-1-describe + Konfidenz + Badge/Season-Endpunkte + Tests grün + README (Parameter-Schichten, wie man scoring_params versioniert).
