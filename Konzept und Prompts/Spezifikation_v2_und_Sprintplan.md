# Spezifikation v2 — Entscheidungen, Schema-Updates & Sprintplan

*Aktualisiert gegenüber den drei Basisdokumenten (Gesamtkonzept, Funktionsspezifikation, Datenmodell & Score-Parameter). Diese Datei ist die aktuelle Quelle der Wahrheit für die Sprint-Prompts. Enthält nur Änderungen/Ergänzungen plus die gemeinsamen Konventionen.*

---

## 1. Entscheidungen seit v1 (eingearbeitet)

**Keine Gefahren-Ausgabe.** `wind_danger`-Sektoren, `hazards[]` und die Funktion `compute_flags` entfallen. Die Windrose zeigt nur noch Häufigkeit + Einfärbung nutzbar/ideal/neutral. Die Unterscheidung **nutzbar vs. nicht nutzbar** bleibt erhalten (Score-Gatter braucht sie); eine nicht nutzbare Richtung ist schlicht „neutral/grau", keine Warnung.

**Pflichtfelder inkl. Texte, mit „nicht zutreffend".** Ein Spot geht erst live, wenn alle *zutreffenden* Felder gepflegt sind (auch Beschreibungstexte). Jedes Feld kann einen Wert **oder** explizit `n/a` tragen (z. B. Gezeiten an der Ostsee). Der Validator listet nur echte Lücken.

**Auto-Werte bearbeitbar, mit Herkunft.** Aus dem Internet stammende Werte (ERA5-Klimatologie, abgeleitete Größen) sind im Admin überschreibbar. Jedes Feld trägt Herkunft `auto | manuell | überschrieben`. Originalwert bleibt erhalten (Revert möglich). Ein späterer `recompute` **respektiert Überschreibungen** und markiert höchstens „Auto-Wert hat sich geändert". **Live-Daten** sind ausgenommen (werden frisch geholt, nicht gespeichert/editiert). Zusätzlich: **Region-Templates** (Defaults vorbelegen) und **Änderungshistorie** pro Spot.

**Forecast→Klima-Übergabe.** `get_forecast_series` liefert 7 Tage **plus Konfidenzstufe je Tag** (Tag 1–3 hoch, 4–7 abnehmend). Keine zusammengeführte Reihe über die 7-Tage-Grenze. Der Übergang ist der Aktuell/Saison-Schalter (bewusster Bruch). Optionaler Hand-off-Hinweis am Leisten-Ende = klimatologische Erwartung der Folgewochen, separat beschriftet, aus `get_season_curve`.

---

## 2. Schema-Ergänzungen gegenüber v1

```sql
-- spots: neue Spalten
ALTER TABLE spots ADD COLUMN overrides   jsonb DEFAULT '{}';  -- manuelle Overrides über Auto-Felder
ALTER TABLE spots ADD COLUMN facing      smallint;            -- Spot-Ausrichtung als Kompass-Peilung 0..359 Grad (Richtung zum Wasser), für Onshore-Gate & Ähnlichkeit
-- editorial-JSONB: 'wind.danger' und 'hazards' ENTFALLEN; 'wind.usable'/'wind.ideal' bleiben.
-- Jedes editorial/Override-Feld kann den Sonderwert "n/a" tragen.

-- regions: Templates
ALTER TABLE regions ADD COLUMN defaults jsonb;   -- Vorbelegung für neue Spots (Ausrichtungsmuster, Wassertyp, Bildquelle)

-- Änderungshistorie
CREATE TABLE spot_audit (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id   uuid REFERENCES spots(id) ON DELETE CASCADE,
  field     text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  source    text NOT NULL,   -- 'auto' | 'manuell' | 'überschrieben'
  changed_by text,
  changed_at timestamptz DEFAULT now()
);

-- Pflichtfeld-Konfiguration pro Sportart
CREATE TABLE required_fields (
  sport  text PRIMARY KEY,
  fields jsonb NOT NULL      -- Liste der Pflicht-Feldpfade
);
```

**Lese-Overlay:** Beim Lesen eines Spots werden `overrides` über die berechneten Auto-Felder gelegt. `recompute_climatology` schreibt nur Auto-Werte und lässt `overrides` unberührt; bei Abweichung wird ein Hinweis-Flag gesetzt.

---

## 3. Neue / geänderte Funktionen (Signaturen)

```
classify_geocode(query) -> {type: 'point'|'area', point, bounds}
    # Punkt (Stadt/Dorf) vs. Fläche (Insel/Region/Land). Steuert Radius- vs. Bounds-Suche.

search_by_geometry(shape, sport, time_context, profile) -> ranked_spots
    # shape: Kreis(center,radius) | Rechteck(bounds). ST_DWithin bzw. ST_Within, gefiltert auf sports[].

search(query, sport, time_context, profile) -> {regionen, spots, treffer}
    # Erweitert: verzweigt nach classify_geocode (Punkt→Radius, Fläche→Bounds);
    # behandelt OFFENEN Ort (= Katalog-Scope, v1 Europa) und OFFENE Zeit (→ best_weeks_*).

best_weeks_for_area(area, sport, profile) -> ranked_weeks
    # Offene Zeit: aggregiert Wochen-Scores der Spots in area (Region.season oder enthaltene Spots),
    # rankt die 52 Wochen, gibt die besten zurück. Bei einem Spot = dessen Saisonkurve.

normalize_orientation(sectors, facing) -> pattern   # side/on/offshore-Muster relativ zur Ausrichtung
find_similar_spots(spot_id, mode, sport, profile) -> ranked_spots
    # mode: 'charakter' (editorial-Distanz, Ausrichtung normalisiert) | 'saison' (Korrelation der Kurven) | 'beides'
find_alternatives(spot_id, time_context, sport, profile) -> ranked_spots
    # charakter-ähnlich UND im Zeitkontext laufend, nach Score×Distanz.

# ENTFERNT: compute_flags (keine Gefahren-Ausgabe)
```

---

## 4. Sprintplan (Fundament zuerst)

| # | Sprint | Kern |
|---|---|---|
| 1 | Datengerüst | PostGIS-Schema, Entitäten, FastAPI-Skelett, Seed-Fixtures |
| 2 | ERA5-Pipeline | ein Spot end-to-end: Zelle → CDS → Histogramm → Klimatologie; recompute |
| 3 | Open-Meteo Live + Cache | Live + 7-Tage-Forecast mit Konfidenz, Redis-Cache |
| 4 | Score-Engine (Stufe 2) | evaluate_conditions, Klima-Score, Konfidenz, scoring_params; Stufe-1-describe |
| 5 | Such-Kern | Index, Geocode-Typ, Geometrie, Radius/Bounds, Ranking, Karte/Portfolio, Sport-Toggle |
| 6 | Offene Achsen & Reverse | offene Zeit/Ort, Zeitraum-Ranking, beste Region/Spots, Region-Aggregat |
| 7 | Ähnlichkeit | normalize_orientation, find_similar_spots, find_alternatives |
| 8 | Admin | anlegen, Metadaten+Texte, Overrides+Herkunft+Audit, Templates, Validierung, Live-Schaltung, Bilder |
| 9 | Watch/Benachrichtigung (Backend) | Watches, evaluate_watches, Queue (Zustellung später per App) |

Sprints sind **sequenziell**: jeder setzt die vorherigen voraus. Da kein UI gebaut wird, werden frühe Spots per **Seed/Fixtures** angelegt; das volle Admin kommt erst in Sprint 8.

---

## 5. Gemeinsame Konventionen (gelten für alle Sprint-Prompts)

- **Stack:** Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic (Migrationen), PostgreSQL + PostGIS, Redis, pytest. Paketmanagement mit `uv` oder `pip`.
- **Kein Frontend/UI** in diesen Sprints — nur Datenmodell, API-Endpunkte, Logik, Tests. UI wird separat gebaut.
- **Code-Identifier englisch**, fachliche Werte wie spezifiziert. Domänen-Kommentare dürfen deutsch sein.
- **Test-first / Definition of Done:** Jeder Sprint endet mit `pytest`-Tests, die ohne UI grün laufen, plus Alembic-Migration und einer kurzen README-Notiz zum Sprint. Endpunkte per `curl`/HTTP testbar.
- **Keine hardcodierten Schwellen** — Score-Parameter kommen aus `scoring_params`.
- **Idempotenz** bei Pipeline- und Job-Funktionen.
- **Ehrlichkeitsgrenze respektieren:** Forecast max. 7 Tage; alles dahinter aus der Klimatologie; keine zusammengeführte Reihe über die Grenze.
- **Keine Gefahren-/Empfehlungs-Ausgabe** in den Datenfunktionen — nur Fakten und kategoriale Bewertungen (gut/mäßig/nein).
- Jeder Prompt nennt explizit, was **nicht** in seinem Umfang ist, um Scope-Creep zu vermeiden.
