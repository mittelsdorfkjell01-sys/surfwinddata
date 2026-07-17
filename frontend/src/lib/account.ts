// Dev mock of the (not-yet-built) public account backend. Everything lives in
// localStorage so the account pages work standalone in this frontend-first
// build. SWAP POINT: when the real API ships (separate public `users` table +
// app/auth session cookie), replace these bodies with fetch() calls — the
// signatures are chosen to line up with the planned endpoints.
//
// SECURITY: browser-only mock. Passwords are NOT stored securely (obscured, not
// hashed) — never ship this as the real auth. The real system reuses app/auth
// (hashed password + httpOnly session cookie).

export interface Account {
  id: string;
  email: string;
  displayName: string;
  createdAt: string; // ISO
}

export interface FavoriteSpot {
  id: string;
  name: string;
  region?: string | null;
  sports?: string[];
  addedAt: string;
}

export type SubmissionStatus = "pending" | "published" | "rejected";
export interface MySubmission {
  id: string;
  name: string;
  status: SubmissionStatus;
  createdAt: string;
}

/** Thrown for expected, user-facing failures (duplicate email, bad password …). */
export class AccountError extends Error {}

export const FAVORITES_EVENT = "swd:favorites";
export const SUBMISSIONS_EVENT = "swd:submissions";

const K = {
  users: "swd.account.users",
  session: "swd.account.session",
  fav: (uid: string) => `swd.account.fav.${uid}`,
  subs: (uid: string) => `swd.account.subs.${uid}`,
};

interface StoredUser extends Account {
  pw: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, val: unknown): void {
  localStorage.setItem(key, JSON.stringify(val));
}

// Mimic a small network round-trip so loading states are real.
const delay = () => new Promise((r) => setTimeout(r, 180));
const norm = (e: string) => e.trim().toLowerCase();
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
// NOT secure — obscures the password in devtools only. Mock-scope.
const obscure = (s: string) => btoa(unescape(encodeURIComponent(s)));

function allUsers(): StoredUser[] {
  return read<StoredUser[]>(K.users, []);
}
function saveUsers(u: StoredUser[]): void {
  write(K.users, u);
}
function toAccount(u: StoredUser): Account {
  const { pw: _pw, ...a } = u;
  return a;
}

// --- auth ------------------------------------------------------------------

export function currentAccount(): Account | null {
  const id = localStorage.getItem(K.session);
  if (!id) return null;
  const u = allUsers().find((x) => x.id === id);
  return u ? toAccount(u) : null;
}

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<Account> {
  await delay();
  const email = norm(input.email);
  if (!email.includes("@")) throw new AccountError("Bitte eine gültige E-Mail eingeben.");
  if (input.password.length < 6)
    throw new AccountError("Das Passwort muss mindestens 6 Zeichen haben.");
  const users = allUsers();
  if (users.some((u) => u.email === email))
    throw new AccountError("Für diese E-Mail existiert bereits ein Konto.");
  const user: StoredUser = {
    id: newId(),
    email,
    displayName: input.displayName.trim() || email.split("@")[0],
    createdAt: new Date().toISOString(),
    pw: obscure(input.password),
  };
  users.push(user);
  saveUsers(users);
  localStorage.setItem(K.session, user.id);
  return toAccount(user);
}

export async function login(input: { email: string; password: string }): Promise<Account> {
  await delay();
  const email = norm(input.email);
  const u = allUsers().find((x) => x.email === email);
  if (!u || u.pw !== obscure(input.password))
    throw new AccountError("E-Mail oder Passwort ist falsch.");
  localStorage.setItem(K.session, u.id);
  return toAccount(u);
}

export async function logout(): Promise<void> {
  await delay();
  localStorage.removeItem(K.session);
}

export async function updateProfile(patch: {
  displayName?: string;
  email?: string;
}): Promise<Account> {
  await delay();
  const cur = currentAccount();
  if (!cur) throw new AccountError("Nicht angemeldet.");
  const users = allUsers();
  const i = users.findIndex((u) => u.id === cur.id);
  if (i < 0) throw new AccountError("Konto nicht gefunden.");
  if (patch.email !== undefined) {
    const email = norm(patch.email);
    if (!email.includes("@")) throw new AccountError("Bitte eine gültige E-Mail eingeben.");
    if (users.some((u) => u.email === email && u.id !== cur.id))
      throw new AccountError("Diese E-Mail ist bereits vergeben.");
    users[i].email = email;
  }
  if (patch.displayName !== undefined)
    users[i].displayName = patch.displayName.trim() || users[i].displayName;
  saveUsers(users);
  return toAccount(users[i]);
}

export async function changePassword(oldPw: string, newPw: string): Promise<void> {
  await delay();
  const cur = currentAccount();
  if (!cur) throw new AccountError("Nicht angemeldet.");
  if (newPw.length < 6)
    throw new AccountError("Das neue Passwort muss mindestens 6 Zeichen haben.");
  const users = allUsers();
  const i = users.findIndex((u) => u.id === cur.id);
  if (i < 0 || users[i].pw !== obscure(oldPw))
    throw new AccountError("Das aktuelle Passwort ist falsch.");
  users[i].pw = obscure(newPw);
  saveUsers(users);
}

// --- favorites -------------------------------------------------------------

function requireUid(): string {
  const c = currentAccount();
  if (!c) throw new AccountError("Nicht angemeldet.");
  return c.id;
}

export function listFavorites(): FavoriteSpot[] {
  const c = currentAccount();
  return c ? read<FavoriteSpot[]>(K.fav(c.id), []) : [];
}

export function isFavorite(spotId: string): boolean {
  return listFavorites().some((f) => f.id === spotId);
}

/** Toggle a spot's favourite state. Returns the new state (true = now saved). */
export function toggleFavorite(spot: {
  id: string;
  name: string;
  region?: string | null;
  sports?: string[];
}): boolean {
  const uid = requireUid();
  const list = read<FavoriteSpot[]>(K.fav(uid), []);
  const idx = list.findIndex((f) => f.id === spot.id);
  let nowFav: boolean;
  if (idx >= 0) {
    list.splice(idx, 1);
    nowFav = false;
  } else {
    list.unshift({
      id: spot.id,
      name: spot.name,
      region: spot.region ?? null,
      sports: spot.sports ?? [],
      addedAt: new Date().toISOString(),
    });
    nowFav = true;
  }
  write(K.fav(uid), list);
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
  return nowFav;
}

export function removeFavorite(spotId: string): void {
  const c = currentAccount();
  if (!c) return;
  const list = read<FavoriteSpot[]>(K.fav(c.id), []).filter((f) => f.id !== spotId);
  write(K.fav(c.id), list);
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
}

// --- my submissions --------------------------------------------------------

export function listMySubmissions(): MySubmission[] {
  const c = currentAccount();
  return c ? read<MySubmission[]>(K.subs(c.id), []) : [];
}

/** Record a proposed spot. In the real build this fires after a successful
 *  POST /submissions and stores the server id + status. */
export async function addSubmission(name: string): Promise<MySubmission> {
  await delay();
  const uid = requireUid();
  const list = read<MySubmission[]>(K.subs(uid), []);
  const sub: MySubmission = {
    id: newId(),
    name: name.trim() || "Unbenannter Spot",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  list.unshift(sub);
  write(K.subs(uid), list);
  window.dispatchEvent(new CustomEvent(SUBMISSIONS_EVENT));
  return sub;
}
