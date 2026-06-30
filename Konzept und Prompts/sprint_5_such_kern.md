# Sprint 5 — Such-Kern

> Prompt für Claude Code. Befolge die gemeinsamen Konventionen aus „Spezifikation v2". Setzt Sprint 1–4 voraus.

## Kontext
Spots haben jetzt Klimatologie, Live-Werte und Score. Dieser Sprint baut den Suchmechanismus: die räumlichen Eingänge und das Ranking. Offene Achsen und Reverse-Richtungen kommen in Sprint 6.

## Ziel
Spots/Regionen finden über Textindex, Geocoding (Punkt vs. Fläche), gezeichnete Geometrie und Kartenausschnitt — und im aktuellen Zeitkontext ranken.

## Umfang (Funktionen)
- `search_entities(query)` → eigener Volltext-Index über Spots+Regionen (Name, Land, Aliasse), gruppiert.
- `classify_geocode(query)` → {type:'point'|'area', point, bounds} (Open-Meteo-Geocoding; Typ aus Ergebnis-Klasse). **Orte nie als Treffer.**
- `search_nearby_spots(point, sport, radius)` → `ST_DWithin`, gefiltert auf sports[], adaptiver Radius (Start 25 km, erweitern bei zu wenigen).
- `search_by_geometry(shape, sport, time_context, profile)` → Kreis→`ST_DWithin`, Rechteck→`ST_Within`; gerankt.
- `rank_nearby(spots, time_context, profile)` → Score (aus Sprint 4) × `exp(−d/d0)`, d0 aus scoring_params.
- `search(query, sport, time_context, profile)` → Orchestrierung: erst search_entities; sonst classify_geocode → Punkt:search_nearby / Fläche:Bounds-Query → rank. Liefert {regionen, spots, treffer}; „Laboe" liefert Laboe+Stein+Umkreis Score-gerankt.
- `query_map(bounds, time_context, sport, profile)` → Pins für Ausschnitt, eingefärbt nach Live- bzw. Saison-Wert.
- `query_portfolio(ebene, time_context, sport, profile)` → Karten synchron zu query_map.
- `cluster_pins(spots, zoom)` → Cluster bei geringem Zoom.
- `toggle_sport(sport, context)` → Katalog-Neuabfrage (Filter sports[], Neu-Ranking/-Färbung).
- API: `GET /search`, `POST /search/geometry`, `GET /map`, `GET /portfolio`.

## Daten
Liest: spots (PostGIS, sports[], editorial, climatology), Score-Engine, Geocoding-API. Schreibt: —.

## Akzeptanzkriterien
- „Laboe" liefert nahe Spots (inkl. Stein), Score-gerankt mit Distanzdämpfung; ein deutlich besserer, etwas weiterer Spot kann vorrücken.
- Flächen-Eingabe (z. B. Sardinien als `area`) nutzt Bounds, nicht Radius um den Mittelpunkt.
- Gezeichneter Kreis/Rechteck liefert die Spots im Bereich.
- Sport-Toggle ändert die Ergebnismenge (Flachwasser fällt im Welle-Modus raus).
- pytest gegen Seed-Spots mit gemocktem Geocoder; deckt Punkt vs. Fläche, Radius/Bounds, Ranking, Toggle ab.

## Nicht in diesem Sprint
Offene Zeit/Bestwochen, Zeitraum-Ranking, Reverse-Region (Sprint 6). Ähnlichkeit (Sprint 7).

## Definition of Done
Such-Funktionen + Endpunkte + Ranking + Geometrie + Tests grün + README (Suchablauf, Punkt/Fläche-Logik).
