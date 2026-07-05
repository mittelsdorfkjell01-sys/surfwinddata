// Holds the shared admin key (X-Admin-Key) for the current session only.
//
// This is a single shared secret, NOT a user-auth system: it is enough for an
// internal test operation (one trusted curator), but it does not distinguish
// editors or grant per-user rights. Deliberate limitation of this sprint.
//
// Kept in memory + mirrored to sessionStorage so it survives a page reload but
// is cleared when the tab closes (not localStorage — no long-lived secret).

const STORAGE_KEY = "swd_admin_key";

let inMemory: string | null = null;

export function getAdminKey(): string | null {
  if (inMemory !== null) return inMemory;
  try {
    inMemory = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    /* sessionStorage unavailable (e.g. SSR) — stay in memory only */
  }
  return inMemory;
}

export function setAdminKey(key: string): void {
  inMemory = key.trim() || null;
  try {
    if (inMemory) sessionStorage.setItem(STORAGE_KEY, inMemory);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function clearAdminKey(): void {
  setAdminKey("");
}

export function hasAdminKey(): boolean {
  return Boolean(getAdminKey());
}
