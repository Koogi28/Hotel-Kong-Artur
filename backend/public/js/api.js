// Fælles hjælpefunktioner for alle sider (T068). Indlæses med <script src="js/api.js"></script>
// før sidens egen fil. Ingen moduler og intet build-step (princip I).
//
// Regel (FR-029): browseren beregner ALDRIG nøgletal, sæson eller pris. Alle tal kommer fra
// REST API'et. Funktionerne her henter data, viser fejl og formaterer tal til visning.

const API_BASE = '/api';

// Fejl fra API'et. status 0 betyder, at API'et ikke kunne nås.
class ApiError extends Error {
  constructor(status, message, fields = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = Array.isArray(fields) ? fields : [];
  }
}

// Fælles fetch: sender og modtager JSON og laver fejlsvar om til ApiError.
async function apiRequest(method, path, body) {
  const options = { method, headers: { Accept: 'application/json' } };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, options);
  } catch (networkError) {
    throw new ApiError(0, "API'et svarer ikke. Tjek, at systemet kører.");
  }

  if (response.status === 204) {
    return null;
  }

  // API'et svarer altid med JSON (princip III), men vi tåler et tomt eller ugyldigt svar.
  let data = null;
  try {
    data = await response.json();
  } catch (parseError) {
    data = null;
  }

  if (!response.ok) {
    const message = data && data.error ? data.error : `Uventet fejl (${response.status})`;
    throw new ApiError(response.status, message, data && data.fields);
  }
  return data;
}

// Henter data, fx apiGet('/kpi/revenue/total').
function apiGet(path) {
  return apiRequest('GET', path);
}

// Opretter, retter eller sletter, fx apiSend('POST', '/bookings', { ... }).
function apiSend(method, path, body) {
  return apiRequest(method, path, body);
}

// ---------- Beskeder ----------

// type: 'success', 'error' eller 'info'. Fejl læses op med det samme (role="alert"),
// de andre høfligt (role="status").
function showAlert(element, type, text) {
  element.className = `alert alert--${type}`;
  element.setAttribute('role', type === 'error' ? 'alert' : 'status');
  element.textContent = text;
}

function clearAlert(element) {
  element.className = 'alert';
  element.removeAttribute('role');
  element.textContent = '';
}

// ---------- Feltfejl (400 med fields) ----------

// Markerer hvert felt i `fields` med en strimmel under feltet, som "Nødvendig information" på
// hotellets bookingside. `name` på input/select skal være det samme som feltnavnet fra API'et.
function markFieldErrors(form, fields, message = 'Ugyldig eller mangler') {
  clearFieldErrors(form);
  fields.forEach((name) => {
    const input = form.elements.namedItem(name);
    if (!input || !input.closest) {
      return;
    }
    const field = input.closest('.field');
    if (!field) {
      return;
    }
    const errorId = `${input.id || name}-error`;
    const error = document.createElement('span');
    error.className = 'field-error';
    error.id = errorId;
    error.textContent = message;
    field.classList.add('field--invalid');
    field.appendChild(error);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorId);
  });
}

function clearFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach((error) => error.remove());
  form.querySelectorAll('.field--invalid').forEach((field) => field.classList.remove('field--invalid'));
  form.querySelectorAll('[aria-invalid]').forEach((input) => {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  });
}

// ---------- Visningsformat (ingen beregning) ----------

const numberFormat = new Intl.NumberFormat('da-DK');

// Kroner som "3.600 kr." eller "13.448.640,34 kr." (decimaler kun, når API'et har dem).
function formatDkk(value) {
  const decimals = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Heltal med tusindtalsseparator: 179958 → "179.958".
function formatNumber(value) {
  return numberFormat.format(value);
}

// Procent fra API'et, fx 0.5 → "0,5 %" og 52.83 → "52,83 %". Tallet regnes ikke om.
function formatPercent(value) {
  return `${new Intl.NumberFormat('da-DK', { maximumFractionDigits: 2 }).format(value)} %`;
}

// Gør tekst fra API'et (fx gæstens navn) sikker, hvis den sættes ind med innerHTML.
// Brug helst textContent; denne funktion er til tabelrækker, der bygges som HTML-tekst.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
