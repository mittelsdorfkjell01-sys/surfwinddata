// Builds the spot-detail "Steckbrief" (category facts) and the Facilities list
// from the backend spot record. Category axes use German labels; unknown
// facilities (a kind absent from the map) are hidden — never shown as "unknown".

import type { Facility, SpotFact } from "./types";
import type { Spot } from "./types";
import type { FacilityMap } from "./api";
import {
  FACILITY_KINDS,
  facilityLabel,
  levelLabel,
  sportLabel,
  styleList,
  waterCharacterLabel,
} from "./labels";

/** The three category axes (+ sports) as a key/value character sheet. */
export function spotFactsFrom(spot: Spot): SpotFact[] {
  const facts: SpotFact[] = [];
  if (spot.sports && spot.sports.length)
    facts.push({ label: "Sportarten", value: spot.sports.map(sportLabel).join(", ") });
  if (spot.level) facts.push({ label: "Level", value: levelLabel(spot.level) });
  if (spot.waterCharacter)
    facts.push({ label: "Wasserart", value: waterCharacterLabel(spot.waterCharacter) });
  if (spot.style && spot.style.length)
    facts.push({ label: "Fahrstil", value: styleList(spot.style) });
  return facts;
}

/** Facilities present in the map, in canonical order. Absent kinds are omitted;
 *  available:false kinds are included but flagged so the UI can mute them. */
export function facilitiesFromMap(map?: FacilityMap | null): Facility[] {
  if (!map) return [];
  const out: Facility[] = [];
  for (const kind of FACILITY_KINDS) {
    const entry = map[kind];
    if (!entry) continue; // unknown → hide the row entirely
    out.push({
      kind,
      title: facilityLabel(kind),
      note: entry.available
        ? entry.note ?? "Vorhanden"
        : entry.note ?? "Nicht vorhanden",
      available: entry.available,
    });
  }
  return out;
}
