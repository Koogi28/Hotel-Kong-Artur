// Unit-tests af barens rene beregninger (princip XII). Kører uden database: npm test
const test = require('node:test');
const assert = require('node:assert');
const {
  withUnitsSold,
  toOre,
  revenueByDrink,
  barTotal,
  categorySplit,
  validateSaleInput,
} = require('../../src/services/barCalculations');

// Samme form som rækkerne efter withUnitsSold(): price er DECIMAL-streng fra MySQL.
const DRINKS = [
  {
    id: 1, name: 'Mojito', category: 'Cocktail', price: '100.00',
    historical_units_sold: 10, registered_units: 0, units_sold: 10,
  },
  {
    id: 2, name: 'Negroni', category: 'Cocktail', price: '50.00',
    historical_units_sold: 0, registered_units: 0, units_sold: 0,
  },
  {
    id: 21, name: 'Espresso', category: 'Coffee', price: '69.10',
    historical_units_sold: 0, registered_units: 2, units_sold: 2,
  },
];

test('withUnitsSold: units_sold = historiske + registrerede enheder', () => {
  const rows = [{ id: 1, name: 'Espresso', historical_units_sold: 14650, registered_units: 6 }];
  const [drink] = withUnitsSold(rows);
  assert.strictEqual(drink.units_sold, 14656);
  assert.strictEqual(drink.name, 'Espresso');
});

test('withUnitsSold: registered_units som streng fra MySQL (SUM giver DECIMAL)', () => {
  const rows = [{ id: 1, historical_units_sold: 100, registered_units: '2' }];
  const [drink] = withUnitsSold(rows);
  assert.strictEqual(drink.registered_units, 2);
  assert.strictEqual(drink.units_sold, 102);
});

test('withUnitsSold: drink uden registrerede salg', () => {
  const rows = [{ id: 1, historical_units_sold: 50, registered_units: 0 }];
  assert.strictEqual(withUnitsSold(rows)[0].units_sold, 50);
});

test('withUnitsSold: tom liste giver tom liste', () => {
  assert.deepStrictEqual(withUnitsSold([]), []);
});

test('toOre: DECIMAL-streng og tal omregnes til hele øre', () => {
  assert.strictEqual(toOre('91.40'), 9140);
  assert.strictEqual(toOre('69.10'), 6910);
  assert.strictEqual(toOre(0.1 + 0.2), 30);
});

// --- revenueByDrink (FR-025) ---

test('revenueByDrink: alle drinks med, også dem uden salg', () => {
  const result = revenueByDrink(DRINKS);
  assert.strictEqual(result.length, 3);
  assert.deepStrictEqual(result[1], {
    drink_id: 2, name: 'Negroni', category: 'Cocktail', price: 50,
    historical_units: 0, registered_units: 0, units_sold: 0, revenue: 0,
  });
});

test('revenueByDrink: omsætning = enheder × pris regnet i øre (69.10 × 2 = 138.20)', () => {
  const espresso = revenueByDrink(DRINKS)[2];
  assert.deepStrictEqual(espresso, {
    drink_id: 21, name: 'Espresso', category: 'Coffee', price: 69.1,
    historical_units: 0, registered_units: 2, units_sold: 2, revenue: 138.2,
  });
});

test('revenueByDrink: price og revenue er tal, ikke strenge (Tableau)', () => {
  for (const row of revenueByDrink(DRINKS)) {
    assert.strictEqual(typeof row.price, 'number');
    assert.strictEqual(typeof row.revenue, 'number');
  }
});

// --- barTotal (FR-024) ---

test('barTotal: samlede enheder og omsætning', () => {
  assert.deepStrictEqual(barTotal(DRINKS), { units_sold: 12, revenue: 1138.2 });
});

test('barTotal: summeres i øre, så der ikke opstår flydende-tal-fejl', () => {
  const rows = [
    { id: 1, category: 'Coffee', price: '0.10', units_sold: 1 },
    { id: 2, category: 'Coffee', price: '0.20', units_sold: 1 },
  ];
  assert.strictEqual(barTotal(rows).revenue, 0.3);
});

test('barTotal: tom liste → 0', () => {
  assert.deepStrictEqual(barTotal([]), { units_sold: 0, revenue: 0 });
});

// --- categorySplit (FR-026) ---

test('categorySplit: fladt array med Cocktail og Coffee, procent af omsætningen', () => {
  assert.deepStrictEqual(categorySplit(DRINKS), [
    { category: 'Cocktail', units_sold: 10, revenue: 1000, percent: 87.86 },
    { category: 'Coffee', units_sold: 2, revenue: 138.2, percent: 12.14 },
  ]);
});

test('categorySplit: Coffee = 100 − Cocktail, så summen altid er præcis 100', () => {
  const rows = [
    { id: 1, category: 'Cocktail', price: '1.00', units_sold: 1 },
    { id: 2, category: 'Coffee', price: '2.00', units_sold: 1 },
  ];
  const [cocktail, coffee] = categorySplit(rows);
  assert.strictEqual(cocktail.percent, 33.33);
  assert.strictEqual(coffee.percent, 66.67);
  assert.strictEqual(cocktail.percent + coffee.percent, 100);
});

test('categorySplit: uden salg er begge 0', () => {
  const rows = DRINKS.map((row) => ({ ...row, units_sold: 0 }));
  assert.deepStrictEqual(categorySplit(rows).map((row) => row.percent), [0, 0]);
  assert.deepStrictEqual(categorySplit([]).map((row) => row.category), ['Cocktail', 'Coffee']);
});

// --- validateSaleInput (FR-022, research R9) ---

test('validateSaleInput: gyldigt input giver ingen fejlfelter', () => {
  assert.deepStrictEqual(validateSaleInput({ drink_id: 21, quantity: 2 }), []);
  assert.deepStrictEqual(validateSaleInput({ drink_id: 1, quantity: 1000 }), []);
});

test('validateSaleInput: tom body → begge felter på én gang', () => {
  assert.deepStrictEqual(validateSaleInput({}).sort(), ['drink_id', 'quantity']);
  assert.deepStrictEqual(validateSaleInput(null).sort(), ['drink_id', 'quantity']);
});

test('validateSaleInput: quantity skal være et heltal 1–1000', () => {
  for (const quantity of [0, -1, 1.5, 1001, '2', null]) {
    assert.deepStrictEqual(validateSaleInput({ drink_id: 21, quantity }), ['quantity'], `quantity=${quantity}`);
  }
});

test('validateSaleInput: drink_id skal være et positivt heltal', () => {
  for (const drinkId of [0, -1, 1.5, '21', null]) {
    assert.deepStrictEqual(validateSaleInput({ drink_id: drinkId, quantity: 2 }), ['drink_id'], `drink_id=${drinkId}`);
  }
});
