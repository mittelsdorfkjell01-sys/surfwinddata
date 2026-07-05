// Thin, typed fetch wrapper around the Surfwinddate FastAPI backend.
// Base URL comes from VITE_API_URL (default http://localhost:8000). Every call
// returns typed data or throws an ApiError the UI can surface.

import { getAdminKey } from "./adminKey";

export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Resolve a possibly root-relative URL (e.g. "/media/…") against the API host. */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}

// --- backend shapes --------------------------------------------------------

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface ImageRecord {
  url: string;
  source?: string;
  license?: string;
  credit?: string;
}

export type FacilityKind = "parking" | "shower" | "food" | "camping" | "school";
export type FacilityMap = Partial<
  Record<FacilityKind, { available: boolean; note?: string }>
>;

export interface SpotSummary {
  id: string;
  slug: string;
  name: string;
  region_id: string;
  location: GeoPoint | null;
  sports: string[];
  water_type: string | null;
  bottom_type: string | null;
  level: string | null;
  water_character: string | null;
  style: string[];
  facilities: FacilityMap | null;
  status: string;
  confidence: number | null;
  facing: number | null;
  image: ImageRecord | null;
}

export interface SpotRead extends SpotSummary {
  era5_cell: Record<string, unknown> | null;
  model_pref: string | null;
  editorial: Record<string, any> | null;
  climatology: Record<string, any> | null;
  overrides: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Region {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  center: GeoPoint | null;
  description: string | null;
  image: ImageRecord | null;
  season: Record<string, any> | null;
  defaults: Record<string, any> | null;
}

export interface CurrentConditions {
  wind: number | null;
  gust: number | null;
  dir: number | null;
  air: number | null;
  sst: number | null;
  swell: number | null;
  period: number | null;
  swell_dir: number | null;
}

export interface LiveConditionsRead {
  spot_id: string;
  model: string;
  time: string | null;
  current: CurrentConditions;
}

export interface ForecastDaySummary {
  wind_avg: number | null;
  wind_max: number | null;
  gust_max: number | null;
  air_min: number | null;
  air_max: number | null;
  swell_max: number | null;
}
export interface ForecastHour {
  time: string;
  wind: number | null;
  gust: number | null;
  dir: number | null;
  air: number | null;
  swell: number | null;
  period: number | null;
  swell_dir: number | null;
}
export interface ForecastDay {
  date: string;
  confidence: string;
  summary: ForecastDaySummary;
  hours: ForecastHour[];
}
export interface ForecastSeries {
  spot_id: string;
  model: string;
  generated_at: string;
  days: ForecastDay[];
}

export interface SpotSeason {
  stage: number;
  spot_id: string;
  [k: string]: unknown;
}

export interface RegionSeasonResponse {
  region_id: string;
  season: {
    weeks?: Array<{
      week: number;
      spots_working?: number;
      wind_p50?: number | null;
      sst_p50?: number | null;
      air_p50?: number | null;
    }>;
    [k: string]: unknown;
  };
}

export interface ReadinessItem {
  field: string;
  severity: string;
  ok: boolean;
  na: boolean;
}

export interface Readiness {
  spot_id: string;
  status: string;
  ready: boolean;
  checklist: ReadinessItem[];
  gaps: string[];
}

// --- request core ----------------------------------------------------------

const REQUEST_TIMEOUT_MS = 15000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...((init?.headers as Record<string, string>) || {}),
  };
  // Admin endpoints carry the shared key when one has been entered this session.
  if (path.startsWith("/admin")) {
    const key = getAdminKey();
    if (key) headers["X-Admin-Key"] = key;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    throw new ApiError(
      aborted
        ? "Zeitüberschreitung — der Server hat nicht rechtzeitig geantwortet."
        : "Verbindung zum Server fehlgeschlagen. Läuft das Backend?",
      0,
      e
    );
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    let detail: unknown = null;
    try {
      detail = await resp.json();
    } catch {
      /* non-JSON error body */
    }
    const msg =
      (detail && typeof detail === "object" && "detail" in detail
        ? typeof (detail as any).detail === "string"
          ? (detail as any).detail
          : JSON.stringify((detail as any).detail)
        : null) || `Anfrage fehlgeschlagen (${resp.status}).`;
    throw new ApiError(msg, resp.status, detail);
  }
  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// --- public endpoints ------------------------------------------------------

export interface SpotQuery {
  region_id?: string;
  status?: string;
  sport?: string;
  level?: string;
  water_character?: string;
  style?: string[];
  limit?: number;
  offset?: number;
}

export const getSpots = (params: SpotQuery = {}) =>
  request<SpotSummary[]>(`/spots${qs(params as Record<string, unknown>)}`);

export const getSpot = (id: string) => request<SpotRead>(`/spots/${id}`);

export const getSpotLive = (id: string) =>
  request<LiveConditionsRead>(`/spots/${id}/live`);

export const getRegions = () => request<Region[]>(`/regions`);

export const getRegion = (id: string) => request<Region>(`/regions/${id}`);

export async function getRegionBySlug(slug: string): Promise<Region | undefined> {
  const regions = await getRegions();
  return regions.find((r) => r.slug === slug);
}

export const getSpotForecast = (id: string, days?: number) =>
  request<ForecastSeries>(`/spots/${id}/forecast${qs({ days })}`);

/** Stage-2 season curve: pct_usable[52] + flagged good weeks. */
export const getSpotSeason = (id: string, sport?: string) =>
  request<SpotSeason>(`/spots/${id}/season${qs({ stage: 2, sport })}`);

export const getRegionSeason = (id: string, sport?: string) =>
  request<RegionSeasonResponse>(`/regions/${id}/season${qs({ sport })}`);

// --- search ----------------------------------------------------------------

export interface SearchSpot {
  id: string;
  slug: string;
  name: string;
  location: GeoPoint;
  sports: string[];
  score?: number | null;
  distance_m?: number | null;
}

export interface SearchRegionHit {
  id: string;
  slug: string;
  name: string;
  center: GeoPoint | null;
}

export interface SearchResult {
  resolved: string; // entities | point | area | none
  regionen: SearchRegionHit[];
  spots: SearchSpot[];
  treffer: number;
  geocode?: { type: string; name: string } | null;
}

export interface SearchQuery {
  q: string;
  sport?: string;
  week?: number;
  level?: string;
}

export const getSearch = (params: SearchQuery) =>
  request<SearchResult>(`/search${qs(params as unknown as Record<string, unknown>)}`);

// Open axes (Sprint 6 backend). Shapes are permissive — the UI only needs a few
// fields and tolerates the rest.
export interface BestRegionsResponse {
  regions?: Array<{ id?: string; slug?: string; name?: string; coverage?: number; intensity?: number }>;
  window?: unknown;
  [k: string]: unknown;
}
export interface BestWeeksResponse {
  weeks?: Array<{ week: number; score?: number; spots_working?: number }>;
  [k: string]: unknown;
}

export const getBestRegions = (params: { sport?: string; month?: number; weeks?: string; limit?: number } = {}) =>
  request<BestRegionsResponse>(`/search/best-regions${qs(params as Record<string, unknown>)}`);

export const getBestWeeks = (params: { region_id?: string; spot_id?: string; sport?: string; top?: number }) =>
  request<BestWeeksResponse>(`/areas/best-weeks${qs(params as Record<string, unknown>)}`);

// --- admin endpoints -------------------------------------------------------

export interface SpotCreateBody {
  name: string;
  region_id: string;
  lat: number;
  lon: number;
  sports?: string[];
  slug?: string;
  water_type?: string | null;
  bottom_type?: string | null;
  level?: string | null;
  water_character?: string | null;
  style?: string[];
  facilities?: FacilityMap | null;
  facing?: number | null;
  editorial?: Record<string, any> | null;
}

export type SpotUpdateBody = Partial<SpotCreateBody>;

export const createSpot = (body: SpotCreateBody) =>
  request<SpotRead>(`/admin/spots`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateSpot = (id: string, body: SpotUpdateBody) =>
  request<SpotRead>(`/admin/spots/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const getReadiness = (id: string) =>
  request<Readiness>(`/admin/spots/${id}/readiness`);

export async function uploadHeroImage(
  id: string,
  file: File,
  credit: string
): Promise<SpotRead> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("credit", credit);
  return request<SpotRead>(`/admin/spots/${id}/image/upload`, {
    method: "POST",
    body: fd,
  });
}
