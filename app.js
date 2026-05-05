const SPOTS = [
  { id: 'laboe',           name: 'Laboe',               country: 'Deutschland',   lat: 54.404,  lon: 10.222,  color: '#2196F3' },
  { id: 'gold_fehmarn',    name: 'Gold auf Fehmarn',    country: 'Deutschland',   lat: 54.450,  lon: 11.190,  color: '#03A9F4' },
  { id: 'hvide_sande',     name: 'Hvide Sande',         country: 'Dänemark',      lat: 56.000,  lon:  8.122,  color: '#00BCD4' },
  { id: 'st_peter_ording', name: 'St. Peter-Ording',    country: 'Deutschland',   lat: 54.293,  lon:  8.652,  color: '#009688' },
  { id: 'is_solinas',      name: 'Is Solinas',          country: 'Sardinien',     lat: 40.057,  lon:  8.391,  color: '#4CAF50' },
  { id: 'la_cinta',        name: 'La Cinta',            country: 'Sardinien',     lat: 40.744,  lon:  9.735,  color: '#8BC34A' },
  { id: 'les_capitelles',  name: 'Les Capitelles',      country: 'Frankreich',    lat: 43.459,  lon:  3.642,  color: '#CDDC39' },
  { id: 'taghazout',       name: 'Taghazout',           country: 'Marokko',       lat: 30.540,  lon: -9.710,  color: '#FFC107' },
  { id: 'tarifa',          name: 'Tarifa',              country: 'Spanien',       lat: 36.014,  lon: -5.601,  color: '#FF9800' },
  { id: 'leucate',         name: 'Leucate',             country: 'Frankreich',    lat: 42.916,  lon:  3.053,  color: '#FF5722' },
  { id: 'praia_guincho',   name: 'Praia do Guincho',    country: 'Portugal',      lat: 38.730,  lon: -9.472,  color: '#F44336' },
  { id: 'sotavento',       name: 'Sotavento',           country: 'Fuerteventura', lat: 28.131,  lon:-14.254,  color: '#E91E63' },
  { id: 'brouwersdam',     name: 'Brouwersdam',         country: 'Niederlande',   lat: 51.751,  lon:  3.878,  color: '#9C27B0' },
  { id: 'pounda_paros',    name: 'Pounda Paros',        country: 'Griechenland',  lat: 37.007,  lon: 25.122,  color: '#673AB7' },
  { id: 'lo_stagnone',     name: 'Lo Stagnone',         country: 'Sizilien',      lat: 37.866,  lon: 12.479,  color: '#3F51B5' },
  { id: 'ringkobing',      name: 'Ringkøbing Fjord',    country: 'Dänemark',      lat: 56.089,  lon:  8.243,  color: '#795548' },
  { id: 'valdevaqueros',   name: 'Valdevaqueros',       country: 'Spanien',       lat: 36.060,  lon: -5.682,  color: '#607D8B' },
  { id: 'obidos',          name: 'Óbidos Lagoon',       country: 'Portugal',      lat: 39.364,  lon: -9.215,  color: '#FF6F00' },
  { id: 'gokova',          name: 'Gökova Bay',          country: 'Türkei',        lat: 37.140,  lon: 28.010,  color: '#00838F' },
  { id: 'akyaka',          name: 'Akyaka',              country: 'Türkei',        lat: 37.055,  lon: 28.125,  color: '#1B5E20' },
];

const KITE_MIN = 16;
const KITE_MAX = 30;
const FETCH_TIMEOUT = 8000;

const MONTH_START_DAYS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTH_NAMES_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function kmhToKts(kmh) {
  return kmh * 0.539957;
}

function windStatus(kts) {
  if (kts === null || kts === undefined || isNaN(kts)) return 'unknown';
  if (kts >= KITE_MIN && kts <= KITE_MAX) return 'kite';
  if (kts >= 12 && kts < KITE_MIN) return 'border';
  return 'no';
}

function windLabel(kts, status) {
  if (kts === null || kts === undefined || isNaN(kts)) return '–';
  const rounded = kts.toFixed(1);
  if (status === 'kite') return `Kite-Fenster! ${rounded} kts`;
  if (status === 'border') return `Grenzwertig · ${rounded} kts`;
  if (kts > KITE_MAX) return `Zu viel Wind · ${rounded} kts`;
  return `Kein Wind · ${rounded} kts`;
}

function windEmoji(status) {
  if (status === 'kite') return '✅';
  if (status === 'border') return '🌊';
  return '❌';
}

function getSpotById(id) {
  return SPOTS.find(s => s.id === id) || null;
}

function dayOfYearToDate(day) {
  const d = parseInt(day, 10);
  if (isNaN(d) || d < 1 || d > 365) return '';
  const date = new Date(2023, 0, d);
  return `${date.getDate()}. ${MONTH_NAMES[date.getMonth()]}`;
}

function getCurrentDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getCurrentWeekInfo() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now - startOfYear) / 86400000) + 1;

  // ISO week number
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

  // Start of this week (Monday)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  // End of this week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fmt = (d) => `${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`;

  // Day-of-year range for this week (1-indexed, clamped to 365)
  const startDay = Math.floor((weekStart - new Date(weekStart.getFullYear(), 0, 0)) / 86400000);
  const endDay = Math.min(startDay + 6, 365);

  return { weekNo, startDay, endDay, label: `KW ${weekNo} (${fmt(weekStart)} – ${fmt(weekEnd)})` };
}

async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function fetchLiveWind(spot) {
  const url = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${spot.lat}&longitude=${spot.lon}`
    + `&current=windspeed_10m,winddirection_10m&wind_speed_unit=kmh`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  const kmh = data?.current?.windspeed_10m;
  if (kmh == null) return null;
  return { kts: kmhToKts(kmh), dir: data?.current?.winddirection_10m ?? null };
}

function formatTime(date) {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
