// Unit-tests af bookingreglerne: sæson (FR-007), pris (FR-008, FR-009) og validering (FR-004, FR-005).
// Kører uden database: npm test
const test = require('node:test');
const assert = require('node:assert');
const {
  seasonForDate,
  pricePerNight,
  totalPrice,
  isValidDate,
  validateBookingInput,
} = require('../../src/services/bookingRules');

// Priserne fra FR-008. Samme form som rækkerne fra roomTypeRepository.
const ROOM_TYPES = [
  { name: 'Standard Single', price_low: 900, price_mid: 1050, price_high: 1200 },
  { name: 'Grand Lit', price_low: 1100, price_mid: 1250, price_high: 1400 },
  { name: 'Standard Double', price_low: 1200, price_mid: 1400, price_high: 1600 },
  { name: 'Superior Double', price_low: 1400, price_mid: 1700, price_high: 2000 },
  { name: 'Junior Suite', price_low: 1800, price_mid: 2150, price_high: 2500 },
  { name: 'Spa Executive', price_low: 2000, price_mid: 2400, price_high: 2800 },
  { name: 'Suite', price_low: 2500, price_mid: 3000, price_high: 3500 },
  { name: 'LOFT Suite', price_low: 3000, price_mid: 3500, price_high: 4000 },
];

const VALID_BODY = {
  first_name: 'Test',
  last_name: 'Gæst',
  country: 'Denmark',
  room_type: 'Standard Single',
  arrival_date: '2026-12-06',
  nights: 3,
};

// --- seasonForDate (FR-007) ---

test('seasonForDate: alle 12 måneder', () => {
  const expected = {
    '01': 'low', '02': 'low', '03': 'mid', '04': 'mid', '05': 'mid', '06': 'high',
    '07': 'high', '08': 'high', '09': 'mid', '10': 'mid', '11': 'low', '12': 'high',
  };
  for (const [month, season] of Object.entries(expected)) {
    assert.strictEqual(seasonForDate(`2026-${month}-15`), season, `måned ${month}`);
  }
});

test('seasonForDate: kun ankomstmåneden tæller (30/11 + 3 nætter ind i december → low)', () => {
  assert.strictEqual(seasonForDate('2026-11-30'), 'low');
  assert.strictEqual(seasonForDate('2026-12-01'), 'high');
});

// --- pricePerNight og totalPrice (FR-008, FR-009) ---

test('pricePerNight: alle 8 værelsestyper × 3 sæsoner', () => {
  for (const roomType of ROOM_TYPES) {
    assert.strictEqual(pricePerNight(roomType, 'low'), roomType.price_low, roomType.name);
    assert.strictEqual(pricePerNight(roomType, 'mid'), roomType.price_mid, roomType.name);
    assert.strictEqual(pricePerNight(roomType, 'high'), roomType.price_high, roomType.name);
  }
  assert.strictEqual(pricePerNight(ROOM_TYPES[7], 'high'), 4000);
});

test('totalPrice: pris pr. nat × nætter', () => {
  assert.strictEqual(totalPrice(1200, 3), 3600);
  assert.strictEqual(totalPrice(900, 1), 900);
});

test('quickstart: 6/12 Standard Single 3 nætter → high 3600, 30/11 → low 2700', () => {
  const single = ROOM_TYPES[0];
  const dec = seasonForDate('2026-12-06');
  assert.strictEqual(dec, 'high');
  assert.strictEqual(totalPrice(pricePerNight(single, dec), 3), 3600);
  const nov = seasonForDate('2026-11-30');
  assert.strictEqual(nov, 'low');
  assert.strictEqual(totalPrice(pricePerNight(single, nov), 3), 2700);
});

// --- isValidDate (FR-005) ---

test('isValidDate: gyldige datoer inkl. skudår', () => {
  assert.strictEqual(isValidDate('2026-12-06'), true);
  assert.strictEqual(isValidDate('2028-02-29'), true);
});

test('isValidDate: ugyldige datoer og formater', () => {
  assert.strictEqual(isValidDate('2026-02-31'), false);
  assert.strictEqual(isValidDate('2026-02-29'), false);
  assert.strictEqual(isValidDate('2026-13-01'), false);
  assert.strictEqual(isValidDate('2026-00-10'), false);
  assert.strictEqual(isValidDate('26-1-1'), false);
  assert.strictEqual(isValidDate('2026-12-06T10:00'), false);
  assert.strictEqual(isValidDate(''), false);
  assert.strictEqual(isValidDate(20261206), false);
  assert.strictEqual(isValidDate(undefined), false);
});

// --- validateBookingInput (FR-004, FR-005) ---

test('validateBookingInput: gyldigt input giver ingen fejlfelter', () => {
  assert.deepStrictEqual(validateBookingInput(VALID_BODY), []);
});

test('validateBookingInput: tom body → alle seks felter på én gang', () => {
  assert.deepStrictEqual(
    validateBookingInput({}).sort(),
    ['arrival_date', 'country', 'first_name', 'last_name', 'nights', 'room_type'],
  );
});

test('validateBookingInput: manglende body (null) behandles som tom', () => {
  assert.strictEqual(validateBookingInput(null).length, 6);
});

test('validateBookingInput: ugyldig dato og 0 nætter → begge felter', () => {
  const fields = validateBookingInput({ ...VALID_BODY, arrival_date: '2026-02-31', nights: 0 });
  assert.deepStrictEqual(fields.sort(), ['arrival_date', 'nights']);
});

test('validateBookingInput: nights skal være et heltal 1–365 (ikke tekst)', () => {
  for (const nights of [0, 1.5, 366, '3', -1, null]) {
    assert.deepStrictEqual(validateBookingInput({ ...VALID_BODY, nights }), ['nights'], `nights=${nights}`);
  }
  assert.deepStrictEqual(validateBookingInput({ ...VALID_BODY, nights: 1 }), []);
  assert.deepStrictEqual(validateBookingInput({ ...VALID_BODY, nights: 365 }), []);
});

test('validateBookingInput: navne og land – tom efter trim, ikke tekst eller over 100 tegn', () => {
  assert.deepStrictEqual(validateBookingInput({ ...VALID_BODY, first_name: '   ' }), ['first_name']);
  assert.deepStrictEqual(validateBookingInput({ ...VALID_BODY, last_name: 'x'.repeat(101) }), ['last_name']);
  assert.deepStrictEqual(validateBookingInput({ ...VALID_BODY, country: 42 }), ['country']);
  assert.deepStrictEqual(validateBookingInput({ ...VALID_BODY, first_name: 'x'.repeat(100) }), []);
});

test('validateBookingInput: room_type mangler eller er tom (eksistens tjekkes i service)', () => {
  assert.deepStrictEqual(validateBookingInput({ ...VALID_BODY, room_type: '' }), ['room_type']);
  assert.deepStrictEqual(validateBookingInput({ ...VALID_BODY, room_type: 'Penthouse' }), []);
});

test('validateBookingInput: season, total_price og is_historical i input ignoreres', () => {
  const body = { ...VALID_BODY, season: 'banana', total_price: -5, is_historical: true };
  assert.deepStrictEqual(validateBookingInput(body), []);
});
