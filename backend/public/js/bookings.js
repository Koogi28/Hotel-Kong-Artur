// Bookingsiden (T025, US1, FR-014). Kun fetch mod /api/bookings via api.js.
// Sæson og pris udregnes ALDRIG her; de vises, som API'et svarer (FR-029, konstitution VI).

const FIELDS = ['first_name', 'last_name', 'country', 'room_type', 'arrival_date', 'nights'];
const SEASON_LABELS = { low: 'Lav', mid: 'Mellem', high: 'Høj' }; // kun visning
const PAGE_SIZE = 100; // Rækker vist før "Vis alle" (søgning dækker altid alle)

const form = document.getElementById('booking-form');
const formTitle = document.getElementById('form-title');
const submitButton = document.getElementById('submit-button');
const cancelButton = document.getElementById('cancel-button');
const message = document.getElementById('message');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search');
const rowsBody = document.getElementById('booking-rows');
const listStatus = document.getElementById('list-status');
const showAllButton = document.getElementById('show-all');

let bookings = [];     // Seneste svar fra GET /api/bookings
let showAll = false;
let editingId = null;  // null = opret, ellers id på bookingen, der rettes

// ---------- Liste og søgning ----------

async function loadBookings() {
  const search = searchInput.value.trim();
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  listStatus.textContent = 'Henter bookinger ...';
  try {
    bookings = await apiGet(`/bookings${query}`);
    renderBookings();
  } catch (error) {
    listStatus.textContent = '';
    rowsBody.innerHTML = '';
    showAlert(message, 'error', error.message);
  }
}

function renderBookings() {
  const visible = showAll ? bookings : bookings.slice(0, PAGE_SIZE);
  rowsBody.innerHTML = visible.map(rowHtml).join('');

  const search = searchInput.value.trim();
  if (bookings.length === 0) {
    listStatus.textContent = search ? `Ingen bookinger matcher "${search}".` : 'Der er ingen bookinger.';
  } else if (visible.length < bookings.length) {
    listStatus.textContent = `Viser de ${visible.length} nyeste af ${formatNumber(bookings.length)} bookinger.`;
  } else {
    listStatus.textContent = `${formatNumber(bookings.length)} bookinger${search ? ` matcher "${search}"` : ''}.`;
  }
  showAllButton.hidden = visible.length >= bookings.length;
}

function rowHtml(booking) {
  const name = `${booking.first_name} ${booking.last_name}`;
  // Historiske bookinger fra datafilen kan hverken rettes eller slettes (FR-003, FR-012)
  const actions = booking.is_historical
    ? '<span class="muted">Historisk</span>'
    : `<div class="button-row">
         <button class="button button--small button--primary" type="button" data-action="edit" data-id="${booking.id}"
           aria-label="Ret booking ${booking.id}">Ret</button>
         <button class="button button--small button--danger" type="button" data-action="delete" data-id="${booking.id}"
           aria-label="Slet booking ${booking.id}">Slet</button>
       </div>`;
  return `<tr>
    <td class="num">${booking.id}</td>
    <td>${escapeHtml(name)}</td>
    <td>${escapeHtml(booking.country)}</td>
    <td>${escapeHtml(booking.room_type)}</td>
    <td>${booking.arrival_date ? escapeHtml(booking.arrival_date) : '<span class="muted">–</span>'}</td>
    <td class="num">${booking.nights}</td>
    <td>${SEASON_LABELS[booking.season] || escapeHtml(booking.season)}</td>
    <td class="num">${formatDkk(booking.total_price)}</td>
    <td>${actions}</td>
  </tr>`;
}

// Søg, mens der tastes (lille pause, så der ikke sendes et kald pr. tast)
let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    showAll = false;
    loadBookings();
  }, 300);
});
searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  clearTimeout(searchTimer);
  showAll = false;
  loadBookings();
});

showAllButton.addEventListener('click', () => {
  showAll = true;
  renderBookings();
});

// ---------- Opret og ret ----------

// Værdierne sendes, som de er. Kun nætter laves om til et tal; tomt felt sendes som null,
// så API'et kan svare "mangler" (FR-005).
function readForm() {
  const body = {};
  FIELDS.forEach((name) => {
    const value = form.elements.namedItem(name).value.trim();
    body[name] = value === '' ? null : value;
  });
  if (body.nights !== null) {
    body.nights = Number(body.nights);
  }
  return body;
}

// Edge case (FR-033): en booking med et land uden for listen (fx oprettet via Swagger UI) skal
// stadig kunne rettes. Landet tilføjes som ekstra valg og fjernes igen ved nulstilling.
function ensureCountryOption(country) {
  removeExtraCountries();
  const select = form.elements.namedItem('country');
  if (country && ![...select.options].some((option) => option.value === country)) {
    const option = new Option(country, country);
    option.dataset.extra = 'true';
    select.add(option);
  }
}

function removeExtraCountries() {
  form.querySelectorAll('#country option[data-extra]').forEach((option) => option.remove());
}

function startEdit(booking) {
  editingId = booking.id;
  ensureCountryOption(booking.country);
  FIELDS.forEach((name) => {
    form.elements.namedItem(name).value = booking[name] ?? '';
  });
  formTitle.textContent = `Ret booking ${booking.id}`;
  submitButton.textContent = 'Gem ændringer';
  cancelButton.hidden = false;
  clearFieldErrors(form);
  clearAlert(message);
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.elements.namedItem('first_name').focus({ preventScroll: true });
}

function resetForm() {
  editingId = null;
  form.reset();
  removeExtraCountries();
  clearFieldErrors(form);
  formTitle.textContent = 'Ny booking';
  submitButton.textContent = 'Opret booking';
  cancelButton.hidden = true;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFieldErrors(form);
  clearAlert(message);
  submitButton.disabled = true;

  const body = readForm();
  try {
    const saved = editingId === null
      ? await apiSend('POST', '/bookings', body)
      : await apiSend('PUT', `/bookings/${editingId}`, body);
    const verb = editingId === null ? 'oprettet' : 'rettet';
    // Sæson og pris er API'ets svar (FR-007–FR-009)
    showAlert(message, 'success',
      `Booking ${saved.id} ${verb}: ${saved.first_name} ${saved.last_name}, ${saved.room_type}, `
      + `${SEASON_LABELS[saved.season].toLowerCase()}sæson, ${saved.nights} nætter, i alt ${formatDkk(saved.total_price)}`);
    resetForm();
    searchInput.value = '';
    await loadBookings();
  } catch (error) {
    if (error.status === 400 && error.fields.length > 0) {
      markFieldErrors(form, error.fields);
      showAlert(message, 'error', 'Bookingen er ikke gemt. Ret de markerede felter.');
      const first = form.elements.namedItem(error.fields[0]);
      if (first && first.focus) first.focus();
    } else {
      // 404 (slettet imens), 409 (historisk), 500 eller API nede
      showAlert(message, 'error', error.message);
    }
  } finally {
    submitButton.disabled = false;
  }
});

cancelButton.addEventListener('click', () => {
  resetForm();
  clearAlert(message);
});

// ---------- Ret og slet fra listen ----------

rowsBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = Number(button.dataset.id);
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return;

  if (button.dataset.action === 'edit') {
    startEdit(booking);
    return;
  }

  const name = `${booking.first_name} ${booking.last_name}`;
  if (!confirm(`Afbestil booking ${id} for ${name}? Bookingen slettes og kan ikke gendannes.`)) {
    return;
  }
  button.disabled = true;
  try {
    await apiSend('DELETE', `/bookings/${id}`);
    showAlert(message, 'success', `Booking ${id} for ${name} er afbestilt.`);
    if (editingId === id) resetForm();
    await loadBookings();
  } catch (error) {
    showAlert(message, 'error', error.message);
    button.disabled = false;
  }
});

loadBookings();
