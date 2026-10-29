// Unit-tests af barens rene beregninger (princip XII). Kører uden database: npm test
const test = require('node:test');
const assert = require('node:assert');
const { withUnitsSold, toOre } = require('../../src/services/barCalculations');

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
