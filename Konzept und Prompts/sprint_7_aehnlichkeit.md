# Sprint 7 — Ähnlichkeitssuche

> Prompt für Claude Code. Befolge die gemeinsamen Konventionen aus „Spezifikation v2". Setzt Sprint 1–6 voraus.

## Kontext
Suche und Rankings stehen. Jetzt „ähnliche Spots" — bewusst in zwei getrennten Dimensionen, plus der praktische Alternativen-Fall.

## Ziel
Spots finden, die sich gleich anfühlen (Charakter) oder zur selben Zeit laufen (Saison), und Alternativen, die im gewählten Zeitkontext gerade laufen.

## Umfang (Funktionen)
- `normalize_orientation(sectors, facing)` → übersetzt Richtungssektoren relativ zur Spot-Ausrichtung (`spots.facing`) in ein side/onshore/offshore-Muster, damit gespiegelte Küsten als ähnlich erkannt werden (nicht absolute Himmelsrichtung vergleichen).
- `find_similar_spots(spot_id, mode, sport, profile)`:
  - `mode='charakter'`: Abstandsmaß über `editorial` — Wassertyp, Bodentyp, Niveau, Windrange (numerisch), normalisiertes Ausrichtungs-Muster.
  - `mode='saison'`: Korrelation der vorberechneten 52-Wochen-Score-Kurven (hohe Korrelation = läuft zur selben Zeit).
  - `mode='beides'`: kombiniert beide Distanzen.
- `find_alternatives(spot_id, time_context, sport, profile)` → charakter-ähnliche Spots, **gefiltert auf „läuft im aktuellen Zeitkontext"**, gerankt nach Score×Distanz (nutzt rank_nearby-Logik aus Sprint 5).
- API: `GET /spots/{id}/similar?mode=`, `GET /spots/{id}/alternatives`.

## Daten
Liest: spots.editorial, spots.facing, Score-Kurven/climatology. Schreibt: —. Keine neue Datenquelle.

## Akzeptanzkriterien
- Charakter-Ähnlichkeit erkennt zwei funktional gleiche Flachwasser-Spots an gespiegelten Küsten als ähnlich (dank normalize_orientation).
- Saison-Ähnlichkeit gruppiert Spots mit korrelierter Jahreskurve; Anti-Korrelation = unähnlich.
- `find_alternatives` liefert nur Spots, die im gewählten Zeitfenster laufen.
- pytest über Seed-Spots mit konstruierten editorial/Kurven; deckt alle drei Modi + Alternativen ab.

## Nicht in diesem Sprint
Admin (Sprint 8), Watches (Sprint 9). Charakter-Ähnlichkeit setzt gepflegte `editorial`/`facing` voraus (Stufe 2); für Seed entsprechend befüllen.

## Definition of Done
Ähnlichkeits-Funktionen + Endpunkte + Tests grün + README (Modi, Ausrichtungs-Normalisierung, Stufe-Abhängigkeit).
