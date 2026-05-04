# 🪁 KiteWind Dashboard

Historische + Live-Windanalyse für 20 Kitesurf-Spots weltweit.

## Daten abrufen (einmalig, ~4 Minuten)

```bash
pip install -r requirements.txt
python fetch_history.py
```

Erzeugt `data/history.json` (~4 MB). Diese Datei muss committed werden.

## Lokal testen

```bash
python -m http.server 8080
```
→ http://localhost:8080

**Wichtig:** Nicht per `file://` öffnen — fetch() funktioniert dann nicht.

## GitHub Pages veröffentlichen

1. Repo pushen (inkl. `data/history.json`)
2. GitHub → Settings → Pages → Branch: `main`, Folder: `/`
3. Nach ~1 Minute live unter: `https://USERNAME.github.io/REPO`

## history.json aktualisieren

Einmal jährlich oder nach Bedarf:
```bash
python fetch_history.py
git add data/history.json
git commit -m "Update history data"
git push
```

## Datenquellen

- **Historik (2004–2024):** Open-Meteo Historical API — kostenlos, kein API-Key
- **Aktuelles Jahr + Live:** Open-Meteo Forecast API — kostenlos, kein API-Key
- **Wind-Einheit:** Knoten (kts), 7-Tage-Gleitdurchschnitt
