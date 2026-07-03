// Placeholder detail data for the region page. Stand-ins only — the real
// aggregates (region season, spots_working per week, median wind/SST) come from
// the backend later (Sprint 6: /regions/{id}/season). Curated copy for
// Schleswig-Holstein, deterministic fallbacks for every other region so the
// page never looks empty.

import type { SpotFact } from "./spotDetail";
import { allSpots, regionSlug, type RegionInfo, type Spot } from "./spots";

const MONTHS = [
  "JAN", "FEB", "MÄR", "APR", "MAI", "JUN",
  "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ",
];
const MONTHS_FULL = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** Small deterministic hash so fallbacks differ per region but stay stable. */
const seedOf = (s: string) =>
  Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** A spot works this month once its mean wind clears this threshold (kts). */
const WORKING_KTS = 14;

/**
 * Monthly mean wind (kts) for one spot, as a seasonal curve. Same shape logic
 * as the spot page's Windmonate: the Baltic is windiest in spring & autumn,
 * calmest at midsummer, jittered per spot so the region has a real spread.
 */
function spotMonthlyWind(spot: Spot): number[] {
  const base =
    regionSlug(spot.region) === "schleswig-holstein"
      ? [18, 17, 16, 14, 11, 10, 9, 10, 13, 16, 18, 17]
      : MONTHS.map((_, i) => 9 + 8 * Math.abs(Math.sin((seedOf(spot.id) + i) * 0.7)));
  const off = (spot.wind - 16) * 0.5; // stronger spots lift the whole curve
  return base.map((b, i) =>
    Math.round((b + off + 1.6 * Math.sin(seedOf(spot.id) + i * 1.3)) * 10) / 10
  );
}

/** One month of the region-season chart ("Wann hinfahren"). */
export interface RegionMonth {
  month: string; // JAN…DEZ
  working: number; // # of spots that clear the working threshold
  total: number; // spots in the region
  wind: number; // median mean-wind across the region (kts)
}

export interface RegionDetail {
  description: string;
  character: string;
  facts: SpotFact[];
  season: RegionMonth[];
  /** Full month names of the region's peak window, e.g. ["April","Mai"]. */
  bestMonths: string[];
}

/** Aggregate the region's spots into a per-month season curve. */
function buildSeason(region: RegionInfo): RegionMonth[] {
  const curves = region.spots.map(spotMonthlyWind);
  return MONTHS.map((month, i) => {
    const winds = curves.map((c) => c[i]);
    return {
      month,
      working: winds.filter((w) => w >= WORKING_KTS).length,
      total: region.spots.length,
      wind: Math.round(median(winds) * 10) / 10,
    };
  });
}

/** Peak months = the best-working span, tie-broken by median wind. */
function bestMonths(season: RegionMonth[]): string[] {
  const peak = Math.max(...season.map((m) => m.working));
  return season
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.working >= Math.max(1, peak - (peak >= 4 ? 1 : 0)))
    .map(({ i }) => MONTHS_FULL[i]);
}

const SCHLESWIG_HOLSTEIN: Partial<RegionDetail> = {
  description:
    "Schleswig-Holstein zwischen Nord- und Ostsee ist Deutschlands verlässlichstes " +
    "Wind- und Wellenrevier: weite Sandstrände, stehtiefe Buchten und bei den " +
    "typischen West- bis Südwestlagen sauber angeströmte Spots. Ideal für Einsteiger " +
    "wie Fortgeschrittene — am windstärksten im Frühjahr und Herbst.",
  character: "Ostsee-Chop & flache Buchten · auflandiger SW–W-Wind",
};

/** All known regions, derived from the spot catalogue and de-duplicated. */
export function allRegions(): RegionInfo[] {
  const bySlug = new Map<string, Spot[]>();
  for (const s of allSpots) {
    const slug = regionSlug(s.region);
    (bySlug.get(slug) ?? bySlug.set(slug, []).get(slug)!).push(s);
  }
  return [...bySlug.entries()].map(([slug, spots]) => {
    const [name, country] = spots[0].region.split(",").map((p) => p.trim());
    const withCoords = spots.filter((s) => s.coords);
    const center: [number, number] = withCoords.length
      ? [
          withCoords.reduce((a, s) => a + s.coords![0], 0) / withCoords.length,
          withCoords.reduce((a, s) => a + s.coords![1], 0) / withCoords.length,
        ]
      : [46, 8];
    return { slug, name, country, spots, center };
  });
}

/** Mean wind across a region's spots — used for facts and similarity ranking. */
export const regionMeanWind = (region: RegionInfo) =>
  Math.round(region.spots.reduce((a, s) => a + s.wind, 0) / region.spots.length);

/** Full detail bundle for a region — curated for Schleswig-Holstein, else generated. */
export function getRegionDetail(region: RegionInfo): RegionDetail {
  const curated = region.slug === "schleswig-holstein" ? SCHLESWIG_HOLSTEIN : {};
  const season = buildSeason(region);
  const peak = bestMonths(season);
  const meanWind = regionMeanWind(region);
  const seed = seedOf(region.slug);

  const facts: SpotFact[] = [
    { label: "Spots", value: `${region.spots.length}` },
    { label: "Charakter", value: curated.character ?? "Chop & flache Buchten" },
    { label: "Typischer Wind", value: `Ø ${meanWind} kts` },
    { label: "Beste Reisezeit", value: peak[0] === peak[peak.length - 1] ? peak[0] : `${peak[0]} – ${peak[peak.length - 1]}` },
    { label: "Wassertemperatur", value: `${16 + (seed % 5)} – ${21 + (seed % 4)} °C` },
    { label: "Beste Windrichtung", value: "SW – W (auflandig)" },
  ];

  return {
    description:
      curated.description ??
      `${region.name} zählt zu den beliebten Wassersport-Revieren${
        region.country ? ` in ${region.country}` : ""
      }. Verlässlicher Wind, gute Infrastruktur und ein abwechslungsreicher Mix an ` +
        `Spots — vom flachen Einsteiger-Revier bis zum ambitionierten Wellen-Spot.`,
    character: curated.character ?? "Chop & flache Buchten · auflandiger Wind",
    facts,
    season,
    bestMonths: peak,
  };
}
