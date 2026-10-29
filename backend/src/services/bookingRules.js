// Forretningslag: rene funktioner til bookingregler (data ind, resultat ud – ingen SQL, ingen HTTP).
// Derfor kan sæson, pris og validering unit-testes uden database (princip XII).

// Sæson ud fra ankomstmåneden alene (FR-007). Index 0 = januar.
const SEASON_BY_MONTH = [
  'low', 'low', 'mid', 'mid', 'mid', 'high',
  'high', 'high', 'mid', 'mid', 'low', 'high',
];

const NAME_FIELDS = ['first_name', 'last_name', 'country'];
const MAX_TEXT_LENGTH = 100;
const MAX_NIGHTS = 365;

// dateString er 'YYYY-MM-DD' (allerede valideret med isValidDate).
function seasonForDate(dateString) {
  const month = Number(dateString.slice(5, 7));
  return SEASON_BY_MONTH[month - 1];
}

// Pris pr. nat fra værelsestypens række i databasen (price_low/mid/high, FR-008).
function pricePerNight(roomType, season) {
  return roomType[`price_${season}`];
}

// FR-009
function totalPrice(perNight, nights) {
  return perNight * nights;
}

// 'YYYY-MM-DD' og en rigtig kalenderdato. Date.UTC "ruller over" ved ugyldige datoer
// (2026-02-31 bliver til 3. marts), så vi tjekker, at år, måned og dag er de samme bagefter.
function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return false;
  }
  const [year, month, day] = s.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isValidText(value) {
  return typeof value === 'string'
    && value.trim() !== ''
    && value.trim().length <= MAX_TEXT_LENGTH;
}

// Returnerer listen af ugyldige felter. Alle fejl samles, så brugeren ser dem på én gang (FR-005).
// season, total_price og is_historical beregnes af systemet og ignoreres i input.
// Om room_type findes i databasen, tjekkes i bookingService.
function validateBookingInput(body) {
  const input = body || {};
  const fields = NAME_FIELDS.filter((field) => !isValidText(input[field]));
  if (!isValidText(input.room_type)) {
    fields.push('room_type');
  }
  if (!isValidDate(input.arrival_date)) {
    fields.push('arrival_date');
  }
  if (!Number.isInteger(input.nights) || input.nights < 1 || input.nights > MAX_NIGHTS) {
    fields.push('nights');
  }
  return fields;
}

module.exports = {
  seasonForDate,
  pricePerNight,
  totalPrice,
  isValidDate,
  validateBookingInput,
};
