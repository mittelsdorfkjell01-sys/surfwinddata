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
