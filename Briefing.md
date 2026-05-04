# KiteWind Dashboard v2 — Claude Code Briefing

> Statische GitHub Pages Website mit historischen + Live-Winddaten für 20 Kitesurf-Spots.
> Kein Backend, kein Build-Step, kein Framework.

---

## Übersicht: Was gebaut wird

| Seite | Funktion |
|-------|----------|
| `index.html` | Startseite: Live-Kacheln (Jetzt) + historische Bestzeiten-Liste |
| `spot.html` | Spot-Detailseite: Jahresgraph mit 7 Linien (5 Jahre + Ø + 2025) |
| `data/history.json` | Vorberechnete historische Daten (Python, einmalig) |
| `fetch_history.py` | Python-Skript: lädt 2004–2024 von Open-Meteo, erzeugt history.json |
| `requirements.txt` | Python-Abhängigkeiten |
| `styles.css` | Globales Styling |
| `app.js` | Gemeinsame Logik (Spot-Definitionen, Hilfsfunktionen) |
| `index.js` | Startseiten-Logik |
| `spot.js` | Detailseiten-Logik + Chart |
| `README.md` | Setup-Anleitung |

---

## Projektstruktur

```
kitewind/
├── index.html
├── spot.html
├── styles.css
├── app.js
├── index.js
├── spot.js
├── data/
│   └── history.json
├── fetch_history.py
├── requirements.txt
└── README.md
```

---

## Die 20 Kitesurf-Spots (zentrale Definition in `app.js`)

Alle Spot-Daten als JS-Array `SPOTS` in `app.js` definieren — wird von allen Seiten genutzt.

```js
const SPOTS = [
  { id: 'laboe',          name: 'Laboe',               country: 'Deutschland',  lat: 54.404,  lon: 10.222,  color: '#2196F3' },
  { id: 'gold_fehmarn',   name: 'Gold auf Fehmarn',    country: 'Deutschland',  lat: 54.450,  lon: 11.190,  color: '#03A9F4' },
  { id: 'hvide_sande',    name: 'Hvide Sande',         country: 'Dänemark',     lat: 56.000,  lon:  8.122,  color: '#00BCD4' },
  { id: 'st_peter_ording',name: 'St. Peter-Ording',    country: 'Deutschland',  lat: 54.293,  lon:  8.652,  color: '#009688' },
  { id: 'is_solinas',     name: 'Is Solinas',          country: 'Sardinien',    lat: 40.057,  lon:  8.391,  color: '#4CAF50' },
  { id: 'la_cinta',       name: 'La Cinta',            country: 'Sardinien',    lat: 40.744,  lon:  9.735,  color: '#8BC34A' },
  { id: 'les_capitelles', name: 'Les Capitelles',      country: 'Frankreich',   lat: 43.459,  lon:  3.642,  color: '#CDDC39' },
  { id: 'taghazout',      name: 'Taghazout',           country: 'Marokko',      lat: 30.540,  lon: -9.710,  color: '#FFC107' },
  { id: 'tarifa',         name: 'Tarifa',              country: 'Spanien',      lat: 36.014,  lon: -5.601,  color: '#FF9800' },
  { id: 'leucate',        name: 'Leucate',             country: 'Frankreich',   lat: 42.916,  lon:  3.053,  color: '#FF5722' },
  { id: 'praia_guincho',  name: 'Praia do Guincho',    country: 'Portugal',     lat: 38.730,  lon: -9.472,  color: '#F44336' },
  { id: 'sotavento',      name: 'Sotavento',           country: 'Fuerteventura',lat: 28.131,  lon:-14.254,  color: '#E91E63' },
  { id: 'brouwersdam',    name: 'Brouwersdam',         country: 'Niederlande',  lat: 51.751,  lon:  3.878,  color: '#9C27B0' },
  { id: 'pounda_paros',   name: 'Pounda Paros',        country: 'Griechenland', lat: 37.007,  lon: 25.122,  color: '#673AB7' },
  { id: 'lo_stagnone',    name: 'Lo Stagnone',         country: 'Sizilien',     lat: 37.866,  lon: 12.479,  color: '#3F51B5' },
  { id: 'ringkobing',     name: 'Ringkøbing Fjord',    country: 'Dänemark',     lat: 56.089,  lon:  8.243,  color: '#795548' },
  { id: 'valdevaqueros',  name: 'Valdevaqueros',       country: 'Spanien',      lat: 36.060,  lon: -5.682,  color: '#607D8B' },
  { id: 'obidos',         name: 'Óbidos Lagoon',       country: 'Portugal',     lat: 39.364,  lon: -9.215,  color: '#FF6F00' },
  { id: 'gokova',         name: 'Gökova Bay',          country: 'Türkei',       lat: 37.140,  lon: 28.010,  color: '#00838F' },
  { id: 'akyaka',         name: 'Akyaka',              country: 'Türkei',       lat: 37.055,  lon: 28.125,  color: '#1B5E20' },
];

const KITE_MIN = 16; // Knoten
const KITE_MAX = 30; // Knoten
```

---

## Python-Skript `fetch_history.py`

### Zweck
Einmalig lokal ausführen. Lädt stündliche Winddaten 2004–2024 für alle 20 Spots von der Open-Meteo Historical API. Berechnet daraus 7-Tage-Gleitdurchschnitte pro Jahr und schreibt `data/history.json`.

### API
```
GET https://archive-api.open-meteo.com/v1/archive
  ?latitude=54.404
  &longitude=10.222
  &start_date=2004-01-01
  &end_date=2024-12-31
  &hourly=windspeed_10m
  &wind_speed_unit=kmh
  &timezone=auto
```
Antwort: `{"hourly": {"time": [...], "windspeed_10m": [...]}}`

Umrechnung: `kts = kmh * 0.539957`

### Verarbeitungsschritte pro Spot

1. **Stundenwerte laden** für 2004–2024
2. **Tagesmittel berechnen**: Durchschnitt aller Stundenwerte pro Kalendertag → Array von 365/366 Werten pro Jahr
3. **Schaltjahre normalisieren**: 29. Feb (Tag 60) überspringen → immer genau 365 Tage pro Jahr (Tag 1–365)
4. **7-Tage-Gleitdurchschnitt** über die 365 Tageswerte pro Jahr berechnen (zentriertes Fenster, ±3 Tage)
5. **Ausgabe**: Pro Spot und Jahr ein Array mit 365 Werten in Knoten (1 Dezimalstelle)

### Output-Format `data/history.json`

```json
{
  "generated": "2025-05-01T12:00:00",
  "years": [2004, 2005, 2006, ..., 2024],
  "spots": {
    "laboe": {
      "avg": [7.2, 7.3, 7.5, ..., 8.1],
      "2004": [5.1, 5.3, 6.2, ..., 7.0],
      "2005": [6.0, 6.1, 5.8, ..., 7.2],
      ...
      "2024": [8.1, 8.3, 7.9, ..., 9.0]
    },
    "gold_fehmarn": { ... },
    ...
  }
}
```

- `avg`: 365-Werte-Array — Tagesmittel gemittelt über alle 21 Jahre (2004–2024)
- `"2004"` … `"2024"`: je ein 365-Werte-Array mit 7-Tage-Gleitdurchschnitt
- Alle Werte in Knoten, 1 Dezimalstelle, fehlende Werte als `null`

### Konsolenausgabe während Ausführung
```
Fetching Laboe (1/20)... ✓ (21 Jahre, 183.960 Stunden)
Fetching Gold auf Fehmarn (2/20)... ✓
...
Fertig! data/history.json geschrieben (4.2 MB)
Laufzeit: 3:42 min
```

### Fehlerbehandlung
- 3 Retry-Versuche bei API-Fehler, 5s Pause
- Fehlende Stundenwerte (`null`) beim Tagesmittel ignorieren (nicht als 0 werten)
- Wenn ein ganzer Tag fehlt: `null` im Output (Chart ignoriert null-Punkte)
- 1s Pause zwischen Spot-Anfragen (API nicht überlasten)

### `requirements.txt`
```
requests
```

---

## Seite 1: Startseite `index.html`

### Layout

```
┌─────────────────────────────────────────────────────┐
│  🪁 KiteWind                          [alle Spots →] │
│  Historische Windanalyse · 20 Kitesurf-Spots        │
├─────────────────────────────────────────────────────┤
│  JETZT (Live)                          Stand: 14:32 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ ✅ Tarifa │ │ ✅ Laboe  │ │ ❌ La Cinta│  ...     │
│  │  22 kts  │ │  18 kts  │ │   8 kts  │            │
│  └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────┤
│  STATISTISCH GUT IN DIESER WOCHE (historisch)       │
│  Basierend auf Woche 18 (1. Mai – 7. Mai), Ø 2004–24│
│                                                     │
│  ████ Tarifa            78% Kite-Stunden            │
│  ████ Hvide Sande       61% Kite-Stunden            │
│  ████ St. Peter-Ording  54% Kite-Stunden            │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

### Sektion 1: „JETZT (Live)"

**Datenquelle:** Open-Meteo Forecast API (kostenlos, kein Key):
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=54.404&longitude=10.222
  &current=windspeed_10m
  &wind_speed_unit=kmh
```
Feld: `current.windspeed_10m` → Umrechnung in Knoten.

**Für alle 20 Spots parallel fetchen** (`Promise.all`).

**Kachel-Design:**
- Grün + Häkchen: Wind zwischen 16–30 kts → "Kite-Fenster! XX kts"
- Gelb + Welle: Wind 12–15 kts → "Grenzwertig · XX kts"
- Grau + X: Wind < 12 oder > 30 kts → "Kein Wind · XX kts" / "Zu viel Wind"
- Kachel ist klickbar → navigiert zu `spot.html?id=SPOT_ID`
- Stand-Zeitstempel oben rechts: "Stand: HH:MM Uhr"
- Bei API-Fehler: Kachel zeigt "–" mit Hinweis "Keine Verbindung"

### Sektion 2: „Statistisch gut in dieser Woche"

**Berechnung aus `history.json`:**
1. Aktuelle Kalenderwoche bestimmen (JS `Date`)
2. Tage dieser Woche (1–365) aus dem `avg`-Array aller Spots lesen
3. Pro Spot: Anteil der Tage in dieser Woche mit Tagesmittel ≥ 16 kts berechnen
4. Spots nach diesem Wert absteigend sortieren
5. Alle Spots anzeigen (Balkendiagramm, CSS-only, kein Chart.js nötig)
6. Spots mit > 50% werden farbig hervorgehoben

**Hinweistext unter der Überschrift:**
`"Basierend auf KW 18 (29. Apr – 5. Mai), Durchschnitt 2004–2024"`

---

## Seite 2: Spot-Detailseite `spot.html`

URL-Parameter: `spot.html?id=laboe`

### Layout

```
┌─────────────────────────────────────────────────────┐
│  ← Alle Spots    🪁 KiteWind                        │
├──────────────────────┬──────────────────────────────┤
│  SEITENLEISTE        │  HAUPTBEREICH                │
│                      │                              │
│  [● Laboe        ]   │  Laboe · Deutschland         │
│  [● Gold Fehmarn ]   │  Live: 18 kts ✅             │
│  [● Hvide Sande  ]   │                              │
│  [● St.Peter-Ording] │  [Chart: Jahresverlauf]      │
│  [● Is Solinas   ]   │                              │
│  [● La Cinta     ]   │  Legende (Jahre)             │
│  ...                 │                              │
│  (20 Spots)          │  [Tab: Windstärke kts]       │
│                      │  [Tab: % Kite-Fenster]       │
│                      │  [Tab: Kite-Tage/Monat]      │
└──────────────────────┴──────────────────────────────┘
```

### Seitenleiste

- Fest links, scrollbar bei kleinen Bildschirmen
- Breite: 200px
- Jeder Spot: ein Button mit farbigem Punkt + Name
- Aktiver Spot: hervorgehoben (Border links, leichter Hintergrund)
- Klick → URL-Parameter wechseln + Chart neu laden (kein Seitenneuladen nötig, `history.pushState`)
- Auf Mobile (< 768px): Seitenleiste wird zu horizontalem Scroll-Streifen oben

### Spot-Header (Hauptbereich oben)

- Spot-Name groß, Land klein darunter
- Live-Wind: direkt von Open-Meteo Forecast API geladen, angezeigt als Chip:
  - Grün: "● Live: 22 kts — Kite-Fenster"
  - Gelb: "● Live: 14 kts — Grenzwertig"
  - Grau: "● Live: 6 kts — Kein Wind"
- "Zuletzt aktualisiert: HH:MM Uhr"

### Der Jahresgraph (Chart.js)

**Typ:** Line Chart

**X-Achse:**
- Werte: Tag 1–365
- Labels: Monatsnamen an den Monatsgrenzen (Tag 1=Jan, 32=Feb, 60=Mär, 91=Apr, 121=Mai, 152=Jun, 182=Jul, 213=Aug, 244=Sep, 274=Okt, 305=Nov, 335=Dez)
- `ticks.maxTicksLimit: 12`, Labels nur an Monatsgrenzen

**Y-Achse:**
- Min: 0, Max: 40 kts (festes Maximum für Vergleichbarkeit)
- Label: "Windstärke (7-Tage-Ø, kts)"

**7 Datensätze (Linien):**

| Datensatz | Daten | Farbe | Stil | Dicke |
|-----------|-------|-------|------|-------|
| Ø 2004–2024 | `avg` Array | `#455A64` (Dunkelgrau) | Gestrichelt `[6,3]` | 2.5px |
| 2020 | `"2020"` Array | `#90CAF9` (Hellblau) | Durchgezogen | 1.5px |
| 2021 | `"2021"` Array | `#80CBC4` (Teal) | Durchgezogen | 1.5px |
| 2022 | `"2022"` Array | `#A5D6A7` (Grün) | Durchgezogen | 1.5px |
| 2023 | `"2023"` Array | `#FFCC02` (Gelb) | Durchgezogen | 1.5px |
| 2024 | `"2024"` Array | `#FF8A65` (Orange) | Durchgezogen | 1.5px |
| 2025 (live) | Live-API Daten | `#EF5350` (Rot) | Durchgezogen | 2px |

**Kite-Fenster Annotation** (chartjs-plugin-annotation):
```js
annotations: {
  kiteZone: {
    type: 'box',
    yMin: 16,
    yMax: 30,
    backgroundColor: 'rgba(76, 175, 80, 0.07)',
    borderColor: 'rgba(76, 175, 80, 0.25)',
    borderWidth: 1,
    label: {
      content: '⬆ Kite-Fenster 16–30 kts',
      display: true,
      position: { x: 'start', y: 'end' },
      color: 'rgba(76, 175, 80, 0.6)',
      font: { size: 10 }
    }
  },
  today: {
    // Vertikale Linie am heutigen Tag (nur wenn 2025 sichtbar)
    type: 'line',
    xMin: currentDayOfYear,
    xMax: currentDayOfYear,
    borderColor: 'rgba(239, 83, 80, 0.5)',
    borderWidth: 1,
    borderDash: [4, 4],
    label: {
      content: 'Heute',
      display: true,
      position: 'start',
      color: 'rgba(239, 83, 80, 0.7)',
      font: { size: 10 }
    }
  }
}
```

**2025-Linie (aktuelles Jahr):**
- Daten: Live von Open-Meteo Historical API abrufen für 2025-01-01 bis heute
- Tagesmittel berechnen + 7-Tage-Gleitdurchschnitt
- Array hat nur Werte bis zum heutigen Tag (Rest: `null` → Chart zeichnet bis hier)
- Wird parallel zum Seitenload gefetcht (nicht aus history.json)

**Chart-Optionen:**
```js
{
  responsive: true,
  maintainAspectRatio: false,  // Höhe per CSS kontrolliert
  animation: false,             // Schneller bei Spot-Wechsel
  spanGaps: false,              // Lücken (null) nicht überbrücken
  elements: {
    point: { radius: 0, hoverRadius: 4 }  // Keine Punkte (zu viele)
  },
  plugins: {
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        title: (items) => `Tag ${items[0].label} · ${dayOfYearToDate(items[0].label)}`,
        label: (item) => `${item.dataset.label}: ${item.parsed.y?.toFixed(1) ?? '–'} kts`
      }
    },
    legend: { display: false }  // Eigene Legende unten
  }
}
```

**Hilfsfunktion `dayOfYearToDate(day)`:** Wandelt Tag 1–365 in "1. Jan", "15. Mär" etc. um (für Tooltip-Titel).

### Legende unter dem Chart

7 Pills nebeneinander, klickbar (toggle dataset visibility):
```
[— Ø 2004–24]  [─ 2020]  [─ 2021]  [─ 2022]  [─ 2023]  [─ 2024]  [─ 2025]
```
- Gestrichelte Linie für Durchschnitt, durchgezogen für Jahre
- Ausgegraut wenn ausgeblendet

### Drei Tabs unter Legende

Gleiche Tabs wie ursprünglich geplant, aber jetzt **pro Spot**:
- **Tab 1:** Windstärke kts (der Jahresgraph oben — Standard)
- **Tab 2:** % Kite-Stunden pro Monat (Balkendiagramm, 12 Monate, aus history.json)
- **Tab 3:** Kite-Tage pro Monat (Balkendiagramm, 12 Monate, aus history.json)

Für Tab 2 und 3: aus `history.json` direkt die monatlichen Aggregationen berechnen (im Browser, aus den vorhandenen Tagesdaten).

---

## 2025-Daten live fetchen (`spot.js`)

```js
async function fetch2025(spot) {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://archive-api.open-meteo.com/v1/archive`
    + `?latitude=${spot.lat}&longitude=${spot.lon}`
    + `&start_date=2025-01-01&end_date=${today}`
    + `&hourly=windspeed_10m&wind_speed_unit=kmh&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();
  // Tagesmittel + 7-Tage-Gleitdurchschnitt berechnen
  // Rückgabe: Array mit (heutiger Tag im Jahr) Werten in kts
}
```

Hinweis: Open-Meteo Historical API deckt Daten bis ca. 5 Tage vor heute ab. Für die letzten 5 Tage Forecast-API verwenden:
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=...&longitude=...
  &hourly=windspeed_10m&wind_speed_unit=kmh
  &past_days=5&forecast_days=0
```
Beide Responses zusammenführen und deduplizieren.

---

## Styling `styles.css`

### CSS Custom Properties

```css
:root {
  --bg:          #F5F5F5;
  --surface:     #FFFFFF;
  --border:      #E0E0E0;
  --text:        #212121;
  --text-muted:  #757575;
  --accent:      #1565C0;
  --green:       #388E3C;
  --yellow:      #F57F17;
  --red:         #C62828;
  --sidebar-w:   200px;
  --font:        'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### Layout Startseite (`index.html`)

```css
body { background: var(--bg); font-family: var(--font); margin: 0; }

header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1.5rem;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 10;
}

.live-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
  padding: 1rem 1.5rem;
}

.kite-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  text-decoration: none;
  transition: box-shadow 0.15s;
}
.kite-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.kite-card.kite   { border-left: 3px solid var(--green); }
.kite-card.border { border-left: 3px solid var(--yellow); }
.kite-card.no     { border-left: 3px solid var(--border); }

.stat-bar-container { padding: 0 1.5rem 2rem; }
.stat-bar-row { display: flex; align-items: center; gap: 0.75rem; margin: 0.4rem 0; }
.stat-bar-label { width: 160px; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat-bar-track { flex: 1; height: 8px; background: var(--border); border-radius: 4px; }
.stat-bar-fill  { height: 100%; border-radius: 4px; background: var(--accent); }
.stat-bar-pct   { width: 40px; font-size: 0.8rem; color: var(--text-muted); text-align: right; }
```

### Layout Detailseite (`spot.html`)

```css
.page-layout {
  display: flex;
  height: calc(100vh - 48px); /* minus Header */
}

.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 0.5rem 0;
}

.sidebar-item {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer; font-size: 0.82rem;
  border-left: 3px solid transparent;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sidebar-item:hover   { background: var(--bg); }
.sidebar-item.active  { border-left-color: var(--accent); background: #E3F2FD; font-weight: 500; }

.sidebar-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem 1.5rem 1.5rem;
  height: 420px;
  position: relative;
}

.chart-canvas-wrapper { height: 340px; position: relative; }

.chart-legend {
  display: flex; flex-wrap: wrap; gap: 0.5rem;
  margin-top: 0.75rem;
}
.legend-pill {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.2rem 0.6rem; border-radius: 100px;
  border: 1px solid var(--border); font-size: 0.75rem;
  cursor: pointer; user-select: none; background: var(--surface);
}
.legend-pill.hidden { opacity: 0.35; }
.legend-line { width: 18px; height: 2px; }
.legend-line.dashed {
  background: repeating-linear-gradient(
    90deg, currentColor 0, currentColor 4px, transparent 4px, transparent 7px
  );
}
```

### Responsive

```css
@media (max-width: 768px) {
  .page-layout { flex-direction: column; height: auto; }

  .sidebar {
    width: 100%; height: auto;
    display: flex; flex-direction: row;
    overflow-x: auto; overflow-y: hidden;
    border-right: none; border-bottom: 1px solid var(--border);
    padding: 0.25rem 0;
  }

  .sidebar-item {
    flex-direction: column; gap: 0.2rem; padding: 0.4rem 0.75rem;
    font-size: 0.72rem; border-left: none; border-bottom: 3px solid transparent;
    flex-shrink: 0;
  }
  .sidebar-item.active { border-bottom-color: var(--accent); border-left-color: transparent; }

  .chart-container { height: 320px; }
  .chart-canvas-wrapper { height: 240px; }
}
```

---

## CDN-Imports (am Ende von `<body>`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
```

---

## `README.md`

````markdown
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
````

---

## Wichtige Implementierungshinweise

1. **Kein Build-Step** — reines HTML/CSS/JS, kein npm, kein Webpack
2. **`history.json` wird committed** — der einzige "Build"-Schritt ist das Python-Skript
3. **Spot-Wechsel ohne Seitenneuladen** — `history.pushState` + Chart destroy/recreate
4. **Chart.js destroy vor recreate** — immer `chart.destroy()` bevor neuer Chart erstellt wird
5. **`null`-Werte** im Array → Chart.js mit `spanGaps: false` — Lücken bleiben leer
6. **Alle Pfade relativ** — `./data/history.json` (nicht `/data/...`) für GitHub Pages Kompatibilität
7. **2025-Linie endet heute** — Array hat nur Werte bis Tag X, danach `null`, vertikale "Heute"-Linie zeigt wo
8. **Schaltjahr-Normalisierung** — Tag 60 (29. Feb) in Schaltjahren überspringen, damit alle Jahre 365 Einträge haben
9. **API Rate Limit** — 1 Sekunde Pause zwischen den 20 Spot-Anfragen in `fetch_history.py`
10. **Live-Fetch Timeout** — 8 Sekunden Timeout für Live-API-Calls, bei Fehler "–" anzeigen

---

*Erstellt für Claude Code. Alle Dateien in einem Ordner `kitewind/` anlegen.*
