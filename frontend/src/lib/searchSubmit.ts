// The landing search's value model + how it maps onto the backend `/search`
// query. IMPORTANT: the existing /search endpoint (see getSearch in api.ts) only
// understands `q`, a single `sport`, one `week`, and `level`. Richer inputs
// (multiple sports, a real date range) are sent through as extra params but are
// marked `// TODO backend` — they are NOT invented endpoints, just forward-compat
// hints the current backend ignores.

export type WhenValue =
  | { mode: "month"; month: number } // 1..12
  | { mode: "range"; from: string; to?: string } // yyyy-mm-dd
  | null;

export interface WhereSelection {
  label: string;
  kind: "spot" | "region";
  id?: string;
}

export interface SearchValue {
  whereText: string;
  whereSel: WhereSelection | null;
  when: WhenValue;
  which: string[]; // backend sport values: surf | kitesurf | windsurf | wing
}

export const EMPTY_SEARCH: SearchValue = {
  whereText: "",
  whereSel: null,
  when: null,
  which: [],
};

/** ISO-8601 week number (1..53) for a date. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Thursday of this ISO week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

/** Representative week for a month (its 15th) — used when only a month is chosen. */
export function weekOfMonth(month1to12: number, year = new Date().getFullYear()): number {
  return isoWeek(new Date(year, month1to12 - 1, 15));
}

export function weekFromWhen(when: WhenValue): number | undefined {
  if (!when) return undefined;
  if (when.mode === "month") return weekOfMonth(when.month);
  if (when.mode === "range" && when.from) return isoWeek(new Date(when.from));
  return undefined;
}

/** Build the /search query params from the full search value. */
export function buildSearchParams(v: SearchValue): URLSearchParams {
  const p = new URLSearchParams();

  const q = (v.whereSel?.label ?? v.whereText).trim();
  if (q) p.set("q", q);

  // /search takes a single sport → use the first selected discipline.
  if (v.which.length) p.set("sport", v.which[0]);

  const week = weekFromWhen(v.when);
  if (week) p.set("week", String(week));

  // Richer inputs, forwarded for future backend support (currently unread):
  if (v.which.length > 1) p.set("sports", v.which.join(",")); // TODO backend
  if (v.when?.mode === "range") {
    p.set("from", v.when.from); // TODO backend
    if (v.when.to) p.set("to", v.when.to); // TODO backend
  }
  return p;
}

/** Human-readable summary of a `when` value for the collapsed segment. */
const MONTHS_FULL = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
export function whenLabel(when: WhenValue): string {
  if (!when) return "";
  if (when.mode === "month") return MONTHS_FULL[when.month - 1];
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  };
  return when.to ? `${fmt(when.from)} – ${fmt(when.to)}` : fmt(when.from);
}
