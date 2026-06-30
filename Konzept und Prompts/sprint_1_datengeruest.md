# Sprint 1 — Datengerüst

> Prompt für Claude Code. Befolge die gemeinsamen Konventionen aus „Spezifikation v2". Stack: Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL + PostGIS, Redis, pytest. Kein UI.

## Kontext
Erster Sprint eines Backends für eine Wassersport-Spot- und Reiseplanungs-Plattform. Es existiert noch nichts. Dieser Sprint legt das Fundament, auf dem alle weiteren Sprints aufbauen.

## Ziel
Ein lauffähiges Projektgerüst mit vollständigem Datenbankschema, Entitäts-Modellen, einem FastAPI-Skelett und seedbaren Beispieldaten. Noch keine Wetterdaten, keine Suche, kein Score.

## Umfang
- Projektstruktur (app, db, models, schemas, api, tests), Konfiguration via Umgebungsvariablen, Docker-Compose für Postgres+PostGIS und Redis.
- PostGIS aktivieren. Alembic-Migration mit allen Tabellen: `regions`, `spots`, `era5_jobs`, `watches`, `notifications`, `scoring_params`, `spot_audit`, `required_fields`.
  - `spots`: id, slug, name, region_id, location geography(Point,4326), era5_cell jsonb, model_pref, sports text[], water_type, bottom_type, level, status, confidence, facing smallint, editorial jsonb, climatology jsonb, overrides jsonb, image jsonb, timestamps. Indizes: GIST(location), GIN(sports), btree(region_id, status), (water_type, level).
  - `regions`: id, slug, name, country, center geography(Point), bounds geography(Polygon), description, image jsonb, season jsonb, defaults jsonb, timestamps. GIST(center).
  - Übrige Tabellen wie in Spezifikation v2 / Datenmodell v1.
- SQLAlchemy-Modelle + Pydantic-Schemas für alle Entitäten.
- Read-Overlay-Hilfsfunktion `apply_overrides(spot)`: legt `overrides` über berechnete Auto-Felder (hier noch ohne Klimatologie, nur Gerüst).
- Basis-API: `GET /spots`, `GET /spots/{id}`, `GET /regions`, `GET /regions/{id}` (nur Lesen).
- Seed: Fixtures/SQL für ~6 Europa-Spots in 2 Regionen (z. B. Tarifa, Sardinien) mit Koordinaten und Sportarten, ohne Klimatologie/Score. Seed-Befehl dokumentiert.

## Daten
Schreibt: Schema/Tabellen, Seed-Daten. Liest: —.

## Akzeptanzkriterien
- `alembic upgrade head` erstellt alle Tabellen inkl. PostGIS-Typen fehlerfrei.
- Seed-Befehl legt Regionen + Spots an; `GET /spots` liefert sie als JSON mit korrekten Koordinaten.
- pytest: Migration läuft, Seed läuft, Lese-Endpunkte liefern erwartete Struktur, eine Geo-Query (`ST_DWithin`) gegen die Seed-Spots gibt plausible Treffer.

## Nicht in diesem Sprint
ERA5, Open-Meteo, Score, Suche, Admin-Schreibendpunkte. Diese Endpunkte/Funktionen folgen später.

## Definition of Done
Migration + Modelle + Lese-API + Seed + grüne Tests + kurze README (Setup, Seed, Tests starten).
