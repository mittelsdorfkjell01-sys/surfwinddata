// German country name → flag emoji, for the search "Wohin?" panel. Unknown
// countries fall back to a neutral pin so nothing renders broken.

const FLAGS: Record<string, string> = {
  Deutschland: "🇩🇪",
  Frankreich: "🇫🇷",
  Spanien: "🇪🇸",
  Portugal: "🇵🇹",
  Italien: "🇮🇹",
  Griechenland: "🇬🇷",
  Niederlande: "🇳🇱",
  Belgien: "🇧🇪",
  Dänemark: "🇩🇰",
  Schweden: "🇸🇪",
  Norwegen: "🇳🇴",
  Kroatien: "🇭🇷",
  Österreich: "🇦🇹",
  Schweiz: "🇨🇭",
  Marokko: "🇲🇦",
  Ägypten: "🇪🇬",
  "Vereinigtes Königreich": "🇬🇧",
  Irland: "🇮🇪",
  Polen: "🇵🇱",
};

export const countryFlag = (country?: string | null): string =>
  (country && FLAGS[country]) || "📍";

// ISO 3166-1 alpha-2 → German country name. The backend stores the region's
// country as a bare code (see app/models/region.py); this spells it out for
// display. Unknown codes fall back to the raw code so nothing renders blank.
const COUNTRY_NAMES: Record<string, string> = {
  DE: "Deutschland",
  FR: "Frankreich",
  ES: "Spanien",
  PT: "Portugal",
  IT: "Italien",
  GR: "Griechenland",
  NL: "Niederlande",
  BE: "Belgien",
  DK: "Dänemark",
  SE: "Schweden",
  NO: "Norwegen",
  HR: "Kroatien",
  AT: "Österreich",
  CH: "Schweiz",
  MA: "Marokko",
  EG: "Ägypten",
  GB: "Vereinigtes Königreich",
  IE: "Irland",
  PL: "Polen",
};

export const countryName = (code?: string | null): string | undefined =>
  code ? COUNTRY_NAMES[code] ?? code : undefined;
