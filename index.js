(async function () {
  renderLiveGrid();
  fetchAllLive();
  await loadHistoricalWeek();
})();

function renderLiveGrid() {
  const grid = document.getElementById('live-grid');
  grid.innerHTML = SPOTS.map(spot => `
    <a class="kite-card loading unknown" href="spot.html?id=${spot.id}" id="card-${spot.id}">
      <div class="card-name">${spot.name}</div>
      <div class="card-country">${spot.country}</div>
      <div class="card-status unknown">
        <span class="card-emoji">⏳</span>Laden…
      </div>
    </a>
  `).join('');
}

async function fetchAllLive() {
  const timestamp = document.getElementById('live-timestamp');
  const results = await Promise.allSettled(SPOTS.map(spot => fetchLiveWind(spot)));

  const now = new Date();
  timestamp.textContent = `Stand: ${formatTime(now)} Uhr`;

  results.forEach((result, i) => {
    const spot = SPOTS[i];
    const card = document.getElementById(`card-${spot.id}`);
    if (!card) return;

    card.classList.remove('loading');

    if (result.status === 'fulfilled' && result.value !== null) {
      const kts = result.value;
      const status = windStatus(kts);
      card.className = `kite-card ${status}`;
      card.querySelector('.card-status').className = `card-status ${status}`;
      card.querySelector('.card-status').innerHTML =
        `<span class="card-emoji">${windEmoji(status)}</span>${windLabel(kts, status)}`;
    } else {
      card.className = 'kite-card no';
      card.querySelector('.card-status').className = 'card-status no';
      card.querySelector('.card-status').innerHTML =
        `<span class="card-emoji">❌</span>Keine Verbindung`;
    }
  });
}

async function loadHistoricalWeek() {
  const container = document.getElementById('stat-bars');
  const weekMeta = document.getElementById('week-meta');

  let history;
  try {
    const res = await fetch('./data/history.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    history = await res.json();
  } catch (e) {
    container.innerHTML = `<div style="color:var(--text-muted);font-size:0.82rem;">Historische Daten nicht verfügbar. Bitte <code>fetch_history.py</code> ausführen.</div>`;
    return;
  }

  const week = getCurrentWeekInfo();
  weekMeta.textContent = `Basierend auf ${week.label}, Durchschnitt 2004–2024`;

  const spotsData = history.spots;
  const scores = SPOTS.map(spot => {
    const spotData = spotsData[spot.id];
    if (!spotData || !spotData.avg) return { spot, pct: 0 };

    const avg = spotData.avg;
    let kiteCount = 0;
    let total = 0;
    for (let day = week.startDay; day <= week.endDay; day++) {
      const idx = day - 1;
      if (idx >= 0 && idx < avg.length) {
        total++;
        if (avg[idx] !== null && avg[idx] >= KITE_MIN) kiteCount++;
      }
    }
    const pct = total > 0 ? kiteCount / total : 0;
    return { spot, pct };
  });

  scores.sort((a, b) => b.pct - a.pct);

  container.innerHTML = scores.map(({ spot, pct }) => {
    const pctDisplay = Math.round(pct * 100);
    const isGood = pct > 0.5;
    return `
      <div class="stat-bar-row">
        <a class="stat-bar-label" href="spot.html?id=${spot.id}" title="${spot.name}">${spot.name}</a>
        <div class="stat-bar-track">
          <div class="stat-bar-fill${isGood ? ' highlight' : ''}" style="width:${pctDisplay}%"></div>
        </div>
        <div class="stat-bar-pct">${pctDisplay}%</div>
      </div>
    `;
  }).join('');
}
