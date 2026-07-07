// "Zuletzt gesucht" — a tiny localStorage-backed recent-search list for the
// landing search's "Wohin?" panel. Real app, so localStorage is fine.

export interface RecentItem {
  label: string;
  kind: "spot" | "region" | "text";
  id?: string;
  country?: string | null;
}

const KEY = "swd:recent-searches";
const MAX = 6;

export function getRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as RecentItem[]) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addRecent(item: RecentItem): void {
  if (!item.label.trim()) return;
  try {
    const next = [item, ...getRecent().filter((r) => r.label !== item.label)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — non-fatal */
  }
}
