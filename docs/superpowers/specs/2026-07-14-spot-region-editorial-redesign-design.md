# Design-Spec: Spot- & Region-Seite — Editorial-Redesign („Travel-Journal")

**Datum:** 2026-07-14
**Status:** Freigegeben (Design), bereit für writing-plans
**Skills:** impeccable (Brand-/Editorial-Register), superpowers/brainstorming
**Branch-Basis:** `feature/ux-audit-remediation` (nutzt die dort eingeführten `ui/`-Primitive, `Footer`, `<main>`/`h1`, sr-only-Tabellen, globalen Fokus-Ring)

## 1. Ziel & Register

Die **Spot-Detailseite** (`frontend/src/pages/SpotDetail.tsx`) und die **Region-Detailseite**
(`frontend/src/pages/RegionDetail.tsx`) werden von einem dashboard-boxigen Raster in ein
**redaktionelles, bildstarkes „Travel-Journal"-Layout** überführt (Aesthetik-Referenz: Condé Nast
Traveler / Surf-Reisereportage). Register: **Brand/Editorial** (Design ist Teil des Produkts), aber
die funktionalen Daten-Module bleiben nutzbar.

**Entscheidungen (Brainstorming):**
- Ambition: **Editorial-Reimagining** (Layout neu gedacht, nicht nur Restyle).
- Bilder: **beide Zustände stark gestalten** — kein Fake-Foto in echte Records; das Honest-Prinzip
  der App bleibt. Fehlende Hero-Fotos werden gestalterisch aufgefangen.
- Module: **redaktionell verschlanken** erlaubt (zusammenfassen/umsortieren/kürzen).

## 2. Identity-Preservation (nicht ändern)

Bestehende Marken-Tokens bleiben (Identity-Preservation gewinnt vor Font-/Lane-Reflexen):
- Schrift **Poppins** (sans) + **MADE Mountain** nur fürs `surfwind data`-Wortzeichen.
- Farben **navy `#13335E` / brand-orange `#E0823C` / brand-teal `#1E6E7E` / cream `#FBF6EF` / muted / line`.
- Runde Ecken `rounded-2xl` (1rem) / `rounded-3xl` (1.5rem); Schatten `card`/`bar`/`pill`.
- Das „Editorial" entsteht aus **Layout, Bildführung, Pacing und Typo-Hierarchie**, NICHT aus einem
  neuen Display-Serif (die „Serif+Italic+Spalten+Mono-Labels"-Editorial-Masche ist bewusst vermieden —
  laut impeccable-Register die gesättigte AI-Falle).

## 3. Gemeinsames Editorial-System (neue/erweiterte Bausteine)

Neue kleine Präsentations-Primitive unter `frontend/src/components/editorial/`:
- **`EditorialHero`** — full-bleed Hero. Prop `image?`, `focal?`, `kicker`, `title`, `meta?`,
  `children?` (z. B. Live-Badge/Back-Button). Zwei Zustände:
  - *mit Foto:* cinematisch, Scrim-Gradient, `object-position` per Focal-Point, sanfter Load-Parallax/Scale.
  - *ohne Foto:* gestaltetes Marken-Farbfeld (navy→navy-soft/teal) + **animiertes Wind/Wellen-Motiv**
    (Reuse der `swd-*`-Keyframes) + großer Typo-Name. Kein „leerer Verlauf".
- **`Lede`** — breite Erzähl-Spalte: `max-width: 68ch`, `text-[17px] leading-relaxed`,
  `text-wrap: pretty`. Fällt auf einen ruhigen `text-muted`-Platzhalter zurück, wenn keine Beschreibung.
- **`FactRow`** — gelinete Inline-Fakten (dl/row), KEINE Karten-Boxen. Nimmt `{label, value}[]`.
- **`SectionBand`** — Full-Bleed-Sektion, `tone: "white" | "cream"`, fluides Vertikal-Padding
  (`clamp`), optional Überschrift + Intro. Reveal-on-Load (staggered, reduced-motion = Crossfade).
- **`ConditionsBand`** — mutiges „Bedingungen jetzt"-Band (ersetzt die `LiveConditions`-Box optisch).

Token-Ergänzungen (`tailwind.config.js` + ggf. `index.css`):
- Fluide **Display-Typo** für Hero-Titel: `clamp(2.5rem, 6vw, 5rem)`, Poppins 600/700,
  `letter-spacing ≥ -0.03em`, `text-wrap: balance`.
- Ein Editorial-Section-Spacing-Rhythmus (fluide `clamp`-Abstände).

**Motion:** Framer-Motion (bereits Dependency). Hero-Load + gestaffelte Section-Reveals; jede Reveal
passt zum Inhalt (kein Uniform-Reflex). Reveals bauen auf einem bereits sichtbaren Default auf
(Inhalt nicht per Klasse gaten). `@media (prefers-reduced-motion: reduce)` = Crossfade/instant.
Die animierte `SpotFlowMap` behält ihre Logik.

**Accessibility (erhalten/erweitern):** `<main>` + genau ein `h1` je Seite; sichtbarer Fokus-Ring
(bereits global); Diagramme behalten ihre `sr-only`-Datentabellen; Kontrast Lauftext ≥ 4.5:1
(Editorial-Lauftext dunkler als bisheriges `navy/75` prüfen); nicht-farbliche Cues bleiben.

## 4. Spot-Seite — neue Struktur (Verschlankung 7 → ~5 Sektionen)

1. **Hero** (`EditorialHero`): Region-Kicker (teal) · **großer Spot-Name** (Display-Clamp) ·
   **Live-Wind inline** als kleines Badge (`WindBadge`/Live). Zurück-Pill wie bisher. Breadcrumb
   dezent unter dem Hero.
2. **Lede + Fakten** (`SectionBand white`): `Lede` (Beschreibung) → `FactRow` mit den `SpotFacts`-Daten
   (Level · Wasserart · Untergrund · Ausrichtung · nutzbare Windrichtung) — inline statt `SpotFacts`-Grid.
3. **„Bedingungen jetzt"** (`ConditionsBand`, `SectionBand cream`): große Zahlen —
   Wind (+Böen), Welle (m + Periode), Wasser °C, Luft °C, Richtung (Kompass via `degToCompass`),
   Live-Puls-Dot. Daten aus `useSpotLive`. Ehrliches „—" pro fehlendem Wert; fehlt Live komplett →
   ruhiger Inline-Hinweis („Live momentan nicht verfügbar"), keine traurige Box.
4. **Signature-Karte** (`SectionBand white`, full-width): `SpotFlowMap` prominent + kurze Caption
   („Wind & Wellen an diesem Spot") + Mini-Legende. Animation unverändert.
5. **„Wann läuft's?"** (`SectionBand cream`) — **Verschlankung: Forecast + Windmonate zusammengelegt:**
   `Forecast` (7 Tage, cleaner restyled) **+** `WindMonths` (Jahres-Rhythmus, elegante Balkenreihe,
   `sr-only`-Tabelle bleibt). Nur gerendert, wenn Daten vorliegen.
6. **Vor Ort** (`SectionBand white`): `Facilities` als saubere Editorial-Icon-Liste (nur vorhandene),
   keine Box. Nur wenn Facilities vorhanden.
7. **Community** (ruhiger, zweispaltig) · **Ähnliche Spots** („weiterreisen"-Streifen) · `Footer`.

Consolidations: `LiveConditions` → `ConditionsBand` (Sektion 3); `Forecast` + `WindMonths` → eine
„Wann läuft's?"-Sektion (5). Funktion bleibt vollständig erhalten, nur redaktionell gruppiert.

## 5. Region-Seite — neue Struktur

1. **Hero** (`EditorialHero`): Land-Kicker · **großer Regionsname** · Spot-Anzahl als ruhige Zeile.
   Hero-Bild = Regionsbild, sonst erstes Spot-Bild, sonst Editorial-Fallback. Breadcrumb darunter.
2. **Lede** (`SectionBand white`): Editorial-Intro (`backendRegion.description`).
3. **„Reisezeit / Saison"** (`SectionBand cream`) — **Verschlankung: beste Wochen + `RegionSeason`
   zusammengelegt:** „wann hinfahren" als eine elegante Saison-Visualisierung (beste Monate + KW-Bänder).
4. **Die Spots (das Herz)** (`SectionBand white`): das Grid wird ein redaktioneller Guide —
   größere, bildstarke Spot-Cards (editorial-Variante), Sort/Filter (`SortDropdown`) als ruhige Toolbar.
5. **Auf der Karte** (editorial gerahmt) · **Ähnliche Regionen** · `Footer`.

Consolidation: beste Wochen + `RegionSeason` → eine „Reisezeit/Saison"-Sektion (3).

## 6. Bild-Fallback-Strategie (beide Zustände)

- Echte Records mit `image`/`hero`: Foto führt (cinematisch, Focal-Point).
- Ohne Foto: `EditorialHero`-Fallbackzustand (Farbfeld + animiertes Motiv + Typo). Der bestehende
  `SpotImage`-Fallback bleibt für kleine Kacheln; der Hero bekommt das reichere Editorial-Treatment.
- **Kein** externes Stock-/AI-Foto wird in echte Spot-/Region-Records geschrieben (Honest-Prinzip).

## 7. Betroffene Dateien

**Neu:** `frontend/src/components/editorial/{EditorialHero,Lede,FactRow,SectionBand,ConditionsBand}.tsx`
(+ `index.ts`).
**Umbau:** `pages/SpotDetail.tsx`, `pages/RegionDetail.tsx`.
**Restyle (Funktion bleibt):** `components/{Forecast,WindMonths,Facilities,RegionSeason,SpotCommunity,
SimilarSpots,SimilarRegions,SpotFacts,SpotCard}.tsx`, `SpotFlowMap` (nur Rahmung), `LiveConditions`
(Logik → `ConditionsBand`).
**Tokens:** `tailwind.config.js`, `index.css` (Display-Typo, Section-Spacing, ggf. Fallback-Hero-Motiv).
**Unangetastet:** Landing, MapView, Admin, API/Hooks/Datenschicht.

## 8. Out of Scope

- Keine Änderung an Datenmodell, API, Hooks, Scoring.
- Kein neuer Font, keine neue Markenfarbe.
- Landing/Karte/Admin bleiben unverändert.
- Keine echten Fotos in Records injizieren.

## 9. Akzeptanzkriterien

- Spot- & Region-Seite im Travel-Journal-Look; Marke (Font/Farben/Ecken) erkennbar konsistent zur Landing.
- Beide Bildzustände (mit/ohne Foto) sehen bewusst gestaltet aus — nie „leer/kaputt".
- Alle Fach-Funktionen erhalten (Live, animierte Karte, Forecast, Windmonate, Facilities, Community,
  Similar, Region-Saison, Spot-Grid + Sort/Filter, Karte).
- A11y erhalten: `<main>` + ein `h1`, sichtbarer Fokus, sr-only-Diagramm-Tabellen, reduced-motion-Alternativen,
  Lauftext-Kontrast ≥ 4.5:1.
- `tsc + vite build` grün; bestehende 26 vitest grün; kein Console-Fehler im Headless-Render.
- Verifikation per Headless-Render (Spot- & Region-Seite, mit und ohne Hero-Foto) gegen lokales Backend.
