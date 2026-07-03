// Placeholder detail data for the spot page. Stand-ins only — the real
// records (facilities, community tips, forecast, climatology) come from the
// backend later. Curated copy for Porto Pollo, deterministic fallbacks for
// every other spot so the page never looks empty.

import type { Spot } from "./spots";

export type FacilityKind = "parking" | "school" | "shower" | "food";

export interface Facility {
  kind: FacilityKind;
  title: string;
  note: string;
}

export interface Tip {
  author: string;
  text: string;
}

/** One column of the 7-day forecast. */
export interface ForecastDay {
  day: string; // MON…SUN
  wind: number; // kts
  windDir: number; // degrees the wind comes FROM
  wave: number; // metres
  good?: boolean; // green dot in the mock
}

/** A single week's mean wind inside a month. */
export interface MonthWind {
  month: string; // JAN…DEZ
  weeks: number[]; // mean wind (kts) per week
}

/** "Right now" readings shown in the live-conditions strip. */
export interface LiveConditions {
  wind: number; // kts
  gust: number; // kts
  windDir: number; // degrees, comes FROM
  wave: number; // metres
  period: number; // s — swell period; drives the wave animation spacing/speed
  waterTemp: number; // °C
  airTemp: number; // °C
}

/** Spot character sheet (the "Steckbrief"). */
export interface SpotFact {
  label: string;
  value: string;
}

/** Water character — drives the wave animation on the spot map. */
export type WaterType = "flat" | "chop" | "swell";

export interface SpotDetail {
  description: string;
  breadcrumb: string[];
  live: LiveConditions;
  facts: SpotFact[];
  waterType: WaterType;
  facilities: Facility[];
  tips: Tip[];
  forecast: ForecastDay[];
  months: MonthWind[];
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTHS = [
  "JAN", "FEB", "MÄR", "APR", "MAI", "JUN",
  "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ",
];

const LABOE: Partial<SpotDetail> = {
  facts: [
    { label: "Wasser", value: "Chop & Kabbelwelle" },
    { label: "Untergrund", value: "Sand" },
    { label: "Level", value: "Beginner – Fortgeschritten" },
    { label: "Beste Windrichtung", value: "SW – W (auflandig)" },
    { label: "Beste Saison", value: "April – Juni & Sept – Okt" },
    { label: "Andrang", value: "Mittel (Wochenenden hoch)" },
  ],
  description:
    "Laboe an der Kieler Förde ist einer der verlässlichsten Kite- und Windsurf-Spots " +
    "Schleswig-Holsteins: weiter Sandstrand, stehtiefes Wasser und bei auflandigem " +
    "SW-Wind sauber angeströmt. Am windstärksten im Frühjahr und Herbst.",
  facilities: [
    { kind: "parking", title: "Parkplätze am Strand", note: "Kostenpflichtig, an Sommerwochenenden früh voll." },
    { kind: "school", title: "Kite- & Surfschule", note: "Verleih und Kurse direkt vor Ort." },
    { kind: "shower", title: "WC & Duschen", note: "Am Strandzugang und im Kurbereich." },
    { kind: "food", title: "Strandbar & Imbiss", note: "Gastronomie an der Promenade." },
  ],
  tips: [
    {
      author: "Sönke",
      text: "Bei Südwest steht der Wind sauber auf den Strand. Weiter Richtung " +
        "Leuchtturm wird es oft eine Ecke böiger, dafür hast du mehr Platz.",
    },
    {
      author: "Merle",
      text: "Im Sommer lohnt sich der Nachmittag: Wenn die Thermik mit dem " +
        "Seewind zusammenkommt, legt der Wind nochmal ein paar Knoten zu.",
    },
  ],
};

/** Small deterministic hash so fallbacks differ per spot but stay stable. */
const seedOf = (s: string) =>
  Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);

const DIRS8 = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
/** A rough "from–to" wind-direction band around a bearing, e.g. "W – NW". */
const degToCompassRange = (deg: number): string => {
  const i = Math.round(deg / 45) % 8;
  return `${DIRS8[(i + 7) % 8]} – ${DIRS8[i]}`;
};

function buildForecast(spot: Spot): ForecastDay[] {
  // Curated week for Laboe — Baltic chop, so waves stay small.
  if (spot.id === "laboe") {
    const dirs = [225, 250, 90, 240, 260, 300, 200];
    const winds = [22, 18, 12, 25, 20, 10, 14];
    const waves = [0.6, 0.4, 0.2, 0.8, 0.5, 0.15, 0.3];
    return DAYS.map((day, i) => ({
      day,
      wind: winds[i],
      windDir: dirs[i],
      wave: waves[i],
      good: winds[i] >= 18,
    }));
  }
  const seed = seedOf(spot.id);
  return DAYS.map((day, i) => {
    const wind = Math.round(spot.wind + 8 * Math.sin((seed + i * 1.7) * 1.3) + 3 * Math.cos(i));
    const w = Math.max(6, Math.min(30, wind));
    return {
      day,
      wind: w,
      windDir: ((spot.windDir ?? 270) + Math.round(30 * Math.sin(seed + i))) % 360,
      wave: Math.round(Math.max(0.1, w / 22 + 0.2 * Math.sin(seed + i)) * 10) / 10,
      good: w >= 18,
    };
  });
}

function buildMonths(spot: Spot): MonthWind[] {
  // Relative monthly strength; the Baltic is windiest in autumn/winter/spring.
  const profile =
    spot.id === "laboe"
      ? [18, 17, 16, 14, 11, 10, 9, 10, 13, 16, 18, 17]
      : MONTHS.map((_, i) => 8 + 9 * Math.abs(Math.sin((seedOf(spot.id) + i) * 0.7)));
  return MONTHS.map((month, i) => {
    const base = profile[i];
    // 4 weekly means jittered around the month's average.
    const weeks = Array.from({ length: 4 }, (_, w) =>
      Math.round((base + 2.4 * Math.sin(seedOf(month) + w * 1.9)) * 10) / 10
    );
    return { month, weeks };
  });
}

/** Typical swell period (s) per water character — short & choppy vs. long swell. */
const PERIOD_BY_TYPE: Record<WaterType, number> = { chop: 3.4, swell: 9.5, flat: 2.6 };

function buildLive(spot: Spot, waterType: WaterType): LiveConditions {
  const seed = seedOf(spot.id);
  return {
    wind: spot.wind,
    gust: Math.round(spot.wind * 1.35),
    windDir: spot.windDir ?? 320,
    // Gentle ~30 cm sea for Laboe; a touch of variation elsewhere.
    wave: spot.id === "laboe" ? 0.3 : Math.round((0.2 + (seed % 6) / 10) * 10) / 10,
    period: Math.round((PERIOD_BY_TYPE[waterType] + (seed % 5) * 0.2) * 10) / 10,
    waterTemp: 17 + (seed % 5), // 17–21 °C (Baltic summer)
    airTemp: 20 + (seed % 6), // 20–25 °C
  };
}

/** Read the water character out of the "Wasser" fact, for the wave animation. */
function waterTypeFromFacts(facts: SpotFact[]): WaterType {
  const w = facts.find((f) => f.label === "Wasser")?.value.toLowerCase() ?? "";
  if (w.includes("flach") && !w.includes("chop")) return "flat";
  if (w.includes("welle") && !w.includes("kabbel") && !w.includes("chop")) return "swell";
  return "chop";
}

/** Full detail bundle for a spot — curated for Porto Pollo, generated otherwise. */
export function getSpotDetail(spot: Spot): SpotDetail {
  const [regionName, country] = spot.region.split(",").map((p) => p.trim());
  const curated = spot.id === "laboe" ? LABOE : {};
  const facts = curated.facts ?? [
    { label: "Wasser", value: "Chop" },
    { label: "Untergrund", value: "Sand" },
    { label: "Level", value: "Beginner – Fortgeschritten" },
    { label: "Beste Windrichtung", value: degToCompassRange(spot.windDir ?? 270) },
    { label: "Beste Saison", value: "Mai – September" },
    { label: "Andrang", value: "Mittel" },
  ];

  const waterType = waterTypeFromFacts(facts);

  return {
    live: buildLive(spot, waterType),
    waterType,
    facts,
    description:
      curated.description ??
      `${spot.name} liegt in ${regionName} und zählt zu den beliebten Revieren der ` +
        `Region. Verlässlicher Wind, gute Infrastruktur und ein Spot-Charakter, der ` +
        `sowohl Einsteigern als auch Fortgeschrittenen entgegenkommt.`,
    breadcrumb: [country, regionName, spot.name].filter(Boolean),
    facilities: curated.facilities ?? [
      { kind: "parking", title: "Parkplätze", note: "In Strandnähe verfügbar." },
      { kind: "school", title: "Surfschule", note: "Verleih und Kurse vor Ort." },
      { kind: "shower", title: "WC & Duschen", note: "Am Strandzugang." },
      { kind: "food", title: "Gastronomie", note: "Bars und Kioske in der Nähe." },
    ],
    tips: curated.tips ?? [
      { author: "Community", text: "Beste Bedingungen bei auflandigem Wind — dann läuft der Spot am saubersten." },
    ],
    forecast: buildForecast(spot),
    months: buildMonths(spot),
  };
}
