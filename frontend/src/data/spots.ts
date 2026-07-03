// Placeholder spot data. Images, names and tags are stand-ins only
// (per the brief) — the real records come from the backend later.

export type TagKind = "wave" | "level" | "water";

export interface Tag {
  label: string;
  kind: TagKind;
}

export interface Spot {
  id: string;
  name: string;
  region: string;
  wind: number; // kts
  favorite?: boolean;
  tags: Tag[];
  image: string;
  /** Full-bleed hero image for the spot detail page (falls back to `image`). */
  hero?: string;
  /** [lat, lng] — used on the map + spot detail views */
  coords?: [number, number];
  /** Degrees the wind comes FROM (0 = N, 90 = E). Meteorological convention. */
  windDir?: number;
  /** Degrees the swell comes FROM. */
  waveDir?: number;
  /** Onshore bearing (0 = N): the direction waves travel to break on the beach.
   *  Drives the wave animation. Falls back to waveDir + 180 when unset. */
  coast?: number;
}

/** Deterministic placeholder image so each card is stable and distinct. */
const img = (seed: string) =>
  `https://picsum.photos/seed/swd-${seed}/640/440`;

const kiteTags: Tag[] = [
  { label: "Welle", kind: "wave" },
  { label: "Beginner", kind: "level" },
  { label: "Flachwasser", kind: "water" },
];

/** Landing — "aktuelle Topspots" grid (placeholders). */
export const topSpots: Spot[] = [
  { id: "laboe", name: "Laboe", region: "Schleswig-Holstein, Deutschland", wind: 17, tags: kiteTags, image: img("laboe"), hero: "/hero-laboe.jpeg", coords: [54.41, 10.22], windDir: 270, waveDir: 70, coast: 250 },
  { id: "fehmarn", name: "Fehmarn", region: "Schleswig-Holstein, Deutschland", wind: 19, tags: kiteTags, image: img("fehmarn"), coords: [54.44, 11.19], windDir: 225, waveDir: 250 },
  { id: "heiligenhafen", name: "Heiligenhafen", region: "Schleswig-Holstein, Deutschland", wind: 16, favorite: true, tags: kiteTags, image: img("heilig"), coords: [54.37, 10.98], windDir: 315, waveDir: 340 },
  { id: "damp", name: "Damp", region: "Schleswig-Holstein, Deutschland", wind: 18, tags: kiteTags, image: img("damp"), coords: [54.58, 9.90], windDir: 200, waveDir: 220 },
  { id: "grossenbrode", name: "Großenbrode", region: "Schleswig-Holstein, Deutschland", wind: 15, tags: [kiteTags[1], kiteTags[2]], image: img("grossen"), coords: [54.37, 11.09], windDir: 250, waveDir: 270 },
  { id: "wulfen", name: "Wulfener Hals", region: "Schleswig-Holstein, Deutschland", wind: 20, tags: kiteTags, image: img("wulfen"), coords: [54.40, 11.18], windDir: 240, waveDir: 260 },
  { id: "gluecksburg", name: "Glücksburg", region: "Schleswig-Holstein, Deutschland", wind: 14, tags: kiteTags, image: img("glueck"), coords: [54.83, 9.55], windDir: 290, waveDir: 310 },
  { id: "eckernfoerde", name: "Eckernförde", region: "Schleswig-Holstein, Deutschland", wind: 17, tags: kiteTags, image: img("eckern"), coords: [54.47, 9.84], windDir: 210, waveDir: 200 },
];

/** Map view — pins + the recommended strip along the bottom (placeholders). */
export const mapSpots: Spot[] = [
  { id: "peonia", name: "Peonia Rosa", region: "Sardinien, Italien", wind: 9, tags: [], image: img("peonia"), coords: [39.2, 8.4], windDir: 315, waveDir: 290 },
  { id: "porto-pollo", name: "Porto Pollo", region: "Sardinien, Italien", wind: 12, tags: [], image: img("pollo"), coords: [41.18, 9.32], windDir: 320, waveDir: 300 },
  { id: "bonifacio", name: "Bonifacio", region: "Korsika, Frankreich", wind: 14, tags: [], image: img("bonif"), coords: [41.39, 9.16], windDir: 300, waveDir: 280 },
  { id: "ajaccio", name: "Ajaccio", region: "Korsika, Frankreich", wind: 11, tags: [], image: img("ajac"), coords: [41.92, 8.74], windDir: 260, waveDir: 250 },
  { id: "chia", name: "Chia", region: "Sardinien, Italien", wind: 10, tags: [], image: img("chia"), coords: [38.89, 8.86], windDir: 340, waveDir: 320 },
  { id: "gaeta", name: "Gaeta", region: "Latium, Italien", wind: 8, tags: [], image: img("gaeta"), coords: [41.21, 13.57], windDir: 200, waveDir: 210 },
  { id: "san-vito", name: "San Vito lo Capo", region: "Sizilien, Italien", wind: 13, tags: [], image: img("sanvito"), coords: [38.17, 12.73], windDir: 20, waveDir: 40 },
];

/** The pin that shows an open preview card by default in the mock. */
export const featuredMapSpotId = "peonia";

// ---------------------------------------------------------------------------
// Lookup helpers used by the spot- and region-detail pages.
// ---------------------------------------------------------------------------

/** All known spots, de-duplicated by id (landing grid + map view). */
export const allSpots: Spot[] = [
  ...topSpots,
  ...mapSpots.filter((m) => !topSpots.some((t) => t.id === m.id)),
];

export const getSpot = (id?: string): Spot | undefined =>
  allSpots.find((s) => s.id === id);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Slug for the region a spot belongs to, e.g. "Sardinien, Italien" → "sardinien". */
export const regionSlug = (region: string) => slugify(region.split(",")[0]);

export interface RegionInfo {
  slug: string;
  name: string;
  country: string;
  spots: Spot[];
  /** Map centre, averaged over the region's spot coordinates. */
  center: [number, number];
}

export const getRegion = (slug?: string): RegionInfo | undefined => {
  if (!slug) return undefined;
  const spots = allSpots.filter((s) => regionSlug(s.region) === slug);
  if (spots.length === 0) return undefined;

  const [name, country] = spots[0].region.split(",").map((p) => p.trim());
  const withCoords = spots.filter((s) => s.coords);
  const center: [number, number] = withCoords.length
    ? [
        withCoords.reduce((a, s) => a + s.coords![0], 0) / withCoords.length,
        withCoords.reduce((a, s) => a + s.coords![1], 0) / withCoords.length,
      ]
    : [46, 8];

  return { slug, name, country, spots, center };
};
