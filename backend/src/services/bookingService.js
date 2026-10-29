// Forretningslag: bookinger. Validerer input, udregner sæson og pris med bookingRules og
// kalder repositories. Ingen SQL og intet req/res her. Fejl kastes som klasserne fra errors.js.
const bookingRepository = require('../repositories/bookingRepository');
const roomTypeRepository = require('../repositories/roomTypeRepository');
const bookingRules = require('./bookingRules');
const { ValidationError, NotFoundError, ConflictError } = require('./errors');

const MAX_SEARCH_LENGTH = 100;

// Forklaring pr. felt til fejlbeskeden, så brugeren kan se, hvad der er galt (FR-005).
const FIELD_ERRORS = {
  id: 'id skal være et positivt helt tal',
  first_name: 'first_name skal udfyldes (højst 100 tegn)',
  last_name: 'last_name skal udfyldes (højst 100 tegn)',
  country: 'country skal udfyldes (højst 100 tegn)',
  room_type: 'room_type skal være en af hotellets værelsestyper',
  arrival_date: 'arrival_date skal være en gyldig dato (YYYY-MM-DD)',
  nights: 'nights skal være et helt tal mellem 1 og 365',
};

function validationError(fields) {
  const reasons = fields.map((field) => FIELD_ERRORS[field]).join('; ');
  return new ValidationError(`Ugyldige felter: ${reasons}`, fields);
}

// id fra URL'en er tekst. Kun positive hele tal er gyldige.
function parseId(id) {
  if (!/^[1-9]\d*$/.test(String(id))) {
    throw validationError(['id']);
  }
  return Number(id);
}

async function findExisting(id) {
  const booking = await bookingRepository.findById(parseId(id));
  if (!booking) {
    throw new NotFoundError(`Booking ${id} findes ikke`);
  }
  return booking;
}

// Historiske bookinger fra datafilen må ikke ændres eller slettes (FR-003).
async function findChangeable(id) {
  const booking = await findExisting(id);
  if (booking.is_historical) {
    throw new ConflictError(`Booking ${id} er historisk og kan ikke ændres eller slettes`);
  }
  return booking;
}

// Validerer hele input og udregner sæson og pris. Alle fejl samles i én ValidationError.
async function prepareBooking(body) {
  const fields = bookingRules.validateBookingInput(body);
  let roomType = null;
  if (!fields.includes('room_type')) {
    roomType = await roomTypeRepository.findByName(body.room_type.trim());
    if (!roomType) {
      fields.push('room_type');
    }
  }
  if (fields.length > 0) {
    throw validationError(fields);
  }

  const season = bookingRules.seasonForDate(body.arrival_date);
  return {
    first_name: body.first_name.trim(),
    last_name: body.last_name.trim(),
    country: body.country.trim(),
    room_type_id: roomType.id,
    nights: body.nights,
    season,
    total_price: bookingRules.totalPrice(bookingRules.pricePerNight(roomType, season), body.nights),
    arrival_date: body.arrival_date,
  };
}

async function list(search) {
  const term = typeof search === 'string' ? search.trim().slice(0, MAX_SEARCH_LENGTH) : '';
  return bookingRepository.findAll(term);
}

async function get(id) {
  return findExisting(id);
}

async function create(body) {
  const booking = await prepareBooking(body);
  const id = await bookingRepository.create(booking);
  return bookingRepository.findById(id);
}

async function update(id, body) {
  const existing = await findChangeable(id);
  const booking = await prepareBooking(body);
  await bookingRepository.update(existing.id, booking);
  return bookingRepository.findById(existing.id);
}

async function remove(id) {
  const existing = await findChangeable(id);
  await bookingRepository.remove(existing.id);
}

module.exports = { list, get, create, update, remove };
