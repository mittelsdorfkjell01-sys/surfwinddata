let historyData = null;
let activeChart = null;
let activeMap = null;
let mapInitTimer = null;
let currentSpotId = null;

const CHART_YEARS = ['2020', '2021', '2022', '2023', '2024'];
const YEAR_COLORS = {
  avg:   '#455A64',
  '2020': '#90CAF9',
  '2021': '#80CBC4',
  '2022': '#A5D6A7',
  '2023': '#FFCC02',
  '2024': '#FF8A65',
  '2025': '#EF5350',
};

const X_LABELS = Array.from({ length: 365 }, (_, i) => {
  const day = i + 1;
  const idx = MONTH_START_DAYS.indexOf(day);
  return idx !== -1 ? MONTH_NAMES[idx] : '';
});

// ── Init ──────────────────────────────────────────────────────────────────────

(async function init() {
  renderSidebar();

  try {
    const res = await fetch('./data/history.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    historyData = await res.json();
  } catch (e) {
    historyData = null;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || SPOTS[0].id;
  loadSpot(id);
})();

// ── Sidebar ───────────────────────────────────────────────────────────────────

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');

  const sorted = [...SPOTS].sort((a, b) =>
    a.country.localeCompare(b.country, 'de') || a.name.localeCompare(b.name, 'de')
  );

  const groups = {};
  sorted.forEach(spot => {
    if (!groups[spot.country]) groups[spot.country] = [];
    groups[spot.country].push(spot);
  });

  sidebar.innerHTML = Object.entries(groups).map(([country, spots]) => `
    <div class="sidebar-group">
      <div class="sidebar-group-header">${country}</div>
      ${spots.map(spot => `
        <div class="sidebar-item" id="sidebar-${spot.id}" onclick="navigateToSpot('${spot.id}')">
          <span class="sidebar-dot" style="background:${spot.color}"></span>
          <span>${spot.name}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function setActiveSidebarItem(id) {
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const item = document.getElementById(`sidebar-${id}`);
  if (item) {
    item.classList.add('active');
    item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function navigateToSpot(id) {
  if (id === currentSpotId) return;
  history.pushState({ id }, '', `spot.html?id=${id}`);
  loadSpot(id);
}

window.addEventListener('popstate', (e) => {
  const id = e.state?.id || SPOTS[0].id;
  loadSpot(id);
});

// ── Load Spot ─────────────────────────────────────────────────────────────────

async function loadSpot(id) {
  const spot = getSpotById(id);
  if (!spot) return;

  currentSpotId = id;
  setActiveSidebarItem(id);
  document.title = `Surfwind – ${spot.name}`;

  renderMainSkeleton(spot);

  const [liveKts, data2025] = await Promise.allSettled([
    fetchLiveWind(spot),
    fetch2025(spot),
  ]);

  const liveData = liveKts.status === 'fulfilled' ? liveKts.value : null;
  updateLiveOverlay(liveData);

  const arr2025 = data2025.status === 'fulfilled' ? data2025.value : null;
  buildChart(spot, arr2025);
  buildMap(spot);
}

// ── Skeleton / Main render ────────────────────────────────────────────────────

function renderMainSkeleton(spot) {
  destroyCharts();

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="spot-header">
      <div class="spot-title-group">
        <div class="spot-name">${spot.name}</div>
        <div class="spot-country">${spot.country}</div>
      </div>
      <div class="live-overlay" id="live-overlay">
        <div class="live-overlay-live" id="live-overlay-live">Live</div>
        <div class="live-overlay-main">
          <span class="live-overlay-speed" id="live-overlay-speed">– kts</span>
          <div class="live-overlay-compass-wrap">
            <div id="live-overlay-compass"></div>
            <span class="live-overlay-cardinal" id="live-overlay-cardinal">–</span>
          </div>
        </div>
        <div class="live-overlay-time" id="live-overlay-time"></div>
      </div>
    </div>

    <div>
      <div class="chart-container">
        <div class="chart-hint">Scrollrad = Zoom · Drag = Verschieben</div>
        <div class="chart-canvas-wrapper">
          <canvas id="main-chart"></canvas>
        </div>
        <div class="chart-footer">
          <div class="legend-section">
            <div class="legend-hint">👁 Kurven ein-/ausblenden</div>
            <div class="chart-legend" id="chart-legend"></div>
          </div>
          <button class="zoom-reset-btn" id="zoom-reset-btn" onclick="resetZoom()" style="display:none">Zoom zurücksetzen</button>
        </div>
      </div>

      <div class="spot-media">
        <div class="spot-photo-wrap">
          <img class="spot-photo-img"
               src="photos/${spot.id}.jpg"
               alt="${spot.name}"
               onerror="this.onerror=null;this.src='https://picsum.photos/seed/${spot.id}/800/450'">
        </div>
        <div class="spot-map" id="spot-map"></div>
      </div>
    </div>
  `;
}

function degToCardinal(deg) {
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function buildCompassSVG(dir) {
  const angle = dir !== null ? dir : 0;
  const op = dir !== null ? 1 : 0.3;
  return `<svg viewBox="0 0 48 48" width="48" height="48" style="opacity:${op}">
    <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"/>
    <text x="24" y="9.5" text-anchor="middle" fill="rgba(0,0,0,0.55)" font-size="7" font-family="Inter,sans-serif" font-weight="600">N</text>
    <circle cx="24" cy="40" r="1.3" fill="rgba(0,0,0,0.25)"/>
    <circle cx="40" cy="24" r="1.3" fill="rgba(0,0,0,0.25)"/>
    <circle cx="8"  cy="24" r="1.3" fill="rgba(0,0,0,0.25)"/>
    <g transform="rotate(${angle},24,24)">
      <polygon points="24,5 21,24 24,21.5 27,24" fill="#212121"/>
      <polygon points="24,43 21,24 24,26.5 27,24" fill="rgba(0,0,0,0.18)"/>
    </g>
    <circle cx="24" cy="24" r="2.2" fill="#212121"/>
  </svg>`;
}

function updateLiveOverlay(data) {
  const overlay     = document.getElementById('live-overlay');
  const liveLabel   = document.getElementById('live-overlay-live');
  const speedEl     = document.getElementById('live-overlay-speed');
  const compassEl   = document.getElementById('live-overlay-compass');
  const cardinalEl  = document.getElementById('live-overlay-cardinal');
  const timeEl      = document.getElementById('live-overlay-time');
  if (!overlay) return;

  if (!data) {
    liveLabel.className = 'live-overlay-live unknown';
    speedEl.textContent = '– kts';
    compassEl.innerHTML = buildCompassSVG(null);
    cardinalEl.textContent = '–';
  } else {
    const { kts, dir } = data;
    const status = windStatus(kts);
    liveLabel.className = `live-overlay-live ${status}`;
    speedEl.textContent = `${kts.toFixed(1)} kts`;
    compassEl.innerHTML = buildCompassSVG(dir);
    cardinalEl.textContent = dir !== null ? `${degToCardinal(dir)} ${Math.round(dir)}°` : '–';
  }
  if (timeEl) timeEl.textContent = `Aktualisiert: ${formatTime(new Date())} Uhr`;
}

// ── 2025 fetch ────────────────────────────────────────────────────────────────

async function fetch2025(spot) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Historical API covers up to ~5 days ago; fill gap with forecast API
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setDate(today.getDate() - 5);
  const histEnd = fiveDaysAgo.toISOString().split('T')[0];

  const histUrl = `https://archive-api.open-meteo.com/v1/archive`
    + `?latitude=${spot.lat}&longitude=${spot.lon}`
    + `&start_date=2025-01-01&end_date=${histEnd}`
    + `&hourly=windspeed_10m&wind_speed_unit=kmh&timezone=auto`;

  const forecastUrl = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${spot.lat}&longitude=${spot.lon}`
    + `&hourly=windspeed_10m&wind_speed_unit=kmh`
    + `&past_days=5&forecast_days=0&timezone=auto`;

  const [histRes, forecastRes] = await Promise.allSettled([
    fetchWithTimeout(histUrl),
    fetchWithTimeout(forecastUrl),
  ]);

  const hourlyMap = new Map();

  if (histRes.status === 'fulfilled') {
    const data = await histRes.value.json();
    mergeHourlyIntoMap(hourlyMap, data, 2025);
  }

  if (forecastRes.status === 'fulfilled') {
    const data = await forecastRes.value.json();
    mergeHourlyIntoMap(hourlyMap, data, 2025);
  }

  if (hourlyMap.size === 0) return null;

  return hourlyMapTo365Array(hourlyMap, today);
}

function mergeHourlyIntoMap(map, data, year) {
  const times = data?.hourly?.time;
  const speeds = data?.hourly?.windspeed_10m;
  if (!times || !speeds) return;

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (!t || !t.startsWith(String(year))) continue;
    // Filter to 09:00–19:00 local time only
    const hour = parseInt(t.slice(11, 13), 10);
    if (hour < 9 || hour > 19) continue;
    const speed = speeds[i];
    if (speed == null) continue;
    const dateStr = t.slice(0, 10);
    if (!map.has(dateStr)) map.set(dateStr, []);
    map.get(dateStr).push(kmhToKts(speed));
  }
}

function hourlyMapTo365Array(hourlyMap, today) {
  // Group by date → daily max in 09–19 window
  const dailyMap = new Map();
  for (const [timeStr, values] of hourlyMap) {
    const dateStr = timeStr.slice(0, 10);
    if (!dailyMap.has(dateStr)) dailyMap.set(dateStr, []);
    dailyMap.get(dateStr).push(...values);
  }

  const raw = new Array(365).fill(null);
  const todayDoy = getDayOfYear(today);

  for (const [dateStr, values] of dailyMap) {
    const d = new Date(dateStr + 'T00:00:00');
    if (d.getFullYear() !== 2025) continue;
    let doy = getDayOfYear(d);
    if (isLeapYear(d.getFullYear()) && doy >= 60) doy--;
    if (doy < 1 || doy > 365) continue;
    raw[doy - 1] = parseFloat(Math.max(...values).toFixed(1));
  }

  // Zero out future days only while we're still in 2025
  if (today.getFullYear() === 2025) {
    for (let i = todayDoy; i < 365; i++) raw[i] = null;
  }

  return raw;
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// ── Good-range canvas plugin ──────────────────────────────────────────────────

const goodRangePlugin = {
  id: 'goodRangePlugin',
  beforeDatasetsDraw(chart) {
    const ranges = chart._goodRanges;
    if (!ranges || ranges.length === 0) return;
    const { ctx, chartArea: { top, bottom }, scales: { x: xScale } } = chart;
    // Half category width so rectangles cover full day, not just center-to-center
    const halfCatW = (xScale.getPixelForValue(2) - xScale.getPixelForValue(1)) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(27,94,32,0.38)';
    for (const { xMin, xMax } of ranges) {
      const x1 = xScale.getPixelForValue(xMin) - halfCatW;
      const x2 = xScale.getPixelForValue(xMax) + halfCatW;
      ctx.fillRect(x1, top, x2 - x1, bottom - top);
    }
    ctx.restore();
  },
};

// ── Main chart ────────────────────────────────────────────────────────────────

function buildChart(spot, arr2025) {
  if (!historyData) {
    const canvas = document.getElementById('main-chart');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#757575';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Historische Daten nicht verfügbar. Bitte fetch_history.py ausführen.', canvas.width / 2, 60);
    }
    return;
  }

  const spotData = historyData.spots?.[spot.id];
  if (!spotData) return;

  const currentDayOfYear = getCurrentDayOfYear();

  const datasets = [];

  // Ø 2004–2024
  datasets.push({
    label: 'Ø 2004–24',
    data: spotData.avg || [],
    borderColor: YEAR_COLORS.avg,
    borderWidth: 1.5,
    borderDash: [6, 3],
    tension: 0,
    pointRadius: 0,
    pointHoverRadius: 4,
    spanGaps: false,
  });

  // 2020–2024
  for (const year of CHART_YEARS) {
    datasets.push({
      label: year,
      data: spotData[year] || [],
      borderColor: YEAR_COLORS[year],
      borderWidth: 1.5,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 4,
      spanGaps: false,
    });
  }

  // 2025
  datasets.push({
    label: '2025',
    data: arr2025 || new Array(365).fill(null),
    borderColor: YEAR_COLORS['2025'],
    borderWidth: 1.5,
    tension: 0,
    pointRadius: 0,
    pointHoverRadius: 4,
    spanGaps: false,
  });

  const canvas = document.getElementById('main-chart');
  if (!canvas) return;

  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }

  activeChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    plugins: [goodRangePlugin],
    data: {
      labels: Array.from({ length: 365 }, (_, i) => i + 1),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      spanGaps: false,
      elements: {
        point: { radius: 0, hoverRadius: 4 },
        line: { fill: false },
      },
      scales: {
        x: {
          type: 'category',
          ticks: {
            maxTicksLimit: 12,
            callback: (val, idx) => X_LABELS[idx] || null,
            autoSkip: false,
            maxRotation: 0,
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        y: {
          min: 0,
          max: 40,
          title: { display: true, text: 'Tages-Max 09–19 Uhr (kts)', color: '#757575', font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.07)' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: (items) => `Tag ${items[0].label} · ${dayOfYearToDate(items[0].label)}`,
            label: (item) => `${item.dataset.label}: ${item.parsed.y != null ? item.parsed.y.toFixed(1) : '–'} kts`,
          },
        },
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
            onZoomComplete: () => showResetBtn(),
          },
          pan: {
            enabled: true,
            mode: 'x',
            onPanComplete: () => showResetBtn(),
          },
          limits: {
            x: { min: 0, max: 364, minRange: 14 },
          },
        },
        annotation: {
          annotations: {
            kiteZone: {
              type: 'box',
              yMin: 16,
              yMax: 30,
              backgroundColor: 'rgba(76,175,80,0.07)',
              borderColor: 'rgba(76,175,80,0.25)',
              borderWidth: 1,
              label: {
                content: '⬆ Kite-Fenster 16–30 kts',
                display: true,
                position: { x: 'start', y: 'end' },
                color: 'rgba(76,175,80,0.6)',
                font: { size: 10 },
              },
            },
            today: {
              type: 'line',
              xMin: currentDayOfYear,
              xMax: currentDayOfYear,
              borderColor: 'rgba(239,83,80,0.5)',
              borderWidth: 1,
              borderDash: [4, 4],
              label: {
                content: 'Heute',
                display: true,
                position: 'start',
                color: 'rgba(239,83,80,0.7)',
                font: { size: 10 },
              },
            },
          },
        },
      },
    },
  });

  activeChart._goodRanges = computeGoodRanges(datasets.filter(ds => ds.label !== 'Ø 2004–24'));
  renderLegend(datasets);
}

function renderLegend(datasets) {
  const container = document.getElementById('chart-legend');
  if (!container) return;

  container.innerHTML = datasets.map((ds, i) => {
    const isAvg = ds.label === 'Ø 2004–24';
    const color = ds.borderColor;
    return `
      <div class="legend-pill" data-index="${i}" onclick="toggleDataset(${i}, this)">
        <span class="legend-line${isAvg ? ' dashed' : ''}" style="color:${color};background:${isAvg ? '' : color}"></span>
        <span>${ds.label}</span>
      </div>
    `;
  }).join('');
}

function toggleDataset(index, pill) {
  if (!activeChart) return;
  const meta = activeChart.getDatasetMeta(index);
  meta.hidden = !meta.hidden;
  pill.classList.toggle('hidden', meta.hidden);
  const visible = activeChart.data.datasets.filter(
    (ds, i) => ds.label !== 'Ø 2004–24' && !activeChart.getDatasetMeta(i).hidden
  );
  activeChart._goodRanges = computeGoodRanges(visible);
  activeChart.update({ duration: 0 });
}

function computeGoodRanges(datasets) {
  const ranges = [];
  if (datasets.length === 0) return ranges;
  let rangeStart = null;
  for (let i = 0; i < 365; i++) {
    const dayLabel = i + 1;
    const values = datasets
      .map(ds => ds.data[i])
      .filter(v => v !== null && v !== undefined && !isNaN(v));
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null;
    const inWindow = avg !== null && avg >= KITE_MIN && avg <= KITE_MAX;
    if (inWindow) {
      if (rangeStart === null) rangeStart = dayLabel;
    } else {
      if (rangeStart !== null) {
        ranges.push({ xMin: rangeStart, xMax: dayLabel - 1 });
        rangeStart = null;
      }
    }
  }
  if (rangeStart !== null) ranges.push({ xMin: rangeStart, xMax: 365 });
  return ranges;
}

function showResetBtn() {
  const btn = document.getElementById('zoom-reset-btn');
  if (btn) btn.style.display = '';
}

function resetZoom() {
  if (activeChart) activeChart.resetZoom();
  const btn = document.getElementById('zoom-reset-btn');
  if (btn) btn.style.display = 'none';
}

// ── Map ───────────────────────────────────────────────────────────────────────

function buildMap(spot) {
  const container = document.getElementById('spot-map');
  if (!container) return;

  // Defer init so grid layout is computed before Leaflet reads container size
  mapInitTimer = setTimeout(() => {
    mapInitTimer = null;
    activeMap = L.map(container, { zoomControl: true }).setView([spot.lat, spot.lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(activeMap);
    L.marker([spot.lat, spot.lon]).addTo(activeMap).bindPopup(spot.name).openPopup();
    activeMap.invalidateSize();
  }, 0);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

function destroyCharts() {
  if (mapInitTimer) { clearTimeout(mapInitTimer); mapInitTimer = null; }
  if (activeChart) { activeChart.destroy(); activeChart = null; }
  if (activeMap) { activeMap.remove(); activeMap = null; }
}
