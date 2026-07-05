// Single source of truth for translating backend enum keys → German display
// labels. The keys mirror app/admin/constants.py (LEVELS, WATER_CHARACTERS,
// STYLES, FACILITY_KINDS); keep them in sync with the backend.

import type { FacilityKind } from "./api";

export const LEVELS = ["beginner", "intermediate", "advanced", "pro"] as const;
export const WATER_CHARACTERS = [
  "flach",
  "chop",
  "welle_klein",
  "welle_gross",
  "tiefes_wasser",
] as const;
export const STYLES = ["freeride", "freestyle", "big_air", "wave_riding"] as const;
export const FACILITY_KINDS: FacilityKind[] = [
  "parking",
  "shower",
  "food",
  "camping",
  "school",
];

export const LEVEL_LABELS: Record<string, string> = {
  beginner: "Anfänger",
  intermediate: "Fortgeschritten",
  advanced: "Könner",
  pro: "Profi",
};

export const WATER_CHARACTER_LABELS: Record<string, string> = {
  flach: "Flachwasser",
  chop: "Chop / Kabbelwelle",
  welle_klein: "Kleine Welle",
  welle_gross: "Große Welle",
  tiefes_wasser: "Tiefes Wasser",
};

export const STYLE_LABELS: Record<string, string> = {
  freeride: "Freeride",
  freestyle: "Freestyle",
  big_air: "Big Air",
  wave_riding: "Wellenreiten",
};

export const FACILITY_LABELS: Record<FacilityKind, string> = {
  parking: "Parkplatz",
  shower: "Dusche",
  food: "Gastronomie",
  camping: "Camping",
  school: "Surfschule / Verleih",
};

export const SPORT_LABELS: Record<string, string> = {
  kitesurf: "Kitesurfen",
  windsurf: "Windsurfen",
  wing: "Wingfoilen",
  surf: "Wellenreiten",
};

export const levelLabel = (k?: string | null) => (k ? LEVEL_LABELS[k] ?? k : "");
export const waterCharacterLabel = (k?: string | null) =>
  k ? WATER_CHARACTER_LABELS[k] ?? k : "";
export const styleLabel = (k: string) => STYLE_LABELS[k] ?? k;
export const facilityLabel = (k: FacilityKind) => FACILITY_LABELS[k] ?? k;
export const sportLabel = (k: string) => SPORT_LABELS[k] ?? k;

export const styleList = (styles?: string[] | null) =>
  (styles ?? []).map(styleLabel).join(", ");
