# Sprint 8 — Admin (Datenpflege)

> Prompt für Claude Code. Befolge die gemeinsamen Konventionen aus „Spezifikation v2". Setzt Sprint 1–7 voraus.

## Kontext
Bisher kamen Spots per Seed. Jetzt die Pflege-Schnittstelle: Spots/Regionen anlegen, redaktionelle Metadaten und Texte pflegen, Auto-Werte überschreiben (mit Herkunft) und Spots kontrolliert live schalten. Reine API/Logik — kein UI.

## Ziel
Vollständiger Schreib-Workflow mit erzwungener Vollständigkeit und nachvollziehbaren Eingriffen.

## Umfang (Funktionen)
- `create_spot(data)` → Spot anlegen (Status `entwurf`), `resolve_grid_cell` + `request_era5_extract` auslösen. Region-Defaults (`regions.defaults`) als Vorbelegung übernehmen (Template).
- `update_spot_metadata(spot_id, editorial)` → redaktionelle Felder **inkl. Beschreibungstexte** pflegen. Jedes Feld nimmt Wert **oder** `n/a`. **Kein** `wind_danger`/`hazards` (entfällt).
- `override_auto_field(spot_id, field, value)` → Auto-Wert (z. B. climatology-Display) überschreiben: schreibt nach `spots.overrides`, Originalwert bleibt erhalten, Herkunft `überschrieben`, Eintrag in `spot_audit`.
- `revert_override(spot_id, field)` → Override entfernen, Auto-Wert wieder aktiv.
- `manage_spot_image(spot_id, image{url,source,license,credit})` → Pflicht-Rechtefelder.
- `create_region(data)` / `assign_spot_to_region` / Region-Defaults pflegen.
- `fetch_region_stock_image(region_name)` → Stock-API (Unsplash/Pexels), mit Lizenz/Credit.
- `trigger_era5_job(spot_id)` / `get_job_status(spot_id)`.
- `validate_spot_readiness(spot_id)` → prüft anhand `required_fields[sport]`, dass jedes Pflichtfeld einen Wert **oder** `n/a` hat, Klimatologie `derived` ist und ein Bild vorhanden ist; liefert checklist + ready(bool).
- `set_spot_live(spot_id)` → nur wenn `validate_spot_readiness.ready`, sonst Ablehnung mit Lückenliste.
- API: `POST /admin/spots`, `PATCH /admin/spots/{id}`, `POST /admin/spots/{id}/override`, `POST /admin/spots/{id}/revert`, `POST /admin/spots/{id}/live`, `GET /admin/spots/{id}/readiness`, `POST /admin/regions`, etc.

## Daten
Schreibt: spots, spots.editorial, spots.overrides, spot_audit, regions, era5_jobs, images. Liest: required_fields, regions.defaults.

## Akzeptanzkriterien
- Ein neuer Spot löst Gitterzelle + ERA5-Job aus und erbt Region-Defaults.
- `set_spot_live` scheitert mit klarer Lückenliste, solange Pflichtfelder fehlen; `n/a` zählt als erfüllt.
- Override schreibt nach overrides, erhält den Originalwert, erzeugt Audit-Eintrag; `recompute_climatology` (Sprint 2) lässt den Override stehen.
- Lese-Endpunkte zeigen überschriebene Werte mit Herkunft `überschrieben`.
- pytest über den vollen Anlege→pflegen→validieren→live-Pfad inkl. Override/Revert/Audit und „nicht zutreffend".

## Nicht in diesem Sprint
Auth/Accounts (spätere App-Phase) — Admin vorerst ungeschützt bzw. simpler Schlüssel. UI separat. Watches (Sprint 9).

## Definition of Done
Schreib-Workflow + Validierung mit n/a + Override/Herkunft/Audit + Templates + Live-Schaltung + Tests grün + README (Pflege-Ablauf, Herkunfts-Logik, recompute-Interaktion).
