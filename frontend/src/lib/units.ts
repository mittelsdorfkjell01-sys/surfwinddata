// Unit preferences + formatters. The account settings let a user choose their
// units; these helpers turn the backend's canonical values (wind in knots, wave
// height in metres, temperature in °C) into the chosen display. Adopt them at
// conditions display sites incrementally.

export type WindUnit = "kn" | "bft";
export type WaveUnit = "m" | "ft";
export type TempUnit = "c" | "f";

export interface Units {
  wind: WindUnit;
  wave: WaveUnit;
  temp: TempUnit;
}

export const DEFAULT_UNITS: Units = { wind: "kn", wave: "m", temp: "c" };

// Lower knot bound of each Beaufort force (1..12).
const BEAUFORT_MIN_KN = [1, 4, 7, 11, 17, 22, 28, 34, 41, 48, 56, 64];

export function knotsToBeaufort(kn: number): number {
  let bft = 0;
  for (let i = 0; i < BEAUFORT_MIN_KN.length; i++) {
    if (kn >= BEAUFORT_MIN_KN[i]) bft = i + 1;
  }
  return bft;
}

const comma = (n: number) => n.toFixed(1).replace(".", ",");

export function formatWind(kn: number | null | undefined, unit: WindUnit): string {
  if (kn == null) return "—";
  return unit === "bft" ? `${knotsToBeaufort(kn)} Bft` : `${Math.round(kn)} kn`;
}

export function formatWave(m: number | null | undefined, unit: WaveUnit): string {
  if (m == null) return "—";
  return unit === "ft" ? `${comma(m * 3.281)} ft` : `${comma(m)} m`;
}

export function formatTemp(c: number | null | undefined, unit: TempUnit): string {
  if (c == null) return "—";
  return unit === "f" ? `${Math.round((c * 9) / 5 + 32)} °F` : `${Math.round(c)} °C`;
}

export const WIND_UNIT_LABELS: Record<WindUnit, string> = { kn: "Knoten", bft: "Beaufort" };
export const WAVE_UNIT_LABELS: Record<WaveUnit, string> = { m: "Meter", ft: "Fuß" };
export const TEMP_UNIT_LABELS: Record<TempUnit, string> = { c: "Celsius", f: "Fahrenheit" };
