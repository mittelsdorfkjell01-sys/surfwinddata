// Adapters: backend forecast / climatology / region-season → the panel view
// models (ForecastDay / MonthWind / RegionMonth). Return null / empty when the
// backend has no data (e.g. a spot without a derived climatology) so the page
// can hide the panel instead of inventing numbers.

import type { ForecastSeries, RegionSeasonResponse } from "./api";
import type { ForecastDay, MonthWind, RegionMonth, WaterType } from "./types";

const WEEKDAYS = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"]; // Date.getDay(): 0 = Sun
const MONTHS = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];
const MONTHS_FULL = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const monthOfWeek = (week: number) => Math.min(11, Math.max(0, Math.floor(((week - 1) / 52) * 12)));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// Wind-speed bin lower edges (kt) of the climatology histogram — mirror of
// app/era5/bins.py WIND_SPEED_BINS_KT. Bins from STRONG_WIND_BIN up (>= 14 kt)
// count as "rideable" wind: enough to plane on a kite/board.
const WIND_SPEED_BINS_KT = [0, 6, 10, 14, 18, 25];
const STRONG_WIND_BIN = WIND_SPEED_BINS_KT.indexOf(14); // 3 → >= 14 kt

/** Climatology years from a "YYYY-YYYY" window string; 20 (the pipeline default)
 *  when it can't be parsed — only the absolute hours label depends on this, not
 *  the chart shape (the divisor is constant across weeks). */
function windowYears(window: unknown): number {
  const m = typeof window === "string" ? window.match(/(\d{4}).*?(\d{4})/) : null;
  if (m) {
    const n = Number(m[2]) - Number(m[1]) + 1;
    if (n > 0) return n;
  }
  return 20;
}

/** 7-day forecast → the strip's per-day view. */
export function forecastToDays(fc: ForecastSeries): ForecastDay[] {
  return fc.days.map((d) => {
    const dt = new Date(d.date);
    const day = Number.isNaN(dt.getTime()) ? d.date.slice(5) : WEEKDAYS[dt.getDay()];
    // Representative wind direction: prefer a midday hour, else the first known dir.
    const mid =
      d.hours.find((h) => h.time.includes("T12") && h.dir != null) ??
      d.hours.find((h) => h.dir != null);
    const wind = Math.round(d.summary.wind_max ?? d.summary.wind_avg ?? 0);
    return {
      day,
      wind,
      windDir: mid?.dir ?? 0,
      wave: Math.round((d.summary.swell_max ?? 0) * 10) / 10,
      good: wind >= 18, // simple visual cue; the real rating is the score engine
    };
  });
}

export function waterTypeFromCharacter(wc?: string | null): WaterType {
  if (wc === "flach" || wc === "tiefes_wasser") return "flat";
  if (wc === "welle_klein" || wc === "welle_gross") return "swell";
  return "chop";
}

/** Spot climatology → monthly bars of *rideable wind hours per week*, or null.
 *
 * For each week we sum the histogram hours across all directions in the wind
 * bins ≥ 14 kt and divide by the number of climatology years, giving an average
 * "hours of rideable wind per week". This surfaces the **windy season** — unlike
 * the near-flat median wind, which barely moves month to month. Returns null when
 * a spot has no usable histogram (so the panel hides instead of inventing data).
 */
export function climatologyToMonths(clim: Record<string, any> | null | undefined): MonthWind[] | null {
  const weeks = clim?.weeks;
  if (!Array.isArray(weeks) || weeks.length === 0) return null;
  const years = windowYears(clim?.window);
  const buckets: number[][] = Array.from({ length: 12 }, () => []);
  for (const w of weeks) {
    const joint = w?.wind?.joint;
    if (!Array.isArray(joint)) continue;
    // Hours (all directions) in the rideable ≥ 14 kt speed bins, per year.
    const strongHours = joint.reduce(
      (sum: number, row: number[]) =>
        sum +
        (Array.isArray(row)
          ? row.slice(STRONG_WIND_BIN).reduce((a, b) => a + (Number(b) || 0), 0)
          : 0),
      0
    );
    buckets[monthOfWeek(w.week ?? 0)].push(Math.round((strongHours / years) * 10) / 10);
  }
  const out: MonthWind[] = MONTHS.map((month, i) => ({
    month,
    weeks: buckets[i].length ? buckets[i] : [0],
  }));
  return out.some((m) => m.weeks.some((v) => v > 0)) ? out : null;
}

/** Region season aggregate → monthly "spots working" bars + peak months, or null. */
export function regionSeasonToView(
  resp: RegionSeasonResponse,
  totalSpots: number
): { season: RegionMonth[]; bestMonths: string[] } | null {
  const weeks = resp.season?.weeks;
  if (!Array.isArray(weeks) || weeks.length === 0) return null;

  const working: number[][] = Array.from({ length: 12 }, () => []);
  const wind: number[][] = Array.from({ length: 12 }, () => []);
  for (const w of weeks) {
    const m = monthOfWeek(w.week);
    if (typeof w.spots_working === "number") working[m].push(w.spots_working);
    if (typeof w.wind_p50 === "number") wind[m].push(w.wind_p50);
  }

  const season: RegionMonth[] = MONTHS.map((month, i) => ({
    month,
    working: Math.round(avg(working[i])),
    total: totalSpots,
    wind: Math.round(avg(wind[i]) * 10) / 10,
  }));

  // No signal at all (spots without climatology) → hide the panel.
  if (!season.some((m) => m.working > 0 || m.wind > 0)) return null;

  const peak = Math.max(...season.map((m) => m.working));
  const bestMonths =
    peak > 0
      ? season.map((m, i) => ({ m, i })).filter(({ m }) => m.working >= peak).map(({ i }) => MONTHS_FULL[i])
      : [];
  return { season, bestMonths };
}
