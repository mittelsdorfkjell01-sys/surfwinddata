# SpotInfo — Frontend

React + Vite + TypeScript + Tailwind UI for the Surfwinddate ("SpotInfo") platform.
Two screens are implemented so far, built to match the design mockups:

- **`/` — Landing** (`src/pages/Landing.tsx`): hero + `WO? / WANN?` search card, then the
  "Top Spots" grid of spot cards.
- **`/map` — Map** (`src/pages/MapView.tsx`): full-screen Leaflet/OpenStreetMap with navy
  spot pins, an open preview popup, and a recommended-spots strip along the bottom.

The Wind / Welle / Wave toggle (centre of the header) is a three-position vertical switch:
`Welle` (wave), `Wind`, and `Wave` in the middle for spots that suit **both**.

## Placeholder data

Spot names, tags and images are **placeholders** (`src/data/spots.ts`) — image URLs use
`picsum.photos` and require network access to render. Wiring these to the backend
(`/search/best-spots`, `/map`) is a later step.

## Commands

```bash
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Structure

```
src/
  main.tsx              # router (/, /map)
  pages/                # Landing, MapView
  components/           # Header, SportToggle, SearchBar, SpotCard, MapSpotCard, ViewToggle, SpotBits
  lib/icons.tsx         # inline line icons
  data/spots.ts         # placeholder spots
```

Design tokens (navy, brand-green, muted, line + Poppins) live in `tailwind.config.js`.
