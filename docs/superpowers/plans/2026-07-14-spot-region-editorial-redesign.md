# Spot/Region Editorial-Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for this cohesive visual redesign) to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Spot- und Region-Detailseite in ein redaktionelles „Travel-Journal"-Layout überführen, ohne Funktion, Datenschicht oder Marke zu ändern.

**Architecture:** Ein kleiner Editorial-Primitive-Layer (`components/editorial/`) liefert Hero, Lede, Fakten-Reihe, Section-Band und Conditions-Band. Die beiden Seiten werden auf diese Primitive umgebaut; bestehende Fach-Module (Live, animierte Karte, Forecast, Windmonate, Facilities, Community, Similar, Region-Saison, Spot-Grid) bleiben funktional und werden nur eingepasst/restyled. Fluide Display-Typo + Section-Spacing als Tokens.

**Tech Stack:** React 18, TypeScript (strict, noUnusedLocals), Vite, Tailwind 3, framer-motion, react-leaflet. Verifikation: `npm run build`, `npm run test` (vitest), Headless-Render via Playwright (venv).

## Global Constraints

- Marke unverändert: Poppins + MADE Mountain (nur Wordmark); Farben navy `#13335E` / brand-orange `#E0823C` / brand-teal `#1E6E7E` / cream `#FBF6EF` / muted / line; Ecken `rounded-2xl`/`rounded-3xl`; Schatten `card`/`bar`/`pill`.
- Kein neuer Font, keine neue Markenfarbe, kein Display-Serif.
- Keine Änderung an API/Hooks/Datenmodell/Scoring. Landing/Map/Admin unangetastet.
- Keine echten Fotos in Records injizieren (Honest-Prinzip). Fehlende Hero-Bilder → gestalteter Editorial-Fallback.
- A11y erhalten: genau ein `<main>` + ein `h1` je Seite; sichtbarer Fokus (global); Diagramme behalten `sr-only`-Tabellen; `prefers-reduced-motion`-Alternativen; Lauftext-Kontrast ≥ 4.5:1.
- Jeder Task endet grün: `npm run build` + `npm run test`.
- Commit-Sprache/-Format wie im Repo; Co-Author-Zeile `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

- `frontend/tailwind.config.js` — Display-Typo-Token (`display-1`), Section-Spacing.
- `frontend/src/index.css` — Editorial-Utilities (Fallback-Hero-Motiv, `text-wrap`), reduced-motion.
- `frontend/src/components/editorial/SectionBand.tsx` — Full-Bleed-Sektion (tone white/cream, Reveal).
- `frontend/src/components/editorial/Lede.tsx` — Erzähl-Spalte (68ch, 17px).
- `frontend/src/components/editorial/FactRow.tsx` — geliente Inline-Fakten.
- `frontend/src/components/editorial/EditorialHero.tsx` — Hero mit Foto- und Fallback-Zustand.
- `frontend/src/components/editorial/ConditionsBand.tsx` — mutiges „Bedingungen jetzt"-Band.
- `frontend/src/components/editorial/index.ts` — Barrel.
- `frontend/src/pages/SpotDetail.tsx` — Umbau auf Primitive.
- `frontend/src/pages/RegionDetail.tsx` — Umbau auf Primitive.
- `frontend/src/components/SpotCard.tsx` — editorial-Variante fürs Region-Grid (Prop `variant`).
- Restyle-in-place (Funktion bleibt): `Forecast.tsx`, `WindMonths.tsx`, `Facilities.tsx`, `RegionSeason.tsx`, `SpotCommunity.tsx`, `SimilarSpots.tsx`, `SimilarRegions.tsx`.

---

## Task 1: Design-Tokens (Display-Typo + Section-Spacing)

**Files:**
- Modify: `frontend/tailwind.config.js` (theme.extend.fontSize + spacing)
- Modify: `frontend/src/index.css` (@layer utilities: `.text-balance`, `.text-pretty`, Fallback-Hero-Motiv)

**Interfaces:**
- Produces: Tailwind-Klasse `text-display-1` (fluid clamp Hero-Titel); Utilities `.text-balance`, `.text-pretty`; CSS-Klasse `.editorial-hero-fallback` (Farbfeld-Hintergrund).

- [ ] **Step 1:** In `tailwind.config.js` unter `theme.extend.fontSize` ergänzen:
  ```js
  "display-1": ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
  "display-2": ["clamp(1.75rem, 3.5vw, 2.75rem)", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
  ```
- [ ] **Step 2:** In `index.css` `@layer utilities` ergänzen:
  ```css
  .text-balance { text-wrap: balance; }
  .text-pretty { text-wrap: pretty; }
  /* Editorial-Fallback-Hero: Marken-Farbfeld statt leerem Verlauf */
  .editorial-hero-fallback {
    background:
      radial-gradient(120% 100% at 15% 0%, rgba(30,110,126,0.55), transparent 60%),
      linear-gradient(160deg, #13335E 0%, #2C4E7E 55%, #1E6E7E 100%);
  }
  ```
- [ ] **Step 3:** `npm run build` → grün (keine unbenutzten Tokens brechen den Build; Tailwind generiert nur genutzte Klassen).
- [ ] **Step 4:** Commit: `git add frontend/tailwind.config.js frontend/src/index.css && git commit -m "feat(editorial): display type + section tokens"`

---

## Task 2: Editorial-Primitive (SectionBand, Lede, FactRow, EditorialHero, ConditionsBand)

**Files:**
- Create: die 5 Komponenten unter `frontend/src/components/editorial/` + `index.ts`

**Interfaces (Produces — von Task 3/4 konsumiert):**
- `SectionBand({ tone?: "white" | "cream"; children; className?; heading?; intro? })`
- `Lede({ children: ReactNode })` — rendert Erzähl-Spalte; leerer/`undefined` Inhalt → muted-Platzhalter.
- `FactRow({ items: { label: string; value: string }[] })` — rendert nichts bei leerer Liste.
- `EditorialHero({ image?; focal?; alt; kicker?; title; meta?; children? })` — Foto- oder Fallback-Zustand.
- `ConditionsBand({ live: LiveConditionsRead | null })` — großes Live-Band; `null` → Inline-Hinweis.

- [ ] **Step 1:** `SectionBand.tsx` schreiben (framer-motion Reveal, reduced-motion via `useReducedMotion`, `tone` → bg white/cream, fluides `py-[clamp(...)]`, optional `heading` (`text-display-2`) + `intro`).
- [ ] **Step 2:** `Lede.tsx` schreiben (`max-w-[68ch] text-[17px] leading-relaxed text-pretty text-navy/80`; Kontrast prüfen: navy/80 auf weiß ≥ 4.5:1 → ok).
- [ ] **Step 3:** `FactRow.tsx` schreiben (`<dl>` als Flex-Wrap-Reihe mit gelinten Trennern; `<dt>` muted caption, `<dd>` navy medium).
- [ ] **Step 4:** `EditorialHero.tsx` schreiben. Foto-Zustand: `HeroImage`/`<img>` mit `focal` + Scrim-Gradient + Load-Scale (framer). Fallback: `div.editorial-hero-fallback` + wiederverwendete `swd-*`-Animation (importiere/rendere ein leichtgewichtiges Wind-Streifen-Overlay; reduced-motion aus). Overlay-Content: `kicker` (teal, klein), `title` (`text-display-1 text-balance`), `meta`, plus `children` (Back-Pill/Live-Badge).
- [ ] **Step 5:** `ConditionsBand.tsx` schreiben — großes Band: Wind (`text-display-2`) + Böen, Welle (m + Periode), Wasser °C, Luft °C, Richtung (`degToCompass` aus `WindRose`), Live-Puls-Dot. Werte aus `live.current`; fehlender Einzelwert → „—"; `live === null` → ruhiger Inline-Satz „Live-Bedingungen momentan nicht verfügbar."
- [ ] **Step 6:** `index.ts` Barrel exportiert alle 5.
- [ ] **Step 7:** `npm run build` → grün.
- [ ] **Step 8:** Commit: `git add frontend/src/components/editorial && git commit -m "feat(editorial): hero, lede, fact-row, section-band, conditions-band primitives"`

---

## Task 3: SpotDetail auf Editorial-Struktur umbauen

**Files:**
- Modify: `frontend/src/pages/SpotDetail.tsx`
- Restyle-in-place nach Bedarf: `Forecast.tsx`, `WindMonths.tsx`, `Facilities.tsx`, `SpotCommunity.tsx`, `SimilarSpots.tsx`

**Interfaces:** Consumes alle Primitive aus Task 2. Datenquellen unverändert: `useSpot`, `useSpotLive`, `useSpotForecast` + `spotFactsFrom`, `facilitiesFromMap`, `climatologyToMonths`, `forecastToDays`, `waterTypeFromCharacter`.

Neue Section-Reihenfolge (Spec §4): `<main>` mit
1. `EditorialHero` (image=`spot.hero`, kicker=Region, title=`spot.name`, meta=Region-Link; children=Back-Pill + Live-`WindBadge`). Danach Breadcrumb (dezent).
2. `SectionBand white`: `Lede`(description) + `FactRow`(aus `spotFactsFrom`).
3. `SectionBand cream`: `ConditionsBand` (live aus `useSpotLive`).
4. `SectionBand white` full-width: `SpotFlowMap` + Caption + Legende (Karte unverändert).
5. `SectionBand cream` „Wann läuft's?": `Forecast` + `WindMonths` (nur wenn Daten). Beide restyled, `sr-only`-Tabellen bleiben.
6. `SectionBand white` „Vor Ort": `Facilities` (nur wenn vorhanden).
7. `SpotCommunity` (ruhiger) + `SimilarSpots` + `Footer`.

- [ ] **Step 1:** Loading/Error/Not-found-Branches beibehalten (nur Hero-Skeleton ans neue Layout anpassen).
- [ ] **Step 2:** Erfolgs-Return auf die 7 Sektionen umbauen; genau ein `h1` (im `EditorialHero`), ein `<main>`. Breadcrumb behalten.
- [ ] **Step 3:** `Forecast.tsx` / `WindMonths.tsx` optisch ins Band einpassen (Abstände/Überschriften; Logik + `sr-only`-Tabelle unverändert).
- [ ] **Step 4:** `Facilities.tsx` / `SpotCommunity.tsx` / `SimilarSpots.tsx` ruhiger einpassen (Karten-Boxigkeit reduzieren).
- [ ] **Step 5:** `npm run build` + `npm run test` → grün.
- [ ] **Step 6:** Headless-Render Spot-Seite (mit Foto + ein Spot ohne Foto): Heading vorhanden, kein Fehlbanner, kein Console-Error, beide Bildzustände gestaltet. (Script: siehe Task 6.)
- [ ] **Step 7:** Commit: `git add -A frontend/src && git commit -m "feat(spot): editorial redesign of spot detail page"`

---

## Task 4: RegionDetail auf Editorial-Struktur umbauen

**Files:**
- Modify: `frontend/src/pages/RegionDetail.tsx`
- Restyle-in-place: `RegionSeason.tsx`, `SimilarRegions.tsx`; `SpotCard.tsx` (editorial-Variante, s. Task 5)

Neue Struktur (Spec §5): `<main>` mit
1. `EditorialHero` (image=Regionsbild→erstes Spot-Bild→Fallback, kicker=Land, title=Regionsname, meta=Spot-Anzahl). Breadcrumb darunter.
2. `SectionBand white`: `Lede`(region description).
3. `SectionBand cream` „Reisezeit/Saison": beste Wochen + `RegionSeason` zusammengelegt.
4. `SectionBand white` „Die Spots": Grid aus `SpotCard variant="editorial"` + `SortDropdown` als ruhige Toolbar (Filter/Sort-Logik unverändert).
5. `SectionBand white` „Auf der Karte": Leaflet-Karte editorial gerahmt (unverändert). + `SimilarRegions` + `Footer`.

- [ ] **Step 1:** Loading/Error/Not-found beibehalten.
- [ ] **Step 2:** Erfolgs-Return umbauen; ein `<main>` + ein `h1` (im Hero).
- [ ] **Step 3:** `RegionSeason.tsx` in die „Reisezeit"-Sektion einpassen (beste Wochen + Saison, eine Visualisierung).
- [ ] **Step 4:** `npm run build` + `npm run test` → grün.
- [ ] **Step 5:** Headless-Render Region-Seite: Heading, kein Fehlbanner, kein Console-Error.
- [ ] **Step 6:** Commit: `git add -A frontend/src && git commit -m "feat(region): editorial redesign of region detail page"`

---

## Task 5: SpotCard editorial-Variante (Region-Grid)

**Files:**
- Modify: `frontend/src/components/SpotCard.tsx`

**Interfaces:** `SpotCard({ spot, variant?: "default" | "editorial" })`. `default` = heutiges Verhalten (Landing/Suche unverändert). `editorial` = größeres, bildstärkeres Kachel-Treatment fürs Region-Grid.

- [ ] **Step 1:** `variant`-Prop einführen, Default = bisheriges Markup (keine Regression auf Landing).
- [ ] **Step 2:** `editorial`-Zweig: größeres Bild-Aspekt, kräftigere Typo, ruhigere Meta.
- [ ] **Step 3:** `npm run build` + `npm run test` → grün.
- [ ] **Step 4:** Commit: `git add frontend/src/components/SpotCard.tsx && git commit -m "feat(spot-card): editorial variant for region grid"`

---

## Task 6: Verifikations- & Politur-Pass

**Files:** ggf. kleine Fixes in den o. g. Dateien; Render-Script im Scratchpad.

- [ ] **Step 1:** Lokales Backend sicherstellen (Docker DB + uvicorn + Seed) — siehe Session-Setup.
- [ ] **Step 2:** Headless-Render (Playwright, venv) für: Spot mit Foto, Spot ohne Foto, Region. Prüfen: genau ein `h1` und ein `<main>` je Seite; kein Console-Error; kein Fehlbanner; `sr-only`-Tabellen in Forecast/WindMonths vorhanden; Screenshots ablegen.
- [ ] **Step 3:** Reduced-motion-Check: mit `prefers-reduced-motion: reduce` rendern → keine laufenden Animationen (Crossfade/instant).
- [ ] **Step 4:** Kontrast-Spot-Check des Editorial-Lauftexts (≥ 4.5:1).
- [ ] **Step 5:** `npm run build` + `npm run test` final grün.
- [ ] **Step 6:** Commit etwaiger Fixes: `git commit -m "polish(editorial): verification fixes"`

---

## Self-Review (gegen Spec)

- **Coverage:** Hero/Lede/Fakten/Conditions/FlowMap/Timing/Facilities/Community/Similar (Spot) → Tasks 1–3, 6. Region Hero/Lede/Saison/Spots/Karte/Similar → Tasks 1,2,4,5,6. Tokens → Task 1. Bild-Fallback → Task 2 (EditorialHero). Verschlankungen (Forecast+Windmonate; Live→Band; beste Wochen+Saison) → Tasks 3,4. A11y/Verifikation → Task 6. Keine Lücke.
- **Placeholder-Scan:** keine „TBD/TODO"; Verifikation ist konkret (build/test/render).
- **Typkonsistenz:** Primitive-Signaturen in Task 2 = Konsum in Tasks 3/4; `variant`-Prop in Task 5 = Nutzung in Task 4.

Bekannte Domänen-Anpassung: TDD-„failing test zuerst" ist für dieses rein visuelle Redesign durch build/test/Headless-Render-Gates ersetzt (dokumentiert oben).
