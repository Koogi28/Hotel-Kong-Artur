// Overblikket (T035, US2). Kun fetch mod /api/kpi/* via api.js.
// Ingen beregning i browseren (FR-029): totaler, fordelinger, procenter og sortering kommer fra
// API'et. Det eneste, browseren gør, er at filtrere de hentede rækker på sæson.

const SEASON_LABELS = { low: 'Lav', mid: 'Mellem', high: 'Høj' }; // kun visning
const seasonLabel = (season) => SEASON_LABELS[season] || season;

const message = document.getElementById('message');
const updated = document.getElementById('updated');
const occupancyForm = document.getElementById('occupancy-form');
const occupancyDate = document.getElementById('occupancy-date');
const seasonFilter = document.getElementById('season-filter');

let roomTypeSeasonRows = []; // Seneste svar fra by-room-type-season (24 rækker)

const byId = (id) => document.getElementById(id);
const emptyRow = (columns, text) => `<tr><td colspan="${columns}" class="muted">${escapeHtml(text)}</td></tr>`;

// Én række i en fordelingstabel: [{key, revenue, booking_count}]
const revenueRow = (label) => (row) => `<tr>
  <td>${escapeHtml(label(row.key))}</td>
  <td class="num">${formatNumber(row.booking_count)}</td>
  <td class="num">${formatDkk(row.revenue)}</td>
</tr>`;

// ---------- Render ----------

function renderTotal(total) {
  byId('total-revenue').textContent = formatDkk(total.total_revenue);
  byId('booking-count').textContent = formatNumber(total.booking_count);
}

// Ved uafgjort returnerer API'et flere drinks i samme kategori; de vises alle (edge case)
function renderTopDrinks(rows) {
  [['Coffee', 'coffee', 'kaffe'], ['Cocktail', 'cocktail', 'cocktail']].forEach(([category, id, word]) => {
    const top = rows.filter((row) => row.category === category);
    byId(`top-${id}`).textContent = top.length ? top.map((row) => row.name).join(' / ') : 'Ingen salg';
    byId(`top-${id}-label`).textContent = top.length
      ? `Mest solgte ${word} · ${formatNumber(top[0].units_sold)} enheder`
      : `Mest solgte ${word}`;
  });
}

function renderRevenue(id, rows, label) {
  byId(id).innerHTML = rows.length ? rows.map(revenueRow(label)).join('') : emptyRow(3, 'Ingen bookinger');
}

function renderNights(rows) {
  byId('nights-rows').innerHTML = rows.length
    ? rows.map((row) => `<tr>
        <td>${escapeHtml(row.date)}</td>
        <td class="num">${formatNumber(row.booked_rooms)} af ${formatNumber(row.capacity)}</td>
        <td class="num">${formatPercent(row.occupancy_percent)}</td>
      </tr>`).join('')
    : emptyRow(3, 'Ingen bookinger med ankomstdato endnu.');
  byId('nights-status').textContent = rows.length
    ? `${formatNumber(rows.length)} nætter fra ${rows[0].date} til ${rows[rows.length - 1].date}.`
    : '';
}

function renderMatrix() {
  const season = seasonFilter.value;
  const visible = season ? roomTypeSeasonRows.filter((row) => row.season === season) : roomTypeSeasonRows;
  byId('matrix-rows').innerHTML = visible.map((row) => `<tr>
      <td>${escapeHtml(row.room_type)}</td>
      <td>${escapeHtml(seasonLabel(row.season))}</td>
      <td class="num">${formatNumber(row.booking_count)}</td>
      <td class="num">${formatDkk(row.revenue)}</td>
    </tr>`).join('');
  byId('matrix-status').textContent = `Viser ${visible.length} af ${roomTypeSeasonRows.length} rækker.`;
}

function renderOccupancy(result) {
  byId('occupancy-value').textContent = formatPercent(result.occupancy_percent);
  byId('occupancy-label').textContent =
    `Belægning natten til ${result.date} · ${formatNumber(result.booked_rooms)} af ${formatNumber(result.capacity)} værelser`;
}

// ---------- Hent ----------

// Hver sektion hentes for sig, så én fejl ikke tømmer hele siden
async function loadAll() {
  clearAlert(message);
  updated.textContent = 'Henter tal ...';
  const sections = [
    ['/kpi/revenue/total', renderTotal],
    ['/kpi/top-drinks', renderTopDrinks],
    ['/kpi/revenue/by-season', (rows) => renderRevenue('season-rows', rows, seasonLabel)],
    ['/kpi/revenue/by-room-type', (rows) => renderRevenue('room-type-rows', rows, (key) => key)],
    ['/kpi/revenue/by-country', (rows) => renderRevenue('country-rows', rows, (key) => key)],
    ['/kpi/revenue/by-room-type-season', (rows) => { roomTypeSeasonRows = rows; renderMatrix(); }],
    ['/kpi/occupancy/nights', renderNights],
  ];
  const results = await Promise.allSettled(sections.map(([path]) => apiGet(path)));
  const failed = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sections[index][1](result.value);
    } else {
      failed.push(result.reason.message);
    }
  });
  await loadOccupancy();

  const time = new Date().toLocaleTimeString('da-DK', { timeZone: 'Europe/Copenhagen' });
  updated.textContent = `Senest hentet kl. ${time}.`;
  if (failed.length) {
    showAlert(message, 'error', `Nogle tal kunne ikke hentes: ${[...new Set(failed)].join(' ')}`);
  }
}

async function loadOccupancy() {
  clearFieldErrors(occupancyForm);
  try {
    renderOccupancy(await apiGet(`/kpi/occupancy?date=${encodeURIComponent(occupancyDate.value)}`));
  } catch (error) {
    byId('occupancy-value').textContent = '–';
    byId('occupancy-label').textContent = 'Belægning';
    if (error.status === 400) {
      markFieldErrors(occupancyForm, error.fields.length ? error.fields : ['date'], 'Vælg en gyldig dato');
    } else {
      showAlert(message, 'error', error.message);
    }
  }
}

// ---------- Hændelser ----------

occupancyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  loadOccupancy();
});
seasonFilter.addEventListener('change', renderMatrix);
byId('refresh').addEventListener('click', loadAll);

// Standard: i dag i dansk tid (kun visning; datoen sendes til API'et, der beregner)
occupancyDate.value = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Copenhagen' });
loadAll();
