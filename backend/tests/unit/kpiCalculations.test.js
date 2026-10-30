// Unit-tests af nøgletallene: omsætning (FR-016, FR-017), belægning (FR-018) og topdrinks (FR-019).
// Kører uden database: npm test
const test = require('node:test');
const assert = require('node:assert');
const {
  CAPACITY,
  SEASONS,
  totalRevenue,
  revenueBy,
  revenueByRoomTypeSeason,
  occupancyForDate,
  occupancyPerNight,
  topDrinks,
} = require('../../src/services/kpiCalculations');

// Samme form som rækkerne fra bookingRepository.findRevenueRows()
const REVENUE_ROWS = [
  { country: 'Denmark', room_type: 'Suite', season: 'high', total_price: 3500 },
  { country: 'Sweden', room_type: 'Standard Single', season: 'low', total_price: 900 },
  { country: 'Denmark', room_type: 'Standard Single', season: 'high', total_price: 3600 },
  { country: 'Norway', room_type: 'Suite', season: 'mid', total_price: 6000 },
];

// --- totalRevenue (FR-016) ---

test('totalRevenue: summen af total_price og antal bookinger', () => {
  assert.deepStrictEqual(totalRevenue(REVENUE_ROWS), { total_revenue: 14000, booking_count: 4 });
});

test('totalRevenue: tom liste → 0', () => {
  assert.deepStrictEqual(totalRevenue([]), { total_revenue: 0, booking_count: 0 });
});

// --- revenueBy (FR-017) ---

test('revenueBy: grupperet pr. land, sorteret faldende efter omsætning', () => {
  assert.deepStrictEqual(revenueBy(REVENUE_ROWS, 'country'), [
    { key: 'Denmark', revenue: 7100, booking_count: 2 },
    { key: 'Norway', revenue: 6000, booking_count: 1 },
    { key: 'Sweden', revenue: 900, booking_count: 1 },
  ]);
});

test('revenueBy: summen af hver fordeling er lig totalen', () => {
  const { total_revenue } = totalRevenue(REVENUE_ROWS);
  for (const key of ['country', 'room_type', 'season']) {
    const sum = revenueBy(REVENUE_ROWS, key).reduce((acc, group) => acc + group.revenue, 0);
    assert.strictEqual(sum, total_revenue, key);
  }
});

test('revenueBy: ens omsætning sorteres efter navn, så rækkefølgen er stabil', () => {
  const rows = [
    { season: 'mid', total_price: 100 },
    { season: 'high', total_price: 100 },
  ];
  assert.deepStrictEqual(revenueBy(rows, 'season').map((group) => group.key), ['high', 'mid']);
});

test('revenueBy: tom liste → []', () => {
  assert.deepStrictEqual(revenueBy([], 'country'), []);
});

// --- revenueByRoomTypeSeason (FR-017, US2 scenarie 7) ---

// Samme rækkefølge som roomTypeRepository.findAll() (ORDER BY id)
const ROOM_TYPE_NAMES = [
  'Standard Single', 'Grand Lit', 'Standard Double', 'Superior Double',
  'Junior Suite', 'Spa Executive', 'Suite', 'LOFT Suite',
];

test('SEASONS: low, mid, high', () => {
  assert.deepStrictEqual(SEASONS, ['low', 'mid', 'high']);
});

test('revenueByRoomTypeSeason: altid 24 rækker, også 0 for kombinationer uden bookinger', () => {
  const result = revenueByRoomTypeSeason(REVENUE_ROWS, ROOM_TYPE_NAMES);
  assert.strictEqual(result.length, 24);
  assert.deepStrictEqual(result[0], {
    room_type: 'Standard Single', season: 'low', revenue: 900, booking_count: 1,
  });
  assert.deepStrictEqual(result[1], {
    room_type: 'Standard Single', season: 'mid', revenue: 0, booking_count: 0,
  });
  const suiteHigh = result.find((row) => row.room_type === 'Suite' && row.season === 'high');
  assert.deepStrictEqual(suiteHigh, { room_type: 'Suite', season: 'high', revenue: 3500, booking_count: 1 });
});

test('revenueByRoomTypeSeason: sorteret efter værelsestype og derefter low, mid, high', () => {
  const result = revenueByRoomTypeSeason(REVENUE_ROWS, ROOM_TYPE_NAMES);
  assert.deepStrictEqual(result.slice(0, 6).map((row) => `${row.room_type}/${row.season}`), [
    'Standard Single/low', 'Standard Single/mid', 'Standard Single/high',
    'Grand Lit/low', 'Grand Lit/mid', 'Grand Lit/high',
  ]);
  assert.strictEqual(result[23].room_type, 'LOFT Suite');
  assert.strictEqual(result[23].season, 'high');
});

test('revenueByRoomTypeSeason: summen er lig totalen', () => {
  const sum = revenueByRoomTypeSeason(REVENUE_ROWS, ROOM_TYPE_NAMES)
    .reduce((acc, row) => acc + row.revenue, 0);
  assert.strictEqual(sum, totalRevenue(REVENUE_ROWS).total_revenue);
});

test('revenueByRoomTypeSeason: ingen bookinger → 24 rækker med 0', () => {
  const result = revenueByRoomTypeSeason([], ROOM_TYPE_NAMES);
  assert.strictEqual(result.length, 24);
  assert.ok(result.every((row) => row.revenue === 0 && row.booking_count === 0));
});

// --- occupancyForDate (FR-018) ---

test('occupancyForDate: ankomst 6/12 + 3 nætter tæller 6., 7. og 8./12., ikke 9./12.', () => {
  const stays = [{ arrival_date: '2026-12-06', nights: 3 }];
  assert.strictEqual(occupancyForDate(stays, '2026-12-05').booked_rooms, 0);
  assert.strictEqual(occupancyForDate(stays, '2026-12-06').booked_rooms, 1);
  assert.strictEqual(occupancyForDate(stays, '2026-12-07').booked_rooms, 1);
  assert.strictEqual(occupancyForDate(stays, '2026-12-08').booked_rooms, 1);
  assert.strictEqual(occupancyForDate(stays, '2026-12-09').booked_rooms, 0);
});

test('occupancyForDate: månedsskifte 30/11 + 3 nætter dækker 30/11, 1/12 og 2/12', () => {
  const stays = [{ arrival_date: '2026-11-30', nights: 3 }];
  assert.strictEqual(occupancyForDate(stays, '2026-11-30').booked_rooms, 1);
  assert.strictEqual(occupancyForDate(stays, '2026-12-01').booked_rooms, 1);
  assert.strictEqual(occupancyForDate(stays, '2026-12-02').booked_rooms, 1);
  assert.strictEqual(occupancyForDate(stays, '2026-12-03').booked_rooms, 0);
});

test('occupancyForDate: 1 værelse → 1 / 214 × 100 = 0.5 %, afrundet til 1 decimal', () => {
  const stays = [{ arrival_date: '2026-12-06', nights: 3 }];
  assert.deepStrictEqual(occupancyForDate(stays, '2026-12-07'), {
    date: '2026-12-07',
    booked_rooms: 1,
    capacity: 214,
    occupancy_percent: 0.5,
  });
  assert.strictEqual(CAPACITY, 214);
});

test('occupancyForDate: flere bookinger samme nat lægges sammen', () => {
  const stays = [
    { arrival_date: '2026-12-06', nights: 3 },
    { arrival_date: '2026-12-07', nights: 1 },
    { arrival_date: '2026-12-01', nights: 10 },
  ];
  const result = occupancyForDate(stays, '2026-12-07');
  assert.strictEqual(result.booked_rooms, 3);
  assert.strictEqual(result.occupancy_percent, 1.4);
});

test('occupancyForDate: ingen bookinger → 0 %', () => {
  assert.deepStrictEqual(occupancyForDate([], '2026-12-07'), {
    date: '2026-12-07',
    booked_rooms: 0,
    capacity: 214,
    occupancy_percent: 0,
  });
});

// --- occupancyPerNight (FR-018, FR-021) ---

test('occupancyPerNight: én booking → én række pr. nat', () => {
  const stays = [{ arrival_date: '2026-12-06', nights: 3 }];
  assert.deepStrictEqual(occupancyPerNight(stays), [
    { date: '2026-12-06', booked_rooms: 1, capacity: 214, occupancy_percent: 0.5 },
    { date: '2026-12-07', booked_rooms: 1, capacity: 214, occupancy_percent: 0.5 },
    { date: '2026-12-08', booked_rooms: 1, capacity: 214, occupancy_percent: 0.5 },
  ]);
});

test('occupancyPerNight: alle nætter fra tidligste til seneste, også tomme nætter imellem', () => {
  const stays = [
    { arrival_date: '2026-12-10', nights: 1 },
    { arrival_date: '2026-11-30', nights: 2 },
  ];
  const nights = occupancyPerNight(stays);
  assert.deepStrictEqual(nights.map((night) => night.date), [
    '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05',
    '2026-12-06', '2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10',
  ]);
  assert.deepStrictEqual(nights.map((night) => night.booked_rooms), [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
});

test('occupancyPerNight: ingen bookinger med ankomstdato → []', () => {
  assert.deepStrictEqual(occupancyPerNight([]), []);
});

// --- topDrinks (FR-019) ---

// Samme form som rækkerne efter barCalculations.withUnitsSold()
const DRINK_ROWS = [
  { id: 21, name: 'Espresso', category: 'Coffee', units_sold: 14656 },
  { id: 22, name: 'Americano', category: 'Coffee', units_sold: 9000 },
  { id: 5, name: 'Whiskey Sour', category: 'Cocktail', units_sold: 3824 },
  { id: 1, name: 'Mojito', category: 'Cocktail', units_sold: 3000 },
];

test('topDrinks: fladt array med én topdrink pr. kategori', () => {
  assert.deepStrictEqual(topDrinks(DRINK_ROWS), [
    { category: 'Cocktail', drink_id: 5, name: 'Whiskey Sour', units_sold: 3824 },
    { category: 'Coffee', drink_id: 21, name: 'Espresso', units_sold: 14656 },
  ]);
});

test('topDrinks: alle drinks kommer med ved uafgjort', () => {
  const rows = [...DRINK_ROWS, { id: 2, name: 'Negroni', category: 'Cocktail', units_sold: 3824 }];
  assert.deepStrictEqual(
    topDrinks(rows).filter((row) => row.category === 'Cocktail').map((row) => row.name),
    ['Negroni', 'Whiskey Sour'],
  );
});

test('topDrinks: tom liste → []', () => {
  assert.deepStrictEqual(topDrinks([]), []);
});
